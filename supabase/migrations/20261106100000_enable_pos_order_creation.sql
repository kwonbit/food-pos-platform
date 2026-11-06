-- Allow authorized store staff to create POS orders and their item snapshots.
create policy "POS staff can create store orders"
on public.orders
for insert
to authenticated
with check (
  tenant_id = (select s.tenant_id from public.stores s where s.id = orders.store_id)
  and exists (
    select 1
    from public.store_memberships sm
    where sm.store_id = orders.store_id
      and sm.user_id = (select auth.uid())
      and sm.is_active
      and sm.role in ('OWNER', 'ADMIN', 'MANAGER', 'CASHIER')
  )
);

create policy "POS staff can add order items"
on public.order_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.orders o
    join public.store_memberships sm on sm.store_id = o.store_id
    where o.id = order_items.order_id
      and sm.user_id = (select auth.uid())
      and sm.is_active
      and sm.role in ('OWNER', 'ADMIN', 'MANAGER', 'CASHIER')
      and o.order_status = 'PENDING'
      and o.payment_status = 'UNPAID'
  )
);

create policy "POS staff can remove unprocessed unpaid orders"
on public.orders
for delete
to authenticated
using (
  order_status = 'PENDING'
  and payment_status = 'UNPAID'
  and exists (
    select 1
    from public.store_memberships sm
    where sm.store_id = orders.store_id
      and sm.user_id = (select auth.uid())
      and sm.is_active
      and sm.role in ('OWNER', 'ADMIN', 'MANAGER', 'CASHIER')
  )
);

grant insert, delete on public.orders to authenticated;
grant insert on public.order_items to authenticated;
