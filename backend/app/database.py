import logging
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session
from app.config import settings

logger = logging.getLogger(__name__)

# SQLite는 check_same_thread=False 필요, PostgreSQL은 pool_pre_ping
is_sqlite = settings.database_url.startswith("sqlite")

connect_args = {"check_same_thread": False} if is_sqlite else {}
engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    pool_pre_ping=not is_sqlite,
)

# SQLite: 외래키 제약 활성화
if is_sqlite:
    @event.listens_for(engine, "connect")
    def _enable_foreign_keys(dbapi_conn, _):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Session:
    """데이터베이스 세션 의존성 주입용 제너레이터"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables() -> None:
    """앱 시작 시 테이블 생성"""
    from app.models import memo, user  # noqa: F401
    Base.metadata.create_all(bind=engine)
    logger.info("DB 테이블 초기화 완료 (%s)", "SQLite" if is_sqlite else "PostgreSQL")
