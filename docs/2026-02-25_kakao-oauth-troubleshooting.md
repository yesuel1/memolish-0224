# Kakao OAuth 로그인 트러블슈팅

**Memolish 프로젝트 · 2026-02-25 · NextAuth.js v5 + Kakao Provider**

---

## 한눈에 보는 원인과 해결

| # | 증상 | 실제 원인 | 해결 |
|---|------|-----------|------|
| 1 | KOE101 앱 관리자 설정 오류 | `.env.local`의 `AUTH_KAKAO_CLIENT_ID` 값이 비어있음 | `.env.local`에 REST API 키 직접 입력 |
| 2 | KOE101 반복 | 카카오 콘솔 동의항목 미설정 (닉네임 없음) | 카카오 콘솔 → 동의항목 → 닉네임 필수동의 ON |
| 3 | KOE101 반복 | Redirect URI를 잘못된 위치(로그아웃 URI)에 등록 | 카카오 로그인 → 일반 탭에서 Redirect URI 등록 |
| 4 | `clientSecret must be a string` | `.env.local`의 `AUTH_KAKAO_CLIENT_SECRET` 값이 비어있음 | `.env.local`에 Client Secret 값 입력 |
| 5 | 메모 불러오기 실패 | 백엔드 미실행 + PostgreSQL 미설치 | DATABASE_URL을 SQLite로 변경 후 uvicorn 실행 |
| 6 | npm install 피어 의존성 오류 | next-auth@beta가 eslint v10 요구, 프로젝트는 v8 | `--legacy-peer-deps`로 설치 후 eslint 업그레이드 |
| 7 | Hydration mismatch 경고 | 브라우저 확장 프로그램이 DOM 수정 | `suppressHydrationWarning`을 body에 추가 |

---

## 핵심 실수 1 — .env 파일 혼동 (가장 많은 시간을 낭비한 원인)

### 증상
키를 분명히 입력했는데 KOE101이 계속 발생

### 원인
`backend/.env` 파일에 키를 입력했지만, Next.js가 읽는 파일은 `frontend/.env.local`이다.
두 파일이 완전히 다른 파일이며, 이름도 다르다.

### 해결
Next.js 환경변수는 반드시 `frontend/.env.local`에 작성해야 한다.

### 올바른 파일 구조

```
memolish_260223/
├── backend/
│   └── .env          ← FastAPI 서버 전용 (DB URL, Gemini API Key 등)
└── frontend/
    └── .env.local     ← Next.js 전용 (AUTH_SECRET, AUTH_KAKAO_* 등)
```

### frontend/.env.local 최종 내용

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXTAUTH_URL=http://localhost:3000

# NextAuth
AUTH_SECRET=<npx auth secret으로 생성한 값>

# Kakao OAuth
AUTH_KAKAO_CLIENT_ID=<카카오 REST API 키>
AUTH_KAKAO_CLIENT_SECRET=<카카오 Client Secret>
```

---

## 핵심 실수 2 — 카카오 콘솔 설정 위치 혼동

### 증상
Redirect URI를 등록했는데 KOE101이 계속 발생

### 원인
카카오 콘솔 UI가 개편되어 Redirect URI 등록 위치가 바뀌었다.
"로그아웃 Redirect URI" 칸에 잘못 입력했다.

### 올바른 위치
카카오 디벨로퍼 → 내 애플리케이션 → **카카오 로그인** 메뉴 → **일반** 탭 → Redirect URI

### 카카오 콘솔 체크리스트

- [x] 카카오 로그인 활성화: **ON**
- [x] Redirect URI 등록: `http://localhost:3000/api/auth/callback/kakao`
- [ ] ⚠️ 로그아웃 Redirect URI와 혼동 금지 (다른 칸)
- [x] 동의항목 → 닉네임: **필수동의**
- [x] 보안 → Client Secret: 값 복사 후 `.env.local`에 입력

---

## 디버깅 타임라인

1. `npm install next-auth@beta` → peer deps 충돌 → `--legacy-peer-deps` 사용
2. `npx auth secret` → better-auth 패키지가 실행됨 → AUTH_SECRET 수동 생성
3. 카카오 로그인 버튼 클릭 → KOE101 발생
4. 카카오 콘솔 확인: 활성화 ON, 동의항목 미설정 → 닉네임 필수동의 추가
5. Redirect URI를 로그아웃 칸에 잘못 등록 → 올바른 위치(일반 탭)에 재등록
6. `.env.local` 파일 확인 → `AUTH_KAKAO_CLIENT_ID`, `AUTH_KAKAO_CLIENT_SECRET` 모두 빈 값 발견
7. ✅ `.env.local`에 정확한 값 입력 + `NEXTAUTH_URL` 추가 → **로그인 성공**
8. 로그인 성공 후 메모 불러오기 실패 → 백엔드 미실행
9. ✅ `backend/.env`의 `DATABASE_URL`을 SQLite로 변경 → uvicorn 실행 → **메모 정상 로드**

---

## 백엔드 실수 — PostgreSQL vs SQLite

### 원인
`backend/.env`에 `DATABASE_URL=postgresql://...`이 설정되어 있었으나
로컬에 PostgreSQL이 설치되지 않아 백엔드 시작 자체가 불가능했다.

### 해결
로컬 개발 시 SQLite 사용. `config.py`의 기본값이 이미 SQLite이므로
`.env`의 `DATABASE_URL`을 SQLite URL로 변경하면 된다.

```env
# backend/.env
DATABASE_URL=sqlite:///./memolish.db          # 로컬 개발용
# DATABASE_URL=postgresql+psycopg://user:pass@host:5432/memolish_db  # 프로덕션
```

---

## 다음 OAuth 연동 시 체크리스트

- [ ] Next.js 환경변수는 `frontend/.env.local`에 작성
- [ ] 백엔드 환경변수는 `backend/.env`에 작성 (완전히 별개 파일)
- [ ] 카카오 콘솔에서 Redirect URI는 "카카오 로그인 → 일반 탭"에 등록
- [ ] 동의항목(닉네임 등) 최소 1개 이상 필수동의 설정
- [ ] Client Secret 활성화 후 값을 `.env.local`에 복사
- [ ] `NEXTAUTH_URL` 환경변수 반드시 포함
- [ ] 로컬 개발 DB는 SQLite, 프로덕션은 PostgreSQL(Neon 등)
- [ ] 백엔드와 프론트엔드를 각각 별도 터미널에서 실행

---

*Memolish 프로젝트 트러블슈팅 기록 · 2026-02-25*
