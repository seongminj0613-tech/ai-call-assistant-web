# 🌐 ai-call-assistant-web (Web Dashboard)

> 소상공인 AI 통화 요약 서비스의 웹 관리자 대시보드 — Next.js 14 정적 export + S3/CloudFront 배포

[🌐 웹 데모](https://dk1k75g0ji3vw.cloudfront.net) 

[📱 APK 다운로드](https://drive.google.com/file/d/1jJNRF2CCVcCKSpdIPUODjWL6F5exxJ-T/view?usp=sharing) 

[모니터링 대시보드](http://15.165.17.218:3000/public-dashboards/97b5462a12b54bf9b827b07eeee699f4)

[📖 메인 README](https://github.com/seongminj0613-tech/business-ai-assistant)

---

## 🎯 역할

본 레포는 [소상공인 AI 통화 요약 서비스](https://github.com/seongminj0613-tech/business-ai-assistant)의 **웹 관리자 대시보드**를 담당합니다.

- 카카오 로그인 + Firebase Custom Token 인증
- 매장 등록/관리
- 통화 카드 대시보드 (검색·필터·분류)
- 통화 상세 + 음성 재생 (HTML5 audio)
- 수동 파일 업로드 (Web 단독 사용 시나리오 지원)

> 안드로이드·백엔드는 별도 레포에서 관리됩니다. [관련 저장소](#-관련-저장소) 참조.

---

## 🛠️ 기술 스택

- **Next.js 14.2** (App Router, Static Export)
- **React 18** + **Tailwind CSS 3.4**
- **Firebase JS SDK** (인증) + **Kakao JS SDK v1** (OAuth)
- **axios 1.15** (HTTP 클라이언트, 인터셉터로 토큰 자동 부착)

### 호스팅
- **AWS S3** (정적 파일 호스팅)
- **AWS CloudFront** (글로벌 CDN + HTTPS)

---

## 🗺️ 페이지 라우트

| 경로 | 역할 |
|------|------|
| `/` | 랜딩 (로그인 여부 확인 후 분기) |
| `/login` | 카카오 로그인 |
| `/dashboard` | 전체 통화 카드 대시보드 |
| `/stores/new` | 가게 생성 |
| `/stores/[id]/calls` | 특정 가게의 통화 목록 + 수동 업로드 |
| `/calls/[callId]` | 통화 상세 + 음성 재생 + 요약 |

---

## 🔐 인증 흐름

카카오 OAuth → Firebase Custom Token 교환 모델을 사용합니다.

```
사용자 → /login 페이지
   │
   ▼
[1] Kakao.Auth.login()  (팝업, scope=profile_nickname)
   │  → kakao_access_token
   ▼
[2] POST /auth/kakao  { kakao_access_token }
   │  → custom_token (백엔드에서 Firebase Admin SDK로 발급)
   ▼
[3] signInWithCustomToken(auth, customToken)
   │  → Firebase 로그인 완료
   ▼
[4] user.getIdToken() → 클라이언트 저장
   │
   ▼
[5] router.push('/dashboard')

이후 axios 인터셉터가 모든 API 요청에 ID Token 자동 부착
```

### axios 인터셉터 동작
- **Request**: Firebase ID Token을 `Authorization` 헤더에 자동 부착
- **Response**: 401 응답 시 토큰 정리 + 로그인 페이지 리다이렉트

---

## 📦 환경변수

`.env.local`에 정의되며, 빌드 시 클라이언트 번들에 인라인됩니다 (`NEXT_PUBLIC_` 접두사).

| 키 | 용도 |
|------|------|
| `NEXT_PUBLIC_API_BASE_URL` | 백엔드 API Gateway 진입점 |
| `NEXT_PUBLIC_KAKAO_JS_KEY` | 카카오 JS SDK 초기화 (공개 키) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API Key (공개 키) |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth 도메인 |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase 프로젝트 ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage 버킷 |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | FCM Sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase 앱 ID |

> 📌 위 키들은 Firebase·카카오 정책상 **클라이언트 공개를 전제로 설계된 공개 키**입니다. 진짜 비밀(Firebase Admin SDK, OpenAI API Key 등)은 백엔드 측 AWS Secrets Manager에만 존재합니다.

---

## 🚀 로컬 개발

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

[http://localhost:3000](http://localhost:3000) 접속.

### 빌드 & 정적 export
```bash
npm run build
```
정적 파일이 `out/` 디렉토리에 생성됩니다.

---

## 🔄 배포 (자동화)

`main` 브랜치에 푸시하면 **GitHub Actions가 자동으로** 빌드 + 배포합니다.

```
git push origin main
   ↓
GitHub Actions 워크플로우 트리거
   ↓
① npm ci → npm run build
② AWS S3 동기화 (캐시 정책 분리)
③ CloudFront 무효화
   ↓
배포 완료 (수 분 내 반영)
```

수동 콘솔 작업 없이 무인 운영됩니다.

---

## 🔌 백엔드 API 호출

본 웹은 백엔드와 직접 통신합니다 (Next.js API Routes 사용 안 함).

전체 API 명세는 [백엔드 레포](https://github.com/seongminj0613-tech/ai-call-assistant) 참조.

주요 호출 패턴:
```javascript
// 통화 목록 조회 (axios 인터셉터가 토큰 자동 부착)
const { data } = await api.get('/calls', {
  params: { store_id, status, limit: 20 }
});

// 음성 재생용 presigned URL 발급
const { data } = await api.get(`/calls/${callId}/audio`);
// → HTML5 audio src로 사용
```

---

## 🎨 데이터 동기화 전략

**Phase 1 (현재)**: 페이지 진입 시 axios로 최신 데이터 1회 로드. 처리 중 통화는 새로고침/재방문 시 갱신.백엔드 Lambda 5분 주기 폴링으로 STT 실패 자동 복구 처리 중

**Phase 2 (계획)**: 웹 클라이언트 실시간 동기화 (WebSocket)

---

## 🔗 관련 저장소

| 저장소 | 설명 |
|--------|------|
| [business-ai-assistant](https://github.com/seongminj0613-tech/business-ai-assistant) | 📖 메인 통합 문서 |
| [ai-call-assistant](https://github.com/seongminj0613-tech/ai-call-assistant) | 🐍 Backend (AWS Lambda) |
| **이 저장소** (`ai-call-assistant-web`) | 🌐 Web (이 레포) |
| [call-recorder-android](https://github.com/seongminj0613-tech/call-recorder-android) | 📱 Android (Kotlin) |
| [lambda-layer](https://github.com/seongminj0613-tech/lambda-layer) | ☁️ Lambda Layer |

---

## 📄 라이선스

부트캠프 학습 프로젝트입니다. 코드 참고·학습 목적의 열람은 자유이나, 본 서비스의 아키텍처·디자인·문서를 무단으로 상업적 목적에 재이용하지 않기를 부탁드립니다.

---

*문서 기준: Tech Spec v2.5 (2026.05.11)*
