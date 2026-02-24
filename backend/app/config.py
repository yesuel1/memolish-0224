import logging
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """환경 변수 기반 설정 (.env 자동 로드)"""

    # DB: 기본값은 SQLite (로컬 개발용). 프로덕션은 postgresql+psycopg://...
    database_url: str = "sqlite:///./memolish.db"

    # 외부 서비스 (실제 연동 시 .env에 설정)
    gemini_api_key: Optional[str] = None
    google_application_credentials: Optional[str] = None
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_s3_bucket_name: Optional[str] = None
    aws_region: str = "ap-northeast-2"

    cors_origins: str = "http://localhost:3000"
    daily_free_credits: int = 3

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]


settings = Settings()
