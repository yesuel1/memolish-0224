import logging
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date
from sqlalchemy.sql import func
from app.database import Base

logger = logging.getLogger(__name__)


class User(Base):
    """유저 모델 — MVP용 세션 기반 경량 구현 (이메일 인증은 v2)"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), unique=True, nullable=False, index=True)  # 브라우저 생성 UUID
    email = Column(String(255), unique=True, nullable=True)                   # 향후 인증용 (선택)
    is_premium = Column(Boolean, default=False)

    daily_credits = Column(Integer, default=3)                                # 남은 일일 크레딧
    credits_reset_date = Column(Date, server_default=func.current_date())     # 마지막 리셋 날짜

    created_at = Column(DateTime(timezone=True), server_default=func.now())
