import logging
import enum
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, Boolean
from sqlalchemy.sql import func
from app.database import Base

logger = logging.getLogger(__name__)


class MemoStatus(str, enum.Enum):
    NOT_STARTED = "not_started"      # 진행 전
    IN_PROGRESS = "in_progress"      # 진행 중
    COMPLETED = "completed"          # 완료
    KEEP_REVIEWING = "keep_reviewing"  # 계속 참조


class Memo(Base):
    """메모 모델 — 사용자의 일상 메모 및 할 일"""
    __tablename__ = "memos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(64), nullable=False, index=True)  # 브라우저 세션 UUID (MVP)
    content = Column(Text, nullable=False)                     # 원본 메모 내용
    source_url = Column(String(2048), nullable=True)           # 첨부 URL (선택)
    url_title = Column(String(512), nullable=True)             # 파싱된 링크 제목
    url_description = Column(Text, nullable=True)              # 파싱된 링크 설명

    status = Column(Enum(MemoStatus), default=MemoStatus.NOT_STARTED, nullable=False)
    start_date = Column(DateTime(timezone=True), server_default=func.now())
    end_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # AI 변환 결과 — [✨ 영어로 변환하기] 버튼 클릭 시에만 채워짐 (수동 원칙)
    is_transformed = Column(Boolean, default=False)
    ai_summary_ko = Column(Text, nullable=True)        # 한국어 요약
    ai_summary_en = Column(Text, nullable=True)        # 영어 요약
    ai_dialogue_json = Column(Text, nullable=True)     # A-B 대화문 JSON 문자열

    # 오디오
    audio_s3_key = Column(String(512), nullable=True)  # S3 저장 경로
