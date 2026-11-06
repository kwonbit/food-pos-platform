# 시스템 아키텍처

## 구성 요소
- Desktop POS: Electron main process가 SQLite, 프린터, OS 연동을 담당하고 React renderer가 화면을 표시합니다.
- Admin Web: 메뉴, 매장, 직원, 주문, 매출, 재고 관리
- Kitchen Display: 주문 티켓 실시간 표시 및 조리 상태 갱신
- Customer Web: QR 테이블 주문, 포장/배달 주문
- Supabase: PostgreSQL, Auth, Realtime, Storage, Edge Functions
- Cloudflare: 웹 정적 배포와 보조 API
- Local Gateway(2단계): 매장 LAN 안에서 여러 POS와 주방 화면의 오프라인 데이터 공유

## 주문 데이터 흐름
1. POS 화면에서 주문 입력
2. renderer가 preload의 제한된 IPC API 호출
3. main process가 업무 규칙을 검증하고 SQLite 트랜잭션으로 주문/항목/결제 기록
4. 같은 트랜잭션에서 sync_outbox에 전송 명령 저장
5. 네트워크 복구 시 동기화 엔진이 인증된 API로 전송
6. 서버는 idempotency key를 확인하고 PostgreSQL 트랜잭션으로 반영
7. 서버 결과를 로컬 inbox에 반영하고 outbox 완료 처리
8. Realtime으로 관리자/주방 등 온라인 클라이언트에 변경 전파

## 기술 선택
| 구성 | 선택 | 목적 |
|---|---|---|
| Desktop | Electron + React + TypeScript | Windows 설치형 앱 |
| Local DB | SQLite | 단일 장비 오프라인 트랜잭션 |
| Cloud DB | Supabase PostgreSQL | 관계형 업무 데이터와 RLS |
| Auth | Supabase Auth | 사용자 인증 |
| Realtime | Supabase Realtime | 온라인 화면 갱신 |
| Backend | Edge Functions | 권한 확인이 필요한 업무 처리 |
| Web hosting | Cloudflare Pages | 웹 배포 |
| Monorepo | pnpm + Turborepo | 앱/패키지 공유 |

## 오프라인 범위
- 1차: 단일 Windows POS 한 대에서 주문, 주문 변경, 현금 결제 기록 등 로컬 기능
- 온라인 복구: 미전송 명령을 순서대로 중앙 서버와 동기화
- 카드 승인: VAN/단말기의 오프라인 승인 기능과 계약 정책에 따름
- 2차: 여러 POS와 주방 화면이 인터넷 단절 중에도 공유되어야 하면 Local Gateway 도입

## 도메인 경계
Catalog(메뉴), Ordering(주문), Payment(결제), Inventory(재고), Identity(인증/권한), Reporting(매출/마감)으로 분리합니다.

## 확장 원칙
tenant_id와 store_id를 주요 데이터에 명시합니다. 업무 규칙은 UI에서 분리하고 서버 수신 시각과 단말기 발생 시각을 함께 기록합니다.
