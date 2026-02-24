import logging
from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.memo import Memo, MemoStatus
from app.schemas.memo import MemoCreate, MemoStatusUpdate, MemoResponse, ParseUrlRequest
from app.services import url_parser_service

logger = logging.getLogger(__name__)
router = APIRouter()


def get_user_id(x_session_id: str = Header(...)) -> str:
    """MVP: 헤더 X-Session-Id로 사용자 식별 (추후 JWT 인증으로 교체)"""
    return x_session_id


@router.post("", response_model=MemoResponse, status_code=201)
async def create_memo(
    memo_in: MemoCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
):
    """메모 생성 — 시작일(오늘)/종료일(내일) 자동 할당"""
    now = datetime.now(timezone.utc)
    memo = Memo(
        user_id=user_id,
        content=memo_in.content,
        source_url=memo_in.source_url,
        start_date=now,
        end_date=now + timedelta(days=1),
    )
    db.add(memo)
    db.commit()
    db.refresh(memo)
    logger.info("메모 생성: id=%s user=%s", memo.id, user_id)
    return memo


@router.get("", response_model=List[MemoResponse])
async def list_memos(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
):
    """내 메모 목록 (최신순)"""
    return (
        db.query(Memo)
        .filter(Memo.user_id == user_id)
        .order_by(Memo.created_at.desc())
        .all()
    )


@router.get("/{memo_id}", response_model=MemoResponse)
async def get_memo(
    memo_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
):
    memo = _get_memo_or_404(memo_id, user_id, db)
    return memo


@router.put("/{memo_id}", response_model=MemoResponse)
async def update_memo(
    memo_id: int,
    memo_in: MemoCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
):
    """메모 내용 수정"""
    memo = _get_memo_or_404(memo_id, user_id, db)
    memo.content = memo_in.content
    if memo_in.source_url is not None:
        memo.source_url = memo_in.source_url
    db.commit()
    db.refresh(memo)
    return memo


@router.delete("/{memo_id}", status_code=204)
async def delete_memo(
    memo_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
):
    memo = _get_memo_or_404(memo_id, user_id, db)
    db.delete(memo)
    db.commit()


@router.patch("/{memo_id}/status", response_model=MemoResponse)
async def update_memo_status(
    memo_id: int,
    status_in: MemoStatusUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
):
    """상태 변경 — 칸반 드래그 앤 드롭 / 탭 전환용"""
    memo = _get_memo_or_404(memo_id, user_id, db)
    memo.status = status_in.status
    db.commit()
    db.refresh(memo)
    return memo


@router.post("/{memo_id}/parse-url")
async def parse_url_metadata(
    memo_id: int,
    request: ParseUrlRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
):
    """URL 메타데이터 파싱 후 메모에 저장 (YouTube/일반 웹페이지)"""
    memo = _get_memo_or_404(memo_id, user_id, db)
    metadata = await url_parser_service.parse(request.url)
    memo.source_url = request.url
    memo.url_title = metadata.get("title")
    memo.url_description = metadata.get("description")
    db.commit()
    db.refresh(memo)
    return {"title": memo.url_title, "description": memo.url_description}


# ── 내부 헬퍼 ──────────────────────────────────────────────────

def _get_memo_or_404(memo_id: int, user_id: str, db: Session) -> Memo:
    memo = db.query(Memo).filter(Memo.id == memo_id, Memo.user_id == user_id).first()
    if not memo:
        raise HTTPException(status_code=404, detail="메모를 찾을 수 없습니다.")
    return memo
