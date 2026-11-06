# Food POS Platform

Windows 설치형 POS와 웹 관리자, 주방 디스플레이, QR/모바일 주문을 제공하는 다중 매장용 상용 음식점 POS 플랫폼입니다.

## 현재 구현 상태
- [x] 모노레포 기본 구성 (npm workspaces + pnpm workspace 호환 설정)
- [x] React + TypeScript + Vite 기반 관리자 웹 초기 화면
- [x] 공통 주문/결제 도메인 타입 패키지
- [x] Supabase 브라우저 클라이언트 및 이메일/비밀번호 인증 기반
- [x] 매장/주문 기본 테이블 및 매장별 RLS 정책
- [x] 관리자 대시보드의 실제 매장·최근 주문·일일 매출 조회
- [ ] 주문 생성/상태 변경 API 및 POS 동기화
- [ ] Electron Windows POS 및 오프라인 SQLite
- [ ] 주방 디스플레이, 고객 주문 웹

Supabase 환경 변수가 설정되지 않은 로컬 미리보기는 데모 데이터를 사용합니다. 인증이 활성화된 경우에는 매장 멤버십으로 접근 가능한 매장과 해당 매장의 실제 주문/일일 집계 데이터를 조회합니다. 첫 매장 및 관리자 UID 연결은 [관리자 대시보드 데이터 설정](docs/admin-dashboard-data-setup.md)을 참고하세요. 주문 등록/상태 변경 API는 후속 작업입니다.

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

## Cloudflare Pages 배포 설정

이 저장소의 관리자 웹은 **Cloudflare Pages 정적 사이트**로 배포합니다. 기존 Workers 서비스의 `npx wrangler deploy` 설정을 그대로 사용하지 말고, Cloudflare 대시보드에서 Pages 프로젝트를 새로 생성해 Git 저장소를 연결하세요. Pages와 Workers는 배포 방식이 다르며, 이 저장소에는 Workers용 Wrangler 배포 설정이 필요하지 않습니다.

Pages 프로젝트의 Build settings는 다음과 같이 지정합니다.

| 항목 | 값 |
|---|---|
| Framework preset | `None` 또는 `Vite` |
| Production branch | `main` (변경사항 병합 후) |
| Root directory | `/` (저장소 루트) |
| Build command | `npm run build` |
| Build output directory | `apps/admin-web/dist` |
| Node.js version | `22` (`.nvmrc` 기준) |
| Deploy command | Pages에서는 별도 입력하지 않음 |

**중요:** Root directory를 `apps/admin-web`로 지정하면 안 됩니다. npm workspaces와 루트 `package.json` 스크립트를 사용하므로 저장소 루트에서 빌드해야 합니다. 설치 명령은 Cloudflare의 기본 npm 설치를 사용하고, `package-lock.json`이 없는 상태에서는 `npm ci`를 직접 지정하지 마세요.

### Pages 환경 변수

Settings → Environment variables에서 Production과 Preview 환경에 아래 변수를 각각 등록합니다.

- `VITE_SUPABASE_URL`: Supabase Project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anon 또는 publishable key

이 값들은 Vite 빌드 시 브라우저 번들에 포함됩니다. publishable/anon 키만 사용하고 `service_role` 또는 secret key는 절대 등록하지 마세요. 값을 추가하거나 수정한 뒤에는 새 배포를 실행해야 합니다.

### Supabase Auth URL 설정

Supabase Dashboard → Authentication → URL Configuration에서 실제 Pages 도메인을 Site URL 및 Redirect URLs에 추가하세요. Preview 배포를 인증에 사용할 경우 해당 Preview 도메인도 허용해야 합니다.

### SPA 경로 처리

`apps/admin-web/public/_redirects`에 Pages SPA fallback을 포함했습니다. Vite 빌드 시 이 파일이 `dist`에 복사되어 클라이언트 라우트 직접 접근/새로고침 시 `index.html`로 처리됩니다.

## 보안 및 운영 원칙
- 실제 비밀키는 저장소에 커밋하지 않습니다.
- service_role 키를 브라우저 코드에 넣지 않습니다.
- 주요 데이터는 tenant/store 범위와 RLS로 격리합니다.
- POS 핵심 업무는 로컬 SQLite 트랜잭션과 sync outbox를 기반으로 구현합니다.

자세한 설계는 [아키텍처](docs/architecture.md)와 [관리자 대시보드 데이터 설정](docs/admin-dashboard-data-setup.md)을 참고하세요.
