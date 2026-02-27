# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Memolish** — 일상 메모/할 일을 초개인화 영어 회화 스크립트와 음성으로 변환하는 하이브리드 웹 서비스.

**현재 상태:** MVP 배포 진행 중. 백엔드 + 프론트엔드 모두 Render.com 구조.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 16 (App Router, Tailwind CSS, Zustand) |
| Backend | FastAPI + SQLAlchemy 2.x + Neon PostgreSQL |
| AI | Google Gemini 2.5 Flash (`google-genai` SDK, `response_mime_type: application/json`) |
| TTS | Google Cloud TTS (미구현, 향후 Journey 보이스) |
| Storage | AWS S3 + presigned URL (미구현) |
| Auth | NextAuth.js v5 — 카카오 OAuth 단독 (JWT 세션) |
| Deploy | Frontend: Render.com (Node.js) / Backend: Render.com (Python 3.12) |

## Core Architecture

### 두 트랙 시스템

**Track 1 — Productivity Mode**: 메모 CRUD + 칸반 상태 관리 (`not_started → in_progress → completed → keep_reviewing`)

**Track 2 — Learning Mode**: AI 변환 (수동 트리거 전용)
- `[✨ 영어로 변환하기]` 버튼 클릭 시에만 Gemini 호출 — 자동 호출 절대 금지
- 변환 결과는 `memos.ai_dialogue_json` 에 캐시 → 재클릭 시 API 재호출 없음 (`is_transformed` 플래그)

### 인증 흐름

```
카카오 OAuth → NextAuth.js → token.sub (카카오 고유 ID)
→ session.user.id → Axios interceptor → X-Session-Id 헤더 → FastAPI
→ users.session_id 로 유저 조회/생성
```

`api.ts`의 Axios 인터셉터가 모든 요청에 `X-Session-Id` 헤더를 자동 주입. 백엔드는 `Header(...)` 의존성으로 수신.

### 크레딧 시스템

- 무료: 3회/일, 자정 리셋 (`users.credits_reset_date` 비교)
- 크레딧 소진 시 HTTP 402 + `{"code": "NO_CREDITS"}` 반환
- 프리미엄 (`users.is_premium=True`): 무제한

## Commands

```bash
# ── 백엔드 ──────────────────────────────────────────────────────
cd backend
python -m venv .venv && source .venv/Scripts/activate   # Windows
pip install -r requirements.txt --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org
cp .env.example .env   # DATABASE_URL(Neon), GEMINI_API_KEY 입력
python -m uvicorn app.main:app --reload --port 8000
# API 문서: http://localhost:8000/docs

# ── 프론트엔드 ─────────────────────────────────────────────────
cd frontend
npm install
cp .env.local.example .env.local   # AUTH_SECRET, AUTH_KAKAO_CLIENT_ID/SECRET, NEXT_PUBLIC_API_BASE_URL 입력
npm run dev   # http://localhost:3000

# ── 프로덕션 빌드 확인 ──────────────────────────────────────────
cd frontend
npm run build         # next build → .next/ 출력
npm start             # next start -H 0.0.0.0 -p ${PORT:-3000}
```

## API Endpoints

| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | 헬스체크 |
| POST | `/api/memos` | 메모 생성 (시작일=오늘, 종료일=내일 자동) |
| GET | `/api/memos` | 내 메모 목록 (최신순) |
| PUT | `/api/memos/{id}` | 메모 내용 수정 |
| DELETE | `/api/memos/{id}` | 메모 삭제 |
| PATCH | `/api/memos/{id}/status` | 칸반 상태 변경 |
| POST | `/api/memos/{id}/parse-url` | URL 메타데이터 파싱 → 메모에 저장 |
| POST | `/api/ai/transform/{id}` | ✨ Gemini 변환 (수동 트리거 전용, 크레딧 차감) |
| GET | `/api/ai/credits` | 잔여 크레딧 조회 |
| POST | `/api/audio/generate/{id}` | TTS 오디오 생성 (미구현) |
| GET | `/api/audio/download/{id}` | S3 presigned URL 반환 (미구현) |

모든 엔드포인트는 `X-Session-Id` 헤더 필수.

## Deployment

