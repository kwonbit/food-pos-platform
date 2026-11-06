# 오프라인 및 동기화 설계

## 기본 원칙
POS 단말은 네트워크가 끊겨도 핵심 주문 흐름을 지속합니다. SQLite를 즉시 저장소로 사용하고 중앙 서버 동기화는 별도 작업으로 처리합니다.

## 로컬 테이블
local_orders, local_order_items, local_order_item_options, local_payments, local_payment_transactions, local_menu_cache, local_store_settings, sync_outbox, sync_inbox, sync_conflicts, device_sequence.

모든 로컬 변경은 업무 테이블과 sync_outbox를 하나의 SQLite 트랜잭션으로 기록합니다.

## Outbox 이벤트
id(UUID), tenant_id, store_id, device_id, aggregate_type, aggregate_id, event_type, payload_json, idempotency_key(UUID unique), occurred_at, created_at, retry_count, next_retry_at, status.

상태는 PENDING, PROCESSING, SUCCEEDED, FAILED, NEEDS_REVIEW를 사용합니다.

## 전송 및 중복 방지
1. 네트워크 연결 확인
2. PENDING 이벤트를 생성 순서로 읽음
3. TLS를 통해 인증된 API로 전송
4. 서버가 idempotency_key를 unique하게 확인
5. 이미 처리한 키면 기존 결과 반환
6. 신규 키면 권한/업무 규칙 검증 후 DB 트랜잭션 처리
7. 서버 응답을 inbox에 기록하고 outbox 완료 처리

재시도는 지수 백오프를 적용하고 일시적 오류와 영구 오류를 구분합니다.

## 충돌 처리
- 메뉴 가격 변경: 기존 주문은 생성 당시 스냅샷 가격 유지
- 메뉴 판매 중지: 이미 생성된 주문 항목은 임의 변경하지 않음
- 주문 상태 변경: 허용된 상태 전이와 버전 검증
- 여러 단말에서 동시 수정: 마지막 쓰기 방식으로 덮어쓰지 않고 충돌 판정
- 해결 불가 충돌: 관리자 검토 큐로 전달

## 주문번호
온라인 주문번호는 서버에서 매장/영업일별 발급합니다. 오프라인은 단말기 ID와 로컬 시퀀스를 조합한 임시 번호를 사용하고 서버 번호 매핑을 보존합니다.

## 결제 주의
현금은 로컬 기록 후 동기화할 수 있습니다. 카드 승인은 VAN 및 카드사/가맹점 정책에 따릅니다. 승인 결과가 불명확하면 자동 재승인하지 않고 거래 조회/대사로 먼저 확인합니다.

## 다중 단말 오프라인
단일 POS 오프라인 구조에서는 다른 단말이 주문을 즉시 볼 수 없습니다. 여러 POS와 주방 화면의 오프라인 공유는 2차 단계에서 Local Gateway로 구현합니다.

## 모니터링
마지막 성공 동기화 시각, 대기/실패 이벤트 수, 가장 오래된 미전송 이벤트, 단말기별 마지막 접속, 충돌 건수를 표시합니다.
