# Memolish MVP 진행 현황

**날짜:** 2026-02-24
**요약:** Phase 1 (스캐폴딩) 완료 · Phase 2 (API 실제 연동) 착수 예정

---

## 📊 전체 진행률

| 단계 | 상태 | 진행률 |
|------|------|--------|
| Phase 1 — 스캐폴딩 | ✅ 완료 | 100% |
| Phase 2 — 실제 API 연동 | ⏳ 미착수 | 0% |
| Phase 3 — UI 완성도 & 테스트 | ⏳ 미착수 | 0% |
| Phase 4 — 배포 & v2 기능 | ⏳ 미착수 | 0% |

---

## 🛠 확정 기술 스택

| 레이어 | 기술 | 상태 | 비고 |
|--------|------|------|------|
| Frontend | Next.js 14 · Tailwind CSS · Zustand | ✅ 구조 완료 | App Router, 모바일 우선 |
| Backend | FastAPI · SQLAlchemy · psycopg2 | ✅ 구조 완료 | CORS 설정, lifespan 훅 |
| DB | PostgreSQL | ⚠️ 미생성 | `createdb memolish_db` 필요 |
| AI | Google Gemini 1.5 Flash | ⚠️ 키 미설정 | 서비스 코드 완성, API 키 필요 |
| TTS | Google Cloud TTS (Journey A/B) | ⚠️ 키 미설정 | 서비스 코드 완성, 자격증명 필요 |
| Storage | AWS S3 + presigned URL | ⚠️ 키 미설정 | 서비스 코드 완성, 버킷 생성 필요 |
| Auth | 브라우저 UUID 세션 헤더 `X-Session-Id` | ✅ 완료 (MVP) | v2에서 JWT 전환 예정 |

---

## 🔀 핵심 데이터 흐름

**Track 1 — 생산성 (메모 CRUD)**
```
사용자 입력 → MemoInputPanel → POST /api/memos → PostgreSQL → MemoBoard 업데이트
```

**Track 2 — 학습 (AI 변환, 수동 트리거만)**
```
[✨ 영어로 변환하기] → POST /api/ai/transform/{id} → 크레딧 확인 → Gemini API → DB 저장(캐시) → LearningModal
```
```
[🔊 오디오 듣기] → POST /api/audio/generate/{id} → Google TTS → S3 업로드 → presigned URL 반환
```

---

## ⚙️ 백엔드 (FastAPI) 완료 현황

### 라우터 · API 엔드포인트

- [x] `GET /health` — 헬스체크
- [x] `POST /api/memos` — 메모 생성 (시작일=오늘, 종료일=내일 자동 할당)
- [x] `GET /api/memos` — 목록 조회 (최신순)
- [x] `GET /api/memos/{id}` — 단건 조회
- [x] `PUT /api/memos/{id}` — 내용 수정
- [x] `DELETE /api/memos/{id}` — 삭제
- [x] `PATCH /api/memos/{id}/status` — 상태 변경 (칸반/탭 전환용)
- [x] `POST /api/memos/{id}/parse-url` — URL 메타데이터 파싱 후 저장
- [x] `POST /api/ai/transform/{id}` — AI 변환 (크레딧 확인 → Gemini → DB 캐시)
- [x] `GET /api/ai/credits` — 크레딧 조회 + 자정 리셋
- [x] `POST /api/audio/generate/{id}` — TTS 생성 → S3 업로드
- [x] `GET /api/audio/download/{id}` — presigned 다운로드 URL

### 모델 · 서비스

- [x] `Memo` ORM — 상태/날짜/AI 결과/S3 키 포함
- [x] `User` ORM — 크레딧/프리미엄/리셋날짜
- [x] `gemini_service.py` — Gemini API (lazy import, response_mime_type: application/json)
- [x] `tts_service.py` — Journey F(A) / Journey D(B) 음성 합성
- [x] `s3_service.py` — 업로드 + presigned URL 생성
- [x] `url_parser_service.py` — 웹/YouTube 메타데이터 파싱
- [x] 크레딧 자정 리셋 로직
- [x] DB 캐시 — 이미 변환된 메모 재변환 방지 (API 비용 절약)
- [x] CORS 미들웨어, Windows UTF-8, 로깅 설정
- [ ] 외부 패키지 `requirements.txt` 미포함 (`google-generativeai` 등 주석 처리)

---

## 🎨 프론트엔드 (Next.js 14) 완료 현황

### 컴포넌트

- [x] `MemoBoard` — 상태 필터 탭(전체/진행전/진행중/완료/참조) + 리스트
- [x] `MemoCard` — 상태 변경 드롭다운 + 삭제 + URL 미리보기 + AI CTA
- [x] `MemoInputPanel` — 바텀 시트 슬라이드 + URL 입력
- [x] `LearningModal` — 원본 메모 → 한/영 요약 → A-B 대화문 → 오디오 플레이어
- [x] `CreditBadge` — 헤더 크레딧 뱃지 (남은횟수/프리미엄 표시)

