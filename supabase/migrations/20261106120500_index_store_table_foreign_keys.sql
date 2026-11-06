create index if not exists orders_table_id_idx on public.orders(table_id);
create index if not exists store_tables_store_tenant_idx on public.store_tables(store_id, tenant_id);