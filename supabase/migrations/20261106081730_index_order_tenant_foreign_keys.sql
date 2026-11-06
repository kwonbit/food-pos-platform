create index orders_store_tenant_idx on public.orders(store_id, tenant_id);
create index orders_tenant_idx on public.orders(tenant_id);
