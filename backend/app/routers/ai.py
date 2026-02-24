import logging
import json
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.memo import Memo
from app.models.user import User
from app.schemas.memo import TransformResponse, CreditsResponse
from app.services.gemini_service import transform_memo_with_gemini
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


def get_user_id(x_session_id: str = Header(...)) -> str:
    return x_session_id


def get_or_create_user(session_id: str, db: Session) -> User:
    """세션 ID로 유저 조회 — 없으면 신규 생성"""
    user = db.query(User).filter(User.session_id == session_id).first()
    if not user:
        user = User(session_id=session_id, daily_credits=settings.daily_free_credits)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def reset_credits_if_new_day(user: User, db: Session) -> User:
    """날짜가 바뀐 경우 크레딧 자정 리셋"""
    today = date.today()
    if user.credits_reset_date < today:
        user.daily_credits = settings.daily_free_credits
        user.credits_reset_date = today
        db.commit()
        db.refresh(user)
        logger.info("크레딧 리셋: user=%s credits=%s", user.session_id, user.daily_credits)
    return user


@router.post("/transform/{memo_id}", response_model=TransformResponse)
async def transform_memo(
    memo_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
):
    """
    ✨ AI 변환 — 유저가 버튼을 클릭했을 때만 호출 (수동 원칙 준수).
    크레딧 잔액 확인 → Gemini 변환 → 결과 저장 → 크레딧 차감.
    이미 변환된 메모는 캐시된 결과를 반환하여 API 비용 절약.
    """
    memo = db.query(Memo).filter(Memo.id == memo_id, Memo.user_id == user_id).first()
    if not memo:
        raise HTTPException(status_code=404, detail="메모를 찾을 수 없습니다.")

    user = get_or_create_user(user_id, db)
    user = reset_credits_if_new_day(user, db)

    # 이미 변환된 메모 → 캐시 반환 (크레딧 차감 없음)
    if memo.is_transformed and memo.ai_dialogue_json:
        logger.info("AI 변환 캐시 반환: memo_id=%s", memo_id)
        dialogue_data = json.loads(memo.ai_dialogue_json)
        return TransformResponse(
            summary_ko=memo.ai_summary_ko,
            summary_en=memo.ai_summary_en,
            dialogue=dialogue_data,
            credits_remaining=user.daily_credits,
        )

    # 크레딧 확인 (프리미엄은 무제한)
    if not user.is_premium and user.daily_credits <= 0:
        raise HTTPException(
            status_code=402,
            detail={
                "code": "NO_CREDITS",
                "message": "오늘의 AI 변환 크레딧이 소진되었습니다. 광고를 시청하거나 프리미엄으로 업그레이드하세요.",
            },
        )

    # Gemini API 호출
    source_text = memo.content
    if memo.url_description:
        source_text += f"\n\n[링크 요약]\n{memo.url_description}"

    try:
        result = await transform_memo_with_gemini(source_text)
    except Exception as exc:
        logger.error("Gemini API 오류: %s", exc)
        raise HTTPException(status_code=502, detail="AI 변환 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")

    # DB 저장
    memo.ai_summary_ko = result["summary_ko"]
    memo.ai_summary_en = result["summary_en"]
    memo.ai_dialogue_json = json.dumps(result["dialogue"], ensure_ascii=False)
    memo.is_transformed = True

    # 크레딧 차감 (프리미엄 제외)
    if not user.is_premium:
        user.daily_credits -= 1

    db.commit()
    db.refresh(memo)
    db.refresh(user)

    logger.info("AI 변환 완료: memo_id=%s 잔여크레딧=%s", memo_id, user.daily_credits)
    return TransformResponse(
        summary_ko=memo.ai_summary_ko,
        summary_en=memo.ai_summary_en,
        dialogue=result["dialogue"],
        credits_remaining=user.daily_credits,
    )


@router.get("/credits", response_model=CreditsResponse)
async def get_credits(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
):
    """남은 AI 변환 크레딧 조회"""
    user = get_or_create_user(user_id, db)
    user = reset_credits_if_new_day(user, db)
    return CreditsResponse(
        daily_credits=user.daily_credits,
        is_premium=user.is_premium,
        max_daily_credits=settings.daily_free_credits,
    )
