# Food POS Platform

Windows 설치형 POS와 웹 관리자, 주방 디스플레이, QR/모바일 주문을 제공하는 다중 매장용 상용 음식점 POS 플랫폼입니다.

> 현재 저장소는 기술 설계 및 개발 착수 문서 단계입니다. 실제 VAN·프린터·현장 오프라인 동작은 장비별 검증이 필요합니다.

## 목표
- Windows POS에서 주문·결제·영수증·마감 업무 수행
- 인터넷 단절 중에도 단일 POS의 핵심 주문 업무 지속
- 연결 복구 시 중앙 서버와 안전하게 동기화
- 웹 관리자에서 메뉴, 직원, 매장, 매출 및 운영 설정 관리
- 주방 디스플레이와 QR/모바일 주문 지원
- tenant/store 단위로 여러 회사와 매장 데이터 격리

## 기술 스택
| 영역 | 기술 |
|---|---|
| Desktop POS | Electron, React, TypeScript |
| UI / 서버 데이터 | Tailwind CSS, TanStack Query |
| 로컬 데이터 | SQLite |
| 중앙 데이터 | Supabase PostgreSQL |
| 인증 / 실시간 | Supabase Auth, Realtime |
| 서버 업무 / 파일 | Supabase Edge Functions, Storage |
| 웹 배포 / 보조 API | Cloudflare Pages, Workers |
| 모노레포 | pnpm, Turborepo |
| 테스트 / 설치 | Vitest, Playwright, electron-builder |

## 저장소 구조
- apps/desktop-pos: Electron 기반 Windows POS
- apps/admin-web: 점주/본사 웹 관리자
- apps/kitchen-display: 주방 주문 화면
- apps/customer-web: QR 및 모바일 주문
- apps/local-gateway: 2단계 매장 LAN 동기화 서버
- packages: shared-types, business-logic, ui-components, database, sync-engine, printer-sdk
- supabase: migrations, functions, seed.sql
- docs: 설계 및 운영 문서

## 핵심 설계 원칙
1. Local-first: POS 업무는 SQLite에 먼저 기록하고 온라인일 때 중앙 서버로 동기화합니다.
2. 중복 방지: 모든 동기화 명령은 UUID 기반 idempotency key를 사용합니다.
3. 매장 격리: 주요 데이터는 tenant_id/store_id 범위를 가지며 RLS로 접근을 제한합니다.
4. 금액 정확성: 원화는 정수 단위로 저장하고 부동소수점 계산을 피합니다.
5. 이력 보존: 주문 상태, 결제, 환불, 재고 및 감사 기록을 보존합니다.
6. 보안: Electron renderer에 Node 권한을 노출하지 않고 service_role 키를 클라이언트에 넣지 않습니다.

## 문서
- [전체 아키텍처](docs/architecture.md)
- [데이터베이스 설계](docs/database-design.md)
- [오프라인 및 동기화](docs/offline-sync.md)
- [프로젝트 폴더 구조](docs/project-structure.md)
- [개발 로드맵](docs/development-roadmap.md)
- [결제 및 하드웨어 연동](docs/payment-integration.md)
- [보안 설계](docs/security.md)

## 시작 순서
1. 모노레포 workspace 및 공통 패키지 구성
2. Supabase 프로젝트와 migrations 구성
3. Electron POS의 SQLite 및 주문 흐름 구현
4. 동기화 엔진과 웹 관리자 구현
5. 프린터/VAN 장비 통합 테스트 및 Windows 설치 패키징

실제 비밀키는 저장소에 커밋하지 마세요. 상용 배포 정책을 확정한 뒤 라이선스를 추가합니다.
