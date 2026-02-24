import logging
import json

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.memo import Memo
from app.services.tts_service import generate_tts_audio
from app.services.s3_service import upload_to_s3, get_presigned_url

logger = logging.getLogger(__name__)
router = APIRouter()


def get_user_id(x_session_id: str = Header(...)) -> str:
    return x_session_id


@router.post("/generate/{memo_id}")
async def generate_audio(
    memo_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
):
    """
    TTS 오디오 생성 → S3 업로드.
    이미 생성된 경우 presigned URL만 재발급 (API 비용 절약).
    """
    memo = db.query(Memo).filter(Memo.id == memo_id, Memo.user_id == user_id).first()
    if not memo or not memo.is_transformed:
        raise HTTPException(status_code=404, detail="AI 변환이 완료된 메모가 없습니다. 먼저 변환을 실행하세요.")

    # 기존 오디오가 있으면 presigned URL만 재발급
    if memo.audio_s3_key:
        url = get_presigned_url(memo.audio_s3_key)
        return {"audio_url": url, "cached": True}

    # TTS 변환
    dialogue = json.loads(memo.ai_dialogue_json)
    try:
        audio_bytes = await generate_tts_audio(dialogue["exchanges"])
    except Exception as exc:
        logger.error("TTS 변환 오류: %s", exc)
        raise HTTPException(status_code=502, detail="음성 생성 중 오류가 발생했습니다.")

    # S3 업로드
    s3_key = f"audio/{user_id}/{memo_id}.mp3"
    try:
        upload_to_s3(audio_bytes, s3_key)
    except Exception as exc:
        logger.error("S3 업로드 오류: %s", exc)
        raise HTTPException(status_code=502, detail="오디오 저장 중 오류가 발생했습니다.")

    memo.audio_s3_key = s3_key
    db.commit()

    url = get_presigned_url(s3_key)
    logger.info("오디오 생성 완료: memo_id=%s s3_key=%s", memo_id, s3_key)
    return {"audio_url": url, "cached": False}


@router.get("/download/{memo_id}")
async def get_audio_download_url(
    memo_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
):
    """15분 유효 임시 다운로드 URL 발급"""
    memo = db.query(Memo).filter(Memo.id == memo_id, Memo.user_id == user_id).first()
    if not memo or not memo.audio_s3_key:
        raise HTTPException(status_code=404, detail="다운로드 가능한 오디오 파일이 없습니다.")

    url = get_presigned_url(memo.audio_s3_key, expires_in=900)
    return {"download_url": url, "expires_in_seconds": 900}
