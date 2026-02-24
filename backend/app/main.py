import logging
import sys
import io
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import create_tables
from app.routers import memos, ai, audio

# Windows UTF-8 출력 보장
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작 시 DB 테이블 초기화"""
    create_tables()
    logger.info("Memolish API 서버 시작")
    yield
    logger.info("Memolish API 서버 종료")


app = FastAPI(
    title="Memolish API",
    description="일상 메모를 초개인화 영어 학습 콘텐츠로 변환하는 서비스",
    version="0.1.0",
    lifespan=lifespan,
    redirect_slashes=False,  # /api/memos 와 /api/memos/ 모두 동작
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(memos.router, prefix="/api/memos", tags=["memos"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(audio.router, prefix="/api/audio", tags=["audio"])


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "memolish-api"}