| 서비스 | 역할 | 설정 파일 |
|--------|------|-----------|
| Render.com | FastAPI 백엔드 | `render.yaml` (루트) |
| Render.com | Next.js 프론트엔드 | `render.yaml` (루트) |
| Neon | PostgreSQL DB | `backend/.env` → `DATABASE_URL` |

**백엔드 Render 설정**: Root Directory=`backend`, Python 3.12 (`backend/.python-version`), Start Command=`uvicorn app.main:app --host 0.0.0.0 --port $PORT`

**프론트엔드 Render 설정**: Root Directory=`frontend`, Node.js, Build Command=`npm install && npm run build`, Start Command=`npm start`

**프론트엔드 환경변수**: `AUTH_SECRET`, `AUTH_KAKAO_CLIENT_ID`, `AUTH_KAKAO_CLIENT_SECRET`, `NEXT_PUBLIC_API_BASE_URL` (백엔드 Render URL), `AUTH_TRUST_HOST=true`

**배포 후 필수**: 백엔드 환경변수 `CORS_ORIGINS`를 프론트엔드 Render URL로 업데이트. 카카오 개발자 콘솔에 `https://{frontend-url}/api/auth/callback/kakao` Redirect URI 추가.

## Key Files

- `backend/app/services/gemini_service.py` — Gemini 호출 (SSL 우회 로직 포함)
- `backend/app/routers/ai.py` — 크레딧 체크 + 캐시 로직
- `backend/app/models/memo.py` — Memo + MemoStatus 모델
- `backend/app/models/user.py` — User 모델 (session_id, daily_credits, is_premium)
- `backend/app/config.py` — Settings (pydantic-settings, `.env` 로드)
- `frontend/src/lib/api.ts` — Axios 클라이언트 + X-Session-Id 인터셉터
- `frontend/src/store/memoStore.ts` — Zustand 전역 상태 (모든 API 액션 포함)
- `frontend/src/types/memo.ts` — TypeScript 타입 (Memo, MemoStatus, AIDialogue 등)
- `frontend/src/auth.ts` — NextAuth.js 설정 (카카오 provider + session callback)
- `frontend/src/app/api/auth/[...nextauth]/route.ts` — NextAuth API 라우트

## Environment Variables

**Backend (`.env`)**:
- `DATABASE_URL` — 로컬: `sqlite:///./memolish.db` / 프로덕션: Neon PostgreSQL URL
- `GEMINI_API_KEY` — Google AI Studio API 키
- `CORS_ORIGINS` — 쉼표 구분 허용 오리진 (예: `http://localhost:3000,https://memolish.pages.dev`)
- `DAILY_FREE_CREDITS` — 일일 무료 크레딧 수 (기본값 `3`)

**Frontend (`.env.local`)**:
- `AUTH_SECRET` — NextAuth.js 세션 서명 시크릿
- `AUTH_KAKAO_CLIENT_ID` / `AUTH_KAKAO_CLIENT_SECRET` — 카카오 개발자 콘솔
- `NEXT_PUBLIC_API_BASE_URL` — 백엔드 URL (기본값 `http://localhost:8000`)

## Known Gotchas

**SSL_CERT_FILE 충돌 (Windows)**: ComfyUI 등 타 프로젝트가 `SSL_CERT_FILE` 전역 환경변수를 설정해두면 google-genai SDK가 초기화 실패. `gemini_service.py` 에서 `setdefault` 대신 `os.environ["SSL_CERT_FILE"] = certifi.where()` 로 강제 덮어써야 함.

**websockets 버전**: `google-genai==1.64.0` 은 `websockets<15.1` 을 요구. `websockets==16.x` 와 충돌하므로 `14.1` 고정.

**DB 분기**: `database.py` 는 `DATABASE_URL.startswith("sqlite")` 로 로컬/프로덕션 분기. 로컬은 SQLite, 프로덕션은 Neon PostgreSQL.

## Development Conventions

- 한국어 docstring/주석
- Python: `logger = logging.getLogger(__name__)` 모든 파일 최상단
- Windows UTF-8: `__main__` 블록에서 `sys.stdout/stderr` 를 `io.TextIOWrapper(encoding='utf-8')` 로 래핑
- 환경변수: `.env` / `python-dotenv`, `.env.example` 유지
