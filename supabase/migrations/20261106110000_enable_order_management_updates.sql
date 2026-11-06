-- Allow authorized store operators to update order workflow and payment state.
drop policy if exists "Store operators can update store orders" on public.orders;
create policy "Store operators can update store orders"
on public.orders for update to authenticated
using (
  private.user_has_store_access(store_id)
  and exists (
    select 1 from public.store_memberships sm
    where sm.store_id = orders.store_id
      and sm.user_id = (select auth.uid())
      and sm.is_active = true
      and sm.role in ('OWNER','ADMIN','MANAGER','CASHIER','KITCHEN')
  )
)
with check (
  private.user_has_store_access(store_id)
  and exists (
    select 1 from public.store_memberships sm
    where sm.store_id = orders.store_id
      and sm.user_id = (select auth.uid())
      and sm.is_active = true
      and sm.role in ('OWNER','ADMIN','MANAGER','CASHIER','KITCHEN')
  )
);
grant update (order_status, payment_status, updated_at) on public.orders to authenticated;
