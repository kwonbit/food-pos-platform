create or replace view public.store_daily_order_stats
with (security_invoker = true)
as
select
  store_id,
  business_date,
  count(*) filter (where order_status <> 'CANCELLED')::integer as order_count,
  count(*) filter (where order_status = 'PENDING')::integer as pending_count,
  count(*) filter (where payment_status = 'PAID' and order_status <> 'CANCELLED')::integer as paid_count,
  coalesce(sum(total_amount) filter (where payment_status = 'PAID' and order_status <> 'CANCELLED'), 0)::bigint as paid_sales_amount,
  coalesce(round(avg(total_amount) filter (where payment_status = 'PAID' and order_status <> 'CANCELLED')), 0)::bigint as average_paid_amount,
  count(*) filter (where order_status = 'CONFIRMED')::integer as confirmed_count,
  count(*) filter (where order_status = 'COOKING')::integer as cooking_count,
  count(*) filter (where order_status = 'SERVED')::integer as served_count
from public.orders
group by store_id, business_date;
