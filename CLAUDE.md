# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Memolish** — 일상 메모/할 일을 초개인화 영어 회화 스크립트와 음성으로 변환하는 하이브리드 웹 서비스.

**현재 상태:** MVP 배포 진행 중. 백엔드 Render.com + 프론트엔드 Cloudflare Pages 구조.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 16 (App Router, Tailwind CSS, Zustand) |
| Backend | FastAPI + SQLAlchemy 2.x + Neon PostgreSQL |
| AI | Google Gemini 2.5 Flash (`google-genai` SDK, `response_mime_type: application/json`) |
| TTS | Google Cloud TTS (미구현, 향후 Journey 보이스) |
| Storage | AWS S3 + presigned URL (미구현) |
| Auth | NextAuth.js v5 — 카카오 OAuth 단독 (JWT 세션) |
| Deploy | Frontend: Cloudflare Pages / Backend: Render.com (Python 3.12) |

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
cp .env.local.example .env.local   # AUTH_SECRET, AUTH_KAKAO_CLIENT_ID/SECRET 입력
npm run dev   # http://localhost:3000

# ── Cloudflare Pages 빌드 (CI에서 자동 실행, 로컬 Windows에서는 동작 안 함) ──
npm run pages:build   # npx @cloudflare/next-on-pages
```

## Deployment

| 서비스 | 역할 | 설정 파일 |
|--------|------|-----------|
| Render.com | FastAPI 백엔드 | `backend/render.yaml` |
| Cloudflare Pages | Next.js 프론트엔드 | `frontend/wrangler.toml` |
| Neon | PostgreSQL DB | `backend/.env` → `DATABASE_URL` |

**Render 설정**: Root Directory=`backend`, Python 3.12 (`backend/.python-version`), Start Command=`uvicorn app.main:app --host 0.0.0.0 --port $PORT`

**Cloudflare Pages 설정**: Root Directory=`frontend`, Build Command=`npx @cloudflare/next-on-pages`, Output=`.vercel/output/static`

**배포 후 필수**: Render 환경변수 `CORS_ORIGINS`를 Cloudflare Pages URL로 업데이트. 카카오 개발자 콘솔에 `https://{pages-url}/api/auth/callback/kakao` Redirect URI 추가.

## Key Files

- `backend/app/services/gemini_service.py` — Gemini 호출 (SSL 우회 로직 포함)
- `backend/app/routers/ai.py` — 크레딧 체크 + 캐시 로직
- `frontend/src/lib/api.ts` — Axios 클라이언트 + X-Session-Id 인터셉터
- `frontend/src/store/memoStore.ts` — Zustand 전역 상태 (모든 API 액션 포함)
- `frontend/src/auth.ts` — NextAuth.js 설정 (카카오 provider + session callback)
- `frontend/src/app/api/auth/[...nextauth]/route.ts` — `export const runtime = 'edge'` 필수 (CF Workers)

## Known Gotchas

**SSL_CERT_FILE 충돌 (Windows)**: ComfyUI 등 타 프로젝트가 `SSL_CERT_FILE` 전역 환경변수를 설정해두면 google-genai SDK가 초기화 실패. `gemini_service.py` 에서 `setdefault` 대신 `os.environ["SSL_CERT_FILE"] = certifi.where()` 로 강제 덮어써야 함.

**websockets 버전**: `google-genai==1.64.0` 은 `websockets<15.1` 을 요구. `websockets==16.x` 와 충돌하므로 `14.1` 고정.

**Cloudflare Pages 로컬 빌드**: `@cloudflare/next-on-pages` 가 내부적으로 `vercel build` 를 실행하는데 Windows에서 불안정. CI (Linux) 에서만 실행.

**DB 분기**: `database.py` 는 `DATABASE_URL.startswith("sqlite")` 로 로컬/프로덕션 분기. 로컬은 SQLite, 프로덕션은 Neon PostgreSQL.

## Development Conventions

- 한국어 docstring/주석
- Python: `logger = logging.getLogger(__name__)` 모든 파일 최상단
- Windows UTF-8: `__main__` 블록에서 `sys.stdout/stderr` 를 `io.TextIOWrapper(encoding='utf-8')` 로 래핑
- 환경변수: `.env` / `python-dotenv`, `.env.example` 유지
