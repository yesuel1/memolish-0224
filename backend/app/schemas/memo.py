import logging
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, HttpUrl
from app.models.memo import MemoStatus

logger = logging.getLogger(__name__)


# ── 요청 스키마 ────────────────────────────────────────────────

class MemoCreate(BaseModel):
    """메모 생성 요청"""
    content: str
    source_url: Optional[str] = None


class MemoStatusUpdate(BaseModel):
    """상태 변경 요청 (칸반 드래그 등)"""
    status: MemoStatus


class ParseUrlRequest(BaseModel):
    """URL 메타데이터 파싱 요청"""
    url: str


# ── 응답 스키마 ────────────────────────────────────────────────

class DialogueExchange(BaseModel):
    """대화문 한 줄"""
    speaker: str   # "A" | "B"
    line: str
    korean: str


class AIDialogue(BaseModel):
    """AI 생성 대화문 전체 구조"""
    title: str
    situation: str
    exchanges: List[DialogueExchange]


class MemoResponse(BaseModel):
    """메모 단건 응답"""
    id: int
    user_id: str
    content: str
    source_url: Optional[str] = None
    url_title: Optional[str] = None
    url_description: Optional[str] = None
    status: MemoStatus
    start_date: datetime
    end_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    is_transformed: bool
    ai_summary_ko: Optional[str] = None
    ai_summary_en: Optional[str] = None
    ai_dialogue_json: Optional[str] = None   # JSON 문자열 그대로 전달
    audio_s3_key: Optional[str] = None

    model_config = {"from_attributes": True}


class TransformResponse(BaseModel):
    """AI 변환 결과 응답"""
    summary_ko: str
    summary_en: str
    dialogue: AIDialogue
    credits_remaining: int


class CreditsResponse(BaseModel):
    """크레딧 현황 응답"""
    daily_credits: int
    is_premium: bool
    max_daily_credits: int
