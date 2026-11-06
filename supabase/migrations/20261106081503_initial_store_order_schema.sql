create schema if not exists private;

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  name text not null,
  code text,
  timezone text not null default 'Asia/Seoul',
  currency text not null default 'KRW' check (currency = 'KRW'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code),
  unique (id, tenant_id)
);

create table public.store_memberships (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('OWNER','ADMIN','MANAGER','CASHIER','KITCHEN','VIEWER')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (store_id, user_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  store_id uuid not null,
  order_number text not null,
  business_date date not null default (now() at time zone 'Asia/Seoul')::date,
  order_type text not null check (order_type in ('DINE_IN','TAKEOUT','DELIVERY','PHONE','QR')),
  table_name text,
  customer_name text,
  customer_phone text,
  delivery_address text,
  request_note text,
  order_status text not null default 'PENDING' check (order_status in ('PENDING','CONFIRMED','COOKING','SERVED','CANCELLED')),
  payment_status text not null default 'UNPAID' check (payment_status in ('UNPAID','PARTIAL','PAID','REFUNDED','PARTIAL_REFUNDED')),
  subtotal_amount integer not null default 0 check (subtotal_amount >= 0),
  discount_amount integer not null default 0 check (discount_amount >= 0),
  tax_amount integer not null default 0 check (tax_amount >= 0),
  total_amount integer not null default 0 check (total_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, order_number),
  constraint orders_store_tenant_match foreign key (store_id, tenant_id) references public.stores(id, tenant_id)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_name_snapshot text not null,
  quantity numeric(12,3) not null check (quantity > 0),
  unit_price_snapshot integer not null check (unit_price_snapshot >= 0),
  line_total_amount integer not null check (line_total_amount >= 0),
  created_at timestamptz not null default now()
);

create index stores_tenant_active_idx on public.stores(tenant_id, is_active);
create index store_memberships_user_active_idx on public.store_memberships(user_id, is_active);
create index orders_store_created_idx on public.orders(store_id, created_at desc);
create index orders_store_business_date_idx on public.orders(store_id, business_date);
create index orders_store_status_idx on public.orders(store_id, order_status);
create index order_items_order_idx on public.order_items(order_id);

create or replace function private.user_has_store_access(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.store_memberships sm
    where sm.store_id = p_store_id
      and sm.user_id = (select auth.uid())
      and sm.is_active = true
  );
$$;

revoke all on schema private from public, anon, authenticated;
revoke all on function private.user_has_store_access(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.user_has_store_access(uuid) to authenticated;

alter table public.tenants enable row level security;
alter table public.stores enable row level security;
alter table public.store_memberships enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "Users can read tenant for their stores"
on public.tenants for select to authenticated
using (
  exists (
    select 1 from public.stores s
    where s.tenant_id = tenants.id
      and private.user_has_store_access(s.id)
  )
);

create policy "Members can read assigned active stores"
on public.stores for select to authenticated
using (is_active and private.user_has_store_access(id));

create policy "Users can read their own active memberships"
on public.store_memberships for select to authenticated
using (user_id = (select auth.uid()) and is_active);

create policy "Store members can read store orders"
on public.orders for select to authenticated
using (private.user_has_store_access(store_id));

create policy "Store members can read order items"
on public.order_items for select to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and private.user_has_store_access(o.store_id)
  )
);

grant select on public.tenants, public.stores, public.store_memberships, public.orders, public.order_items to authenticated;
