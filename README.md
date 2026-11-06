# Food POS Platform

Windows 설치형 POS와 웹 관리자, 주방 디스플레이, QR/모바일 주문을 제공하는 다중 매장용 상용 음식점 POS 플랫폼입니다.

## 현재 구현 상태
- [x] 모노레포 기본 구성 (npm workspaces + pnpm workspace 호환 설정)
- [x] React + TypeScript + Vite 기반 관리자 웹 초기 화면
- [x] 공통 주문/결제 도메인 타입 패키지
- [x] Supabase 브라우저 클라이언트 및 이메일/비밀번호 인증 기반
- [ ] 매장별 권한(RLS) 및 실제 데이터 연결
- [ ] 실제 주문/매출 API 및 데이터베이스 마이그레이션
- [ ] Electron Windows POS 및 오프라인 SQLite
- [ ] 주방 디스플레이, 고객 주문 웹

관리자 대시보드의 주문과 매출 숫자는 아직 **화면 확인용 샘플 데이터**입니다. Supabase 인증은 환경 변수가 설정된 경우에만 활성화되며, 실제 주문/매출 테이블과 매장별 RLS 정책은 아직 연결하지 않았습니다.

## 기술 스택
| 영역 | 기술 |
|---|---|
| Desktop POS | Electron, React, TypeScript |
| Admin Web | React, TypeScript, Vite, Tailwind CSS |
| UI / 서버 데이터 | Tailwind CSS, TanStack Query (후속 적용) |
| 로컬 데이터 | SQLite |
| 중앙 데이터 | Supabase PostgreSQL |
| 인증 / 실시간 | Supabase Auth, Realtime |
| 서버 업무 / 파일 | Supabase Edge Functions, Storage |
| 웹 배포 / 보조 API | Cloudflare Pages, Workers |
| 모노레포 | npm workspaces, pnpm workspace 설정, Turborepo |
| 테스트 / 설치 | Vitest, Playwright, electron-builder |

## 저장소 구조
- `apps/admin-web`: 점주/본사 웹 관리자
- `apps/desktop-pos`: Electron 기반 Windows POS (후속 구현)
- `apps/kitchen-display`: 주방 주문 화면 (후속 구현)
- `apps/customer-web`: QR 및 모바일 주문 (후속 구현)
- `packages/shared-types`: 앱 간 공통 도메인 타입
- `packages/business-logic`, `packages/ui-components`: 공통 로직 및 UI (후속 구현)
- `supabase`: DB migrations 및 Edge Functions (후속 구현)
- `docs`: 설계 및 운영 문서

## 로컬 실행
Node.js 22 이상과 npm 10 이상이 필요합니다.

```bash
npm install
npm run dev
```

개발 서버는 기본적으로 `http://localhost:5173`에서 실행됩니다.

## Supabase 인증 설정

1. Supabase Dashboard에서 프로젝트를 준비하고 **Project URL**과 **anon key(또는 publishable key)**를 확인합니다.
2. 저장소 루트의 `.env.example`을 참고해 `apps/admin-web/.env.local` 파일을 만듭니다.
3. 다음 두 값을 실제 프로젝트 값으로 교체합니다.

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
```

4. Supabase Dashboard의 Authentication 설정에서 이메일 로그인을 활성화하고, 로컬 주소(`http://localhost:5173`)와 실제 Cloudflare Pages 도메인을 허용된 Site URL/Redirect URLs에 추가합니다.
5. Supabase Authentication의 Users에 관리자 계정을 등록한 뒤 로그인합니다.
6. Cloudflare Pages의 Settings → Environment variables에 동일한 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 Production/Preview 환경별로 등록하고 재배포합니다.

`VITE_` 환경 변수는 브라우저 번들에 포함됩니다. 따라서 URL과 anon/publishable 키만 사용해야 하며, `service_role` 또는 secret key는 절대로 입력하지 마세요. 현재 로그인은 인증 UI/세션 기반만 제공하며, 매장별 접근 권한은 데이터베이스 테이블과 RLS 정책 구현 후 적용해야 합니다.

환경 변수가 없으면 대시보드는 데모 모드로 표시되고, 환경 변수가 유효하게 설정되면 로그인 화면이 표시됩니다.

## 빌드
```bash
npm run build
npm run typecheck
```

빌드 산출물은 `apps/admin-web/dist`에 생성됩니다.

## Cloudflare Pages 설정
저장소 루트 기준으로 다음과 같이 설정합니다.

- Root directory: `/` (저장소 루트)
- Build command: `npm run build`
- Build output directory: `apps/admin-web/dist`
- Node.js version: `22` 이상

기존처럼 Root directory가 저장소 루트이고 Build command가 `npm run build`이면, 루트 package.json의 workspace 스크립트가 관리자 웹을 빌드합니다.

## 보안 및 운영 원칙
- 실제 비밀키는 저장소에 커밋하지 않습니다.
- service_role 키를 브라우저 코드에 넣지 않습니다.
- 주요 데이터는 tenant/store 범위와 RLS로 격리합니다.
- POS 핵심 업무는 로컬 SQLite 트랜잭션과 sync outbox를 기반으로 구현합니다.

자세한 설계는 [docs](docs/architecture.md)를 참고하세요.
