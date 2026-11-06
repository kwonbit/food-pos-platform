# 데이터베이스 설계 초안

## 공통 규칙
- PK는 UUID를 기본으로 사용합니다.
- 주요 업무 테이블은 tenant_id, store_id를 포함합니다.
- 원화 금액은 정수(KRW)로 저장합니다.
- 주문 당시 메뉴명/가격/옵션은 주문 항목에 스냅샷으로 저장합니다.
- 물리 삭제보다 취소/비활성화 및 이력 보존을 우선합니다.
- created_at, updated_at, created_by 등 감사 필드를 표준화합니다.

## 핵심 테이블
### 조직 및 권한
tenants, stores, store_settings, subscriptions, staff, store_memberships, roles, permissions, devices

### 메뉴
menu_categories, menus, menu_options, menu_option_values, menu_availability, menu_price_history

### 주문 및 주방
tables, orders, order_items, order_item_options, order_status_history, kitchen_tickets, kitchen_ticket_items

### 결제 및 마감
payments, payment_transactions, refunds, cash_drawers, cash_drawer_transactions, daily_closings

### 재고 및 구매
ingredients, recipes, inventory, inventory_transactions, suppliers, purchase_orders, purchase_order_items

### 운영/분석
sales_summaries, audit_logs, sync_events

## 주문 도메인
주문 유형: DINE_IN, TAKEOUT, DELIVERY, PHONE, QR

주문 상태: PENDING, CONFIRMED, COOKING, SERVED, CANCELLED

결제 상태: UNPAID, PARTIAL, PAID, REFUNDED, PARTIAL_REFUNDED

주문 상태와 결제 상태는 독립적으로 관리합니다. 제공 완료되어도 미결제일 수 있습니다.

## 주요 주문 필드
orders: id, tenant_id, store_id, order_number, business_date, order_type, table_id, customer_phone, delivery_address, request_note, order_status, payment_status, subtotal_amount, discount_amount, tax_amount, total_amount, device_id, client_created_at, server_created_at, idempotency_key.

order_items: id, order_id, menu_id, menu_name_snapshot, unit_price_snapshot, quantity, item_note, line_total_amount.

order_item_options: id, order_item_id, option_group_name_snapshot, option_value_name_snapshot, extra_price_snapshot.

## 인덱스 및 제약
- (store_id, business_date, created_at)
- (store_id, order_status), (store_id, payment_status)
- 전화 주문은 정규화 전화번호 검색용 컬럼/인덱스 검토
- 주문번호는 매장/영업일 범위에서 서버가 발급
- 수량은 0보다 크게, 금액은 정책에 맞게 제약

## RLS
store_memberships를 기준으로 접근 가능한 tenant/store를 판별합니다. 클라이언트가 전달한 tenant_id/store_id만 믿지 말고 서버에서 권한을 재검증합니다. 공개 QR 주문은 별도의 제한된 주문 생성 정책을 거칩니다. service_role 키는 서버 Secret에만 보관합니다.

## 마이그레이션
모든 DDL은 supabase/migrations의 순차 SQL 파일로 관리하고 운영 DB 변경은 migration으로 재현 가능해야 합니다.
