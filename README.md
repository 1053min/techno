# 러닝 앱 MVP - 실시간 신호 기반 무정지 러닝

신호에 걸리지 않는 러닝 경로를 제공하는 웹 애플리케이션

## 🏗️ 아키텍처

```
Frontend (Figma AI)
    ↓
Vercel Backend API
    ↓
External APIs (Naver Maps, Seoul Traffic)
```

### Frontend
- **Figma AI**: UI 렌더링, 인터랙션, 상태 관리
- **React + TypeScript + Tailwind CSS**

### Backend (Vercel)
- **API Endpoints**:
  - `/api/map` - 네이버 지도 API 프록시
  - `/api/sign` - 서울 교통 신호 API 프록시

## 🚀 주요 기능

1. **실시간 신호 지도** - 주변 교차로의 신호 상태 표시
2. **무정지 경로 추천** - 신호 대기 최소화 러닝 코스
3. **GPS 실시간 추적** - 이동 경로 실시간 표시
4. **감정 기반 기록** - 타인 비교 없는 자기성찰 중심
5. **주간 통계** - 개인 성장 그래프

## 📡 API 엔드포인트

### 1. 네이버 지도 API (`/api/map`)

**Geocoding (주소 → 좌표)**
```
GET /api/map?action=geocode&query=서울특별시 중구 세종대로 110
```

**Reverse Geocoding (좌표 → 주소)**
```
GET /api/map?action=reverse&coords=126.9783882,37.5666103
```

**경로 탐색**
```
GET /api/map?action=direction&start=126.9707,37.5538&goal=127.0276,37.4979
```

### 2. 서울 교통 신호 API (`/api/sign`)

**교차로 신호 정보**
```
GET /api/sign?itsId=1537
```

## 🔐 환경 변수

Vercel 환경 변수 설정 필요:

```bash
NAVER_CLIENT_ID=x21d0t4crl
NAVER_CLIENT_SECRET=your_secret_here
SEOUL_API_KEY=3c14103b-9e09-42d5-95df-859a7aa99c96
```

## 📦 설치 및 실행

```bash
# 의존성 설치
pnpm install

# 개발 서버 (Mock 데이터 사용)
pnpm dev

# 프로덕션 빌드
pnpm build
```

## 🚢 Vercel 배포

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

## 📂 프로젝트 구조

```
/src
  /app
    /components
      - HomePage.tsx          # 홈 화면
      - MapPage.tsx           # 실시간 신호 지도
      - RoutesPage.tsx        # 경로 추천
      - TrackingPage.tsx      # 러닝 트래킹
      - CompletePage.tsx      # 완료 화면
      - HistoryPage.tsx       # 기록 보기
    /services
      - trafficSignalService.ts   # 서울 교통 신호 API
      - naverMapService.ts        # 네이버 지도 API
      - intersectionData.ts       # 교차로 좌표 데이터
    - App.tsx               # 앱 라우팅
  /styles
    - theme.css             # Tailwind 테마

/api
  - map.js                  # 네이버 지도 API 프록시
  - sign.js                 # 서울 교통 신호 API 프록시
```

## 🗺️ 데이터 소스

- **서울 교통 신호 정보**: 서울 열린데이터광장
- **교차로 좌표**: v2xCrossroadMapInformation CSV
- **지도**: 네이버 클라우드 플랫폼 Maps API

## 🎨 디자인 철학

- 타인과의 비교 없이 **자신에게 집중**
- 숫자보다 **감정과 경험** 중심
- **무정지 러닝**으로 몰입감 극대화

## 🛠️ 기술 스택

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Vercel Serverless Functions
- **Maps**: Naver Maps API
- **Charts**: Recharts
- **Icons**: Lucide React
- **Router**: React Router v7

## 📝 라이선스

Private Project
