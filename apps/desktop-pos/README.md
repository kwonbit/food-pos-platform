# Food POS Desktop (Windows)

Electron 기반 데스크톱 POS의 첫 실행 골격입니다. Electron main process만 SQLite 파일에 접근하며 renderer는 preload에서 노출한 제한된 API만 호출합니다.

## 요구 사항

- Windows 10/11 64-bit
- Node.js 22 이상
- npm 10 이상

## 설치 및 실행

저장소 루트에서:

```bash
npm --prefix apps/desktop-pos install
npm run dev:desktop
```

Windows 설치 프로그램 생성:

```bash
npm run build:desktop:win
```

## 로컬 데이터

SQLite 파일과 고유 단말기 ID는 Electron `app.getPath("userData")` 아래에 생성됩니다. 개발 모드에서도 앱 재실행 후 주문 데이터가 유지됩니다.

## 현재 구현 범위

- SQLite 스키마 최초 생성 및 WAL 활성화
- 단말기 UUID 최초 발급 및 영구 보존
- 로컬 주문번호 발급
- 주문과 주문항목을 하나의 SQLite 트랜잭션으로 저장
- 동일 트랜잭션 안에서 idempotency key가 있는 Outbox 이벤트 생성
- 제한된 IPC API 및 context isolation
- 로컬 주문 저장 검증 화면

## 아직 구현되지 않은 항목

- Supabase 인증 및 매장 초기 등록
- 온라인 메뉴/테이블 캐시 내려받기
- Outbox 네트워크 전송 및 재시도 worker
- 서버 idempotency endpoint 및 충돌 처리
- 카드 VAN 연동 및 실제 영수증 프린터
- 기존 관리자 웹 POS와의 UI/업무 흐름 통합

Outbox가 기록되었다고 서버 동기화가 완료된 것은 아닙니다. UI는 현재 상태를 "동기화 대기"로 표시합니다.