### 상태 관리 · API

- [x] Zustand 스토어 — 메모 CRUD + AI 변환 + 오디오 + UI 상태
- [x] `api.ts` — Axios 클라이언트 + X-Session-Id 세션 헤더
- [x] `memo.ts` — TypeScript 공유 타입 (Memo, MemoStatus, TransformResult 등)
- [x] 크레딧 소진 UI (광고/프리미엄 플레이스홀더)
- [x] 오디오 스트리밍 + 브라우저 다운로드 트리거

---

## 🚨 발견된 이슈 · 주의사항

### 🔴 [BUG] LearningModal 수동 원칙 위반

**파일:** `frontend/src/components/LearningModal.tsx:30`

```typescript
useEffect(() => {
  transformMemo(memoId);   // ← 모달 열자마자 자동 AI 호출!
}, [memoId]);
```

모달이 열리는 즉시 AI 변환을 자동 호출합니다. 이미 변환된 메모는 DB 캐시를 반환하므로
API 비용이 없지만, **미변환 메모를 모달로 열면 크레딧이 자동 차감**됩니다.
설계 원칙(수동 트리거만)에 위반 → **반드시 수정 필요.**

**수정 방향:**
- 미변환 메모: 모달에 [✨ 영어로 변환하기] 버튼 표시 → 클릭 시 `transformMemo()` 호출
- 이미 변환된 메모: 모달 오픈 시 캐시된 결과를 즉시 로드하여 표시

---

### ⚠️ 외부 패키지 requirements.txt 미포함

`google-generativeai`, `google-cloud-texttospeech`, `boto3`는 주석 처리됨.
실제 연동 전 설치 및 `requirements.txt` 반영 필요:

```bash
pip install google-generativeai google-cloud-texttospeech boto3 yt-dlp \
  --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org
```

---

### ⚠️ PostgreSQL DB 미생성

로컬에서 `createdb memolish_db` 후 `backend/.env`의 `DATABASE_URL` 설정 필요.

---

### ℹ️ 광고/프리미엄은 플레이스홀더

크레딧 소진 시 광고/프리미엄 버튼은 현재 `alert('예정')` 처리. 실제 SDK 연동은 v2.

---

## 🗺 다음 작업 추천 (우선순위 순)

### 🔴 즉시 처리 (환경 셋업)

#### #1 PostgreSQL DB 생성 및 .env 설정

```bash
createdb memolish_db
cp backend/.env.example backend/.env
# .env에 다음 항목 입력:
# DATABASE_URL=postgresql://user:pass@localhost/memolish_db
# GEMINI_API_KEY=...
# GOOGLE_APPLICATION_CREDENTIALS=...
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...
# AWS_S3_BUCKET_NAME=...
```

**태그:** Backend, 환경설정

---

#### #2 외부 패키지 설치 및 requirements.txt 정리

```bash
cd backend
.venv\Scripts\activate
pip install google-generativeai google-cloud-texttospeech boto3 yt-dlp \
  --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org
pip freeze > requirements.txt
```

**태그:** Backend, 의존성

---

#### #3 백엔드 + 프론트엔드 로컬 실행 검증

```bash
# 백엔드
cd backend && uvicorn app.main:app --reload --port 8000
# → http://localhost:8000/health 및 /docs 확인

# 프론트엔드
cd frontend && npm run dev
# → http://localhost:3000 화면 렌더링 확인
```

**태그:** Backend, Frontend, 실행검증

---

### 🟡 중요 버그 수정

#### #4 [BUG FIX] LearningModal 수동 트리거 복원

`frontend/src/components/LearningModal.tsx`에서 `useEffect` 자동 호출 제거.
- 미변환 메모: [✨ 영어로 변환하기] 버튼 → 클릭 시 변환
- 변환 완료 메모: 모달 오픈 시 Zustand 스토어의 캐시 결과 즉시 렌더링

**태그:** Frontend, BUG

---

### 🔵 다음 단계 (API 실제 연동)

#### #5 Gemini API E2E 테스트

실제 API 키 설정 후 `POST /api/ai/transform/{id}` 호출.
응답 JSON 구조 (`summary_ko`, `summary_en`, `dialogue.exchanges`) 검증.
502 에러 핸들링 확인.

**태그:** Backend, AI

---

#### #6 TTS → S3 파이프라인 E2E 테스트

`POST /api/audio/generate/{id}` → Google TTS → MP3 bytes → S3 upload → presigned URL.
프론트에서 `<audio>` 스트리밍 재생 확인.

**태그:** Backend, Frontend, TTS, AWS S3

---

#### #7 URL 파서 고도화 — YouTube oEmbed + OGP

