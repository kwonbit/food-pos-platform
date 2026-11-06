# 관리자 대시보드 실제 데이터 연결

## 구현 범위

- Supabase Auth로 로그인한 사용자에게 활성화된 매장만 표시합니다.
- `store_memberships`에 등록된 매장만 조회할 수 있습니다.
- 최근 주문 20건과 영업일 기준 매출/주문 요약을 조회합니다.
- 매출은 결제 상태가 `PAID`인 주문만 합산하고, 주문 건수와 평균 결제 금액은 취소 주문을 제외합니다.
- 대시보드 데이터 조회는 읽기 전용입니다. 주문 생성/상태 변경 API는 아직 열지 않았습니다.

## Supabase Data API 설정

2026년 10월 30일부터 새 테이블은 기본적으로 Data API에 자동 노출되지 않습니다. Supabase Dashboard에서 다음을 확인해야 합니다.

1. Project Settings → API → Data API 설정으로 이동합니다.
2. Exposed schemas에 `public`이 포함되어 있는지 확인합니다.
3. 아래 테이블과 뷰에 `authenticated` SELECT 권한이 있는지 확인합니다.
   - `tenants`, `stores`, `store_memberships`, `orders`, `order_items`
   - `store_daily_order_stats`
4. 권한은 마이그레이션에서 SELECT만 부여했습니다. 브라우저에서 쓰기 권한은 부여하지 않았습니다.

Data API 노출 설정은 SQL의 GRANT 및 RLS와 별개입니다. public 스키마가 Exposed schemas에 포함되어 있지 않으면 브라우저 조회가 실패할 수 있습니다.

## 첫 매장 및 관리자 연결

1. Authentication → Users에서 관리자 사용자를 생성합니다.
2. 해당 사용자의 UID를 복사합니다.
3. SQL Editor에서 아래 SQL의 매장명, slug, 관리자 UID를 실제 값으로 바꾸고 실행합니다.

```sql
with new_tenant as (
  insert into public.tenants (name, slug)
  values ('매장명', 'unique-store-slug')
  returning id
),
new_store as (
  insert into public.stores (tenant_id, name, code, timezone)
  select id, '매장명', 'STORE-001', 'Asia/Seoul'
  from new_tenant
  returning id
)
insert into public.store_memberships (store_id, user_id, role)
select id, '관리자_AUTH_USER_UID'::uuid, 'OWNER'
from new_store
returning store_id;
```

관리자 UID는 Auth 사용자의 실제 UUID여야 합니다. 위 작업은 운영자가 SQL Editor에서 실행하는 관리 작업이며, 브라우저 사용자에게 멤버십 생성 권한을 주지 않습니다.

## 데이터가 표시되지 않을 때

- 로그인 이메일이 Authentication → Users에 등록되어 있는지 확인합니다.
- 해당 Auth UID가 `store_memberships`에 연결되어 있고 `is_active = true`인지 확인합니다.
- 매장이 `is_active = true`인지 확인합니다.
- Data API의 Exposed schemas에 `public`이 포함되어 있는지 확인합니다.
- 브라우저 오류에 `schema cache`, `not found`, `permission denied`가 있으면 Data API 노출 및 GRANT를 먼저 확인합니다.

## 보안 경계

모든 업무 테이블에 RLS를 활성화했습니다. `private.user_has_store_access()`는 인증 사용자의 활성 매장 멤버십만 확인하며, 클라이언트가 보낸 store ID만으로 접근 권한을 부여하지 않습니다. 이 함수는 private 스키마에 있고 authenticated 역할에만 실행 권한이 있습니다.

주문/주문 항목/매장/멤버십은 현재 SELECT만 허용합니다. 향후 주문 등록과 상태 변경은 검증된 서버 측 업무 API 및 별도 권한 정책으로 추가해야 합니다.
