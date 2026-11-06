# 프로젝트 폴더 구조

food-pos-platform/
- apps/
  - desktop-pos/ (main, preload, renderer, local-db, printer, sync)
  - admin-web/
  - kitchen-display/
  - customer-web/
  - local-gateway/ (2단계 LAN 서버)
- packages/
  - shared-types/
  - business-logic/
  - ui-components/
  - database/
  - sync-engine/
  - printer-sdk/
- supabase/
  - migrations/
  - functions/
  - seed.sql
- docs/
- .env.example
- .gitignore
- package.json
- pnpm-workspace.yaml
- turbo.json
- README.md

## 패키지 책임
- shared-types: 도메인 타입, API DTO, enum
- business-logic: 주문 상태 전이, 가격 계산, 할인/세금 규칙
- database: Supabase 생성 타입, migration 도구
- sync-engine: outbox/inbox, 재시도, 충돌 처리
- printer-sdk: 프린터 공통 인터페이스 및 모델별 adapter
- ui-components: 앱 간 공통 UI

## 의존성 규칙
renderer는 SQLite 파일이나 Node API에 직접 접근하지 않습니다. renderer는 preload의 명시적 API를 호출하고 main process가 실제 시스템 작업을 수행합니다. 업무 규칙은 React 컴포넌트에 중복 구현하지 않습니다.
