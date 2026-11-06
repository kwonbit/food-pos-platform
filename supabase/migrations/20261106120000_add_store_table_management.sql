create table public.store_tables (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  store_id uuid not null,
  name text not null,
  area text not null default '홀',
  capacity integer not null default 4 check (capacity between 1 and 99),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_tables_store_tenant_match
    foreign key (store_id, tenant_id) references public.stores(id, tenant_id) on delete cascade
);

create unique index store_tables_store_name_uidx on public.store_tables(store_id, lower(name));
create index store_tables_store_active_order_idx on public.store_tables(store_id, is_active, sort_order, name);

alter table public.store_tables enable row level security;

create policy "Store members can read tables"
on public.store_tables for select to authenticated
using (private.user_has_store_access(store_id));

create policy "Store managers can add tables"
on public.store_tables for insert to authenticated
with check (
  tenant_id = (select s.tenant_id from public.stores s where s.id = store_tables.store_id)
  and exists (
    select 1 from public.store_memberships sm
    where sm.store_id = store_tables.store_id
      and sm.user_id = (select auth.uid())
      and sm.is_active
      and sm.role in ('OWNER','ADMIN','MANAGER')
  )
);

create policy "Store managers can update tables"
on public.store_tables for update to authenticated
using (
  exists (
    select 1 from public.store_memberships sm
    where sm.store_id = store_tables.store_id
      and sm.user_id = (select auth.uid())
      and sm.is_active
      and sm.role in ('OWNER','ADMIN','MANAGER')
  )
)
with check (
  tenant_id = (select s.tenant_id from public.stores s where s.id = store_tables.store_id)
  and exists (
    select 1 from public.store_memberships sm
    where sm.store_id = store_tables.store_id
      and sm.user_id = (select auth.uid())
      and sm.is_active
      and sm.role in ('OWNER','ADMIN','MANAGER')
  )
);

grant select, insert, update on public.store_tables to authenticated;

alter table public.orders
  add column table_id uuid references public.store_tables(id) on delete set null;

create index orders_store_table_idx on public.orders(store_id, table_id);
