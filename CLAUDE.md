# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Memolish** — a hybrid web service that converts personal daily memos and to-dos into personalized English learning dialogue scripts with voice playback.

**Status:** MVP 스캐폴딩 완료. `backend/` (FastAPI) + `frontend/` (Next.js 14) 기본 구조 구축됨.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 14 (App Router, Tailwind CSS, Zustand) |
| Backend | Python FastAPI + SQLAlchemy + Supabase (PostgreSQL hosted) |
| AI | Google Gemini 1.5 Flash (`response_mime_type: application/json`) |
| TTS | Google Cloud TTS (Journey 보이스, A=여/B=남) |
| Storage | AWS S3 + presigned URL (15분 다운로드 / 1시간 스트리밍) |
| Auth | NextAuth.js v5 — Google + Kakao OAuth (JWT 세션) |

## Core Architecture: Two-Track System

**Track 1 — Productivity Mode** (primary UI):
- Memo input: text, image, YouTube/web URL
- Auto-assigns date range (start: today, end: tomorrow)
- Kanban or list view with states: `Not Started → In Progress → Completed → Keep Reviewing`

**Track 2 — Learning Mode** (AI transformation):
- **Manual trigger only** — AI runs only when user clicks `[✨ 영어로 변환하기]`; never auto-runs (API cost protection)
- Produces: Korean + English summary of the original memo, then an A/B role-play dialogue script
- TTS converts the dialogue → downloadable audio (stored on S3)

## Business Model Constraints (build these in from the start)

- Credit system required at MVP: 3 AI conversions/day per free user, reset at midnight
- After credits exhausted: rewarded video ad (15–30 sec) unlocks one conversion
- Premium tier: unlimited conversions + voice downloads

## Development Conventions

Inherited from workspace `CLAUDE.md` (`C:\01_dev\CLAUDE.md`):
- Korean docstrings and comments
- `pathlib.Path` for all paths, explicit `encoding='utf-8'` on file I/O
- Module-level `logger = logging.getLogger(__name__)` in every Python file
- Config via `.env` / `python-dotenv`; provide `.env.example`
- pip SSL workaround: `--trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org`
- Windows UTF-8: wrap `sys.stdout/stderr` with `io.TextIOWrapper(encoding='utf-8')` in `__main__`

## Project Structure

```
memolish_260223/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 앱 진입점
│   │   ├── config.py            # pydantic-settings 환경변수
│   │   ├── database.py          # SQLAlchemy 세션/Base
│   │   ├── models/              # Memo, User ORM 모델
│   │   ├── schemas/             # Pydantic 요청/응답 스키마
│   │   ├── routers/             # memos.py / ai.py / audio.py
│   │   └── services/            # gemini / tts / s3 / url_parser
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js App Router
│   │   ├── components/          # MemoCard, LearningModal, MemoInputPanel 등
│   │   ├── store/memoStore.ts   # Zustand 전역 상태
│   │   ├── lib/api.ts           # Axios API 클라이언트
│   │   └── types/memo.ts        # TypeScript 공유 타입
│   └── package.json
├── prompts/
│   └── gemini_system_prompt.md  # Gemini 시스템 프롬프트 (설계 근거 포함)
└── docs/
    ├── wireframes.md            # ASCII 와이어프레임 + 컴포넌트 명세
    └── integration_guide.md     # 전체 연결 구조 + 로컬 실행 가이드
```

## Commands

```bash
# ── 백엔드 ──────────────────────────────────────────────────────
cd backend
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # Supabase DATABASE_URL 등 실제 값 입력
# Supabase: https://supabase.com → 프로젝트 생성 → Settings → Database → URI 복사
# DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
uvicorn app.main:app --reload --port 8000
# API 문서: http://localhost:8000/docs

# ── 프론트엔드 ─────────────────────────────────────────────────
cd frontend
npm install
cp .env.local.example .env.local
# AUTH_SECRET, Google/Kakao OAuth 키 입력 필요
# AUTH_SECRET 생성: openssl rand -base64 32
npm run dev
# 앱: http://localhost:3000
```
