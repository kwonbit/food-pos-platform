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

-- Publish order mutations so subscribed admin screens receive realtime events.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