- YouTube URL: `youtube.com/oembed` API로 제목/썸네일 추출
- 일반 URL: OGP 태그 (`og:title`, `og:description`) 파싱
- `yt-dlp`를 활용한 YouTube 자막 추출 (선택, 학습 콘텐츠 강화)

**태그:** Backend

---

#### #8 MemoInputPanel URL 실시간 미리보기

URL 필드 blur 이벤트 → `POST /api/memos/{id}/parse-url` 호출 →
파비콘 + 제목 인라인 미리보기 표시.

**태그:** Frontend

---

### ⚪ v2 계획 (수익화)

#### #9 보상형 광고 SDK 연동 (AdMob / AppLovin)

크레딧 소진 시 광고 버튼에 실제 SDK 연동.
광고 시청 완료 콜백 → 서버에 크레딧 +1 지급 API.

#### #10 프리미엄 결제 (Stripe 또는 인앱결제)

`User.is_premium` 플래그가 DB에 이미 존재. Stripe Checkout 또는 앱스토어 인앱결제 구현.

#### #11 Docker Compose 컨테이너화 및 배포

`docker-compose.yml`으로 FastAPI + PostgreSQL + Next.js 통합 기동.
Railway / Render / AWS ECS 중 하나로 프로덕션 배포.

---

## 📁 현재 파일 구조

```
memolish_260223/
├── backend/
│   ├── app/
│   │   ├── main.py                    ✅ FastAPI 진입점, 라우터 등록
│   │   ├── config.py                  ✅ pydantic-settings 환경변수
│   │   ├── database.py                ✅ SQLAlchemy 세션/Base
│   │   ├── models/
│   │   │   ├── memo.py                ✅ Memo ORM (상태·AI결과·S3키)
│   │   │   └── user.py                ✅ User ORM (크레딧·프리미엄)
│   │   ├── routers/
│   │   │   ├── memos.py               ✅ 메모 CRUD 7개 엔드포인트
│   │   │   ├── ai.py                  ✅ AI 변환 + 크레딧 관리
│   │   │   └── audio.py               ✅ TTS 생성 + 다운로드 URL
│   │   ├── schemas/
│   │   │   └── memo.py                ✅ Pydantic 요청/응답 스키마
│   │   └── services/
│   │       ├── gemini_service.py      ⚠️ 코드 완성, API 키 필요
│   │       ├── tts_service.py         ⚠️ 코드 완성, 자격증명 필요
│   │       ├── s3_service.py          ⚠️ 코드 완성, AWS 키 필요
│   │       └── url_parser_service.py  ✅ 웹/YouTube 기본 파싱
│   ├── requirements.txt               ⚠️ 외부 패키지 주석 처리됨
│   └── .env.example                   ✅
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx             ✅
│   │   │   └── page.tsx               ✅
│   │   ├── components/
│   │   │   ├── MemoBoard.tsx          ✅ 필터 탭 + 리스트
│   │   │   ├── MemoCard.tsx           ✅ 카드 + 상태 변경 + CTA
│   │   │   ├── MemoInputPanel.tsx     ✅ 바텀 시트 입력 폼
│   │   │   ├── LearningModal.tsx      🔴 BUG: 자동 transform 호출
│   │   │   └── CreditBadge.tsx        ✅ 헤더 크레딧 뱃지
│   │   ├── store/memoStore.ts         ✅ Zustand 전역 상태
│   │   ├── lib/api.ts                 ✅ Axios API 클라이언트
│   │   └── types/memo.ts              ✅ TypeScript 공유 타입
│   └── package.json                   ✅
├── prompts/
│   └── gemini_system_prompt.md        ✅ Gemini 시스템 프롬프트
└── docs/
    ├── wireframes.md                  ✅ ASCII 와이어프레임
    ├── integration_guide.md           ✅ 통합 연결 가이드
    ├── 2026-02-24_memolish-mvp-scaffolding.html  ← 이 파일
    └── 2026-02-24_memolish-mvp-scaffolding.md    ← 이 파일
```

---

## 💳 크레딧 시스템 (구현 완료)

| 구분 | 내용 | 상태 |
|------|------|------|
| 무료 사용자 | 하루 3회 AI 변환 | ✅ |
| 자정 리셋 | `credits_reset_date` 비교 후 자동 리셋 | ✅ |
| 캐시 반환 | 이미 변환된 메모는 크레딧 차감 없이 재반환 | ✅ |
| 광고 시청 +1회 | 플레이스홀더 | ⏳ v2 |
| 프리미엄 무제한 | `is_premium` 플래그 DB 존재, 결제 미연동 | ⏳ v2 |

---

*Memolish MVP 진행 현황 문서 · 생성일: 2026-02-24*
*Phase 1 (스캐폴딩) 완료 · Phase 2 (API 실제 연동) 착수 예정*
