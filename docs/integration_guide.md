# Memolish MVP — 통합 가이드

**목적:** Frontend ↔ Backend ↔ Gemini ↔ TTS ↔ S3 전체 연결 구조 및 로컬 개발 환경 구성

---

## 1. 전체 아키텍처 다이어그램

```
[브라우저 (Next.js)]
        │
        │  X-Session-Id 헤더 (브라우저 생성 UUID)
        │  REST API 요청
        ▼
[FastAPI 서버 :8000]
        │
        ├──[GET/POST /api/memos]────────── PostgreSQL (메모 저장/조회)
        │
        ├──[POST /api/ai/transform/{id}]
        │         │
        │         ├── 크레딧 확인 (users 테이블)
        │         └── Google Gemini API ──→ JSON 결과 → DB 저장
        │
        └──[POST /api/audio/generate/{id}]
                  │
                  ├── Google Cloud TTS ──→ MP3 bytes
                  └── AWS S3 ──→ presigned URL ──→ 브라우저
```

---

## 2. API 엔드포인트 전체 목록

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/health` | 헬스 체크 |
| `POST` | `/api/memos` | 메모 생성 |
| `GET` | `/api/memos` | 메모 목록 |
| `GET` | `/api/memos/{id}` | 메모 상세 |
| `PUT` | `/api/memos/{id}` | 메모 수정 |
| `DELETE` | `/api/memos/{id}` | 메모 삭제 |
| `PATCH` | `/api/memos/{id}/status` | 상태 변경 |
| `POST` | `/api/memos/{id}/parse-url` | URL 메타데이터 파싱 |
| `POST` | `/api/ai/transform/{id}` | ✨ AI 변환 (수동) |
| `GET` | `/api/ai/credits` | 크레딧 조회 |
| `POST` | `/api/audio/generate/{id}` | TTS 생성 + S3 업로드 |
| `GET` | `/api/audio/download/{id}` | 임시 다운로드 URL |

**공통 헤더:** 모든 요청에 `X-Session-Id: <uuid>` 필수

---

## 3. 로컬 개발 환경 구성

### 3-1. 사전 요구사항

- Python 3.12+
- Node.js 20+
- PostgreSQL 16+
- Google AI Studio API 키 (무료 시작 가능)
- Google Cloud TTS 서비스 계정 JSON
- AWS 계정 + S3 버킷 (MVP에서는 로컬 테스트 시 MinIO로 대체 가능)

### 3-2. 백엔드 실행

```bash
cd backend

# 가상환경 생성 (Windows)
python -m venv .venv
.venv\Scripts\activate

# 의존성 설치 (SSL 이슈 시 trusted-host 추가)
pip install -r requirements.txt \
  --trusted-host pypi.org \
  --trusted-host pypi.python.org \
  --trusted-host files.pythonhosted.org

# 환경 변수 설정
cp .env.example .env
# .env 파일을 열어 실제 값 입력

# PostgreSQL DB 생성
createdb memolish_db

# 서버 실행
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API 문서: http://localhost:8000/docs

### 3-3. 프론트엔드 실행

```bash
cd frontend

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.local.example .env.local
# NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# 개발 서버 실행
npm run dev
```

앱: http://localhost:3000

---

## 4. 핵심 데이터 흐름 (시퀀스)

### 4-1. 메모 작성 → 저장

```
유저 입력
  → POST /api/memos { content, source_url }
  → DB INSERT (start_date=now, end_date=now+1day)
  → MemoResponse 반환
  → Zustand memos 배열 prepend
  → MemoCard 렌더
```

### 4-2. AI 변환 (수동 트리거)

```
유저가 [✨ 영어로 변환하기] 클릭
  → useMemoStore.transformMemo(id)
  → POST /api/ai/transform/{id}
      → credits 확인 → 소진 시 402 반환
      → 캐시 여부 확인 → 이미 변환 시 DB 데이터 반환
      → Gemini API 호출 (response_mime_type: application/json)
      → JSON 파싱 → DB 저장
      → credits 차감
  → TransformResponse 반환
  → LearningModal에 learningResult 세팅
  → 대화문 렌더
```

### 4-3. TTS 오디오 생성

```
유저가 [🔊 오디오 듣기] 클릭
  → POST /api/audio/generate/{id}
      → 기존 S3 키 있으면 presigned URL만 재발급
      → Google Cloud TTS로 exchanges 순서대로 변환
      → MP3 바이트 연결 → S3 업로드
      → presigned URL (1시간) 반환
  → <audio src=url> 렌더
```

---

## 5. 환경 변수 체크리스트

| 변수 | 획득 방법 |
|------|-----------|
| `DATABASE_URL` | 로컬 PostgreSQL 또는 Supabase/Neon |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com) → API 키 발급 |
| `GOOGLE_APPLICATION_CREDENTIALS` | Google Cloud Console → 서비스 계정 → JSON 키 다운로드 |
| `AWS_ACCESS_KEY_ID` / `SECRET` | AWS IAM → 사용자 → 액세스 키 |
| `AWS_S3_BUCKET_NAME` | S3 버킷 생성 후 이름 입력 |

---

## 6. MVP → v2 로드맵

| 항목 | MVP | v2 |
|------|-----|----|
| 인증 | 브라우저 세션 UUID | 이메일/소셜 로그인 |
| 광고 | UI만 (미연동) | AdMob/AdSense 실연동 |
| 칸반 뷰 | 리스트만 | DnD 칸반 보드 |
| TTS 무음 처리 | 단순 연결 | pydub으로 교환 무음 삽입 |
| 이미지 입력 | 미구현 | Gemini Vision 연동 |
| 프리미엄 결제 | UI만 | Stripe/토스페이먼츠 |

---

## 7. 크레딧 시스템 동작 검증

테스트용 curl 예시:

```bash
# 크레딧 조회
curl http://localhost:8000/api/ai/credits \
  -H "X-Session-Id: test-user-001"

# AI 변환 (메모 id=1)
curl -X POST http://localhost:8000/api/ai/transform/1 \
  -H "X-Session-Id: test-user-001"

# 크레딧 0 상태 확인 (3회 변환 후)
# → 402 상태코드 + {"code": "NO_CREDITS", ...}
```
