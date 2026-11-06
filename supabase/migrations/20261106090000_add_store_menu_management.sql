create table public.menu_categories (
 id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id) on delete cascade,
 name text not null check (char_length(trim(name)) between 1 and 60), sort_order integer not null default 0,
 is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique (store_id,id), unique (store_id,name)
);
create table public.menus (
 id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id) on delete cascade,
 category_id uuid not null, name text not null check (char_length(trim(name)) between 1 and 100),
 description text not null default '', base_price integer not null default 0 check (base_price >= 0),
 image_path text, is_available boolean not null default true, sort_order integer not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique (store_id,id), constraint menus_category_store_match foreign key (store_id,category_id)
 references public.menu_categories(store_id,id) on delete restrict
);
create table public.menu_option_groups (
 id uuid primary key default gen_random_uuid(), menu_id uuid not null references public.menus(id) on delete cascade,
 group_no smallint not null check (group_no in (1,2)), name text not null check (char_length(trim(name)) between 1 and 60),
 is_required boolean not null default false, sort_order integer not null default 0, created_at timestamptz not null default now(),
 unique (menu_id,group_no)
);
create table public.menu_options (
 id uuid primary key default gen_random_uuid(), group_id uuid not null references public.menu_option_groups(id) on delete cascade,
 name text not null check (char_length(trim(name)) between 1 and 80), additional_price integer not null default 0 check (additional_price >= 0),
 is_available boolean not null default true, sort_order integer not null default 0, created_at timestamptz not null default now()
);
create index menu_categories_store_sort_idx on public.menu_categories(store_id,sort_order,name);
create index menus_store_category_sort_idx on public.menus(store_id,category_id,sort_order,name);
create index menu_option_groups_menu_idx on public.menu_option_groups(menu_id,group_no);
create index menu_options_group_idx on public.menu_options(group_id,sort_order);
alter table public.menu_categories enable row level security;
alter table public.menus enable row level security;
alter table public.menu_option_groups enable row level security;
alter table public.menu_options enable row level security;
create policy "Store members can read menu categories" on public.menu_categories for select to authenticated using (private.user_has_store_access(store_id));
create policy "Managers can insert menu categories" on public.menu_categories for insert to authenticated with check (exists (select 1 from public.store_memberships sm where sm.store_id=menu_categories.store_id and sm.user_id=(select auth.uid()) and sm.is_active and sm.role in ('OWNER','ADMIN','MANAGER')));
create policy "Managers can update menu categories" on public.menu_categories for update to authenticated using (exists (select 1 from public.store_memberships sm where sm.store_id=menu_categories.store_id and sm.user_id=(select auth.uid()) and sm.is_active and sm.role in ('OWNER','ADMIN','MANAGER'))) with check (exists (select 1 from public.store_memberships sm where sm.store_id=menu_categories.store_id and sm.user_id=(select auth.uid()) and sm.is_active and sm.role in ('OWNER','ADMIN','MANAGER')));
create policy "Managers can delete menu categories" on public.menu_categories for delete to authenticated using (exists (select 1 from public.store_memberships sm where sm.store_id=menu_categories.store_id and sm.user_id=(select auth.uid()) and sm.is_active and sm.role in ('OWNER','ADMIN','MANAGER')));
create policy "Store members can read menus" on public.menus for select to authenticated using (private.user_has_store_access(store_id));
create policy "Managers can insert menus" on public.menus for insert to authenticated with check (exists (select 1 from public.store_memberships sm where sm.store_id=menus.store_id and sm.user_id=(select auth.uid()) and sm.is_active and sm.role in ('OWNER','ADMIN','MANAGER')));
create policy "Managers can update menus" on public.menus for update to authenticated using (exists (select 1 from public.store_memberships sm where sm.store_id=menus.store_id and sm.user_id=(select auth.uid()) and sm.is_active and sm.role in ('OWNER','ADMIN','MANAGER'))) with check (exists (select 1 from public.store_memberships sm where sm.store_id=menus.store_id and sm.user_id=(select auth.uid()) and sm.is_active and sm.role in ('OWNER','ADMIN','MANAGER')));
create policy "Managers can delete menus" on public.menus for delete to authenticated using (exists (select 1 from public.store_memberships sm where sm.store_id=menus.store_id and sm.user_id=(select auth.uid()) and sm.is_active and sm.role in ('OWNER','ADMIN','MANAGER')));
create policy "Store members can read menu option groups" on public.menu_option_groups for select to authenticated using (exists (select 1 from public.menus m where m.id=menu_option_groups.menu_id and private.user_has_store_access(m.store_id)));
create policy "Managers can manage menu option groups" on public.menu_option_groups for all to authenticated using (exists (select 1 from public.menus m join public.store_memberships sm on sm.store_id=m.store_id where m.id=menu_option_groups.menu_id and sm.user_id=(select auth.uid()) and sm.is_active and sm.role in ('OWNER','ADMIN','MANAGER'))) with check (exists (select 1 from public.menus m join public.store_memberships sm on sm.store_id=m.store_id where m.id=menu_option_groups.menu_id and sm.user_id=(select auth.uid()) and sm.is_active and sm.role in ('OWNER','ADMIN','MANAGER')));
create policy "Store members can read menu options" on public.menu_options for select to authenticated using (exists (select 1 from public.menu_option_groups g join public.menus m on m.id=g.menu_id where g.id=menu_options.group_id and private.user_has_store_access(m.store_id)));
create policy "Managers can manage menu options" on public.menu_options for all to authenticated using (exists (select 1 from public.menu_option_groups g join public.menus m on m.id=g.menu_id join public.store_memberships sm on sm.store_id=m.store_id where g.id=menu_options.group_id and sm.user_id=(select auth.uid()) and sm.is_active and sm.role in ('OWNER','ADMIN','MANAGER'))) with check (exists (select 1 from public.menu_option_groups g join public.menus m on m.id=g.menu_id join public.store_memberships sm on sm.store_id=m.store_id where g.id=menu_options.group_id and sm.user_id=(select auth.uid()) and sm.is_active and sm.role in ('OWNER','ADMIN','MANAGER')));
grant select,insert,update,delete on public.menu_categories,public.menus,public.menu_option_groups,public.menu_options to authenticated;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('menu-images','menu-images',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy "Store members can upload menu images" on storage.objects for insert to authenticated with check (bucket_id='menu-images' and exists (select 1 from public.store_memberships sm where sm.store_id::text=(storage.foldername(name))[1] and sm.user_id=(select auth.uid()) and sm.is_active and sm.role in ('OWNER','ADMIN','MANAGER')));
create policy "Store members can read menu image metadata" on storage.objects for select to authenticated using (bucket_id='menu-images' and exists (select 1 from public.store_memberships sm where sm.store_id::text=(storage.foldername(name))[1] and sm.user_id=(select auth.uid()) and sm.is_active));
create policy "Store members can update menu images" on storage.objects for update to authenticated using (bucket_id='menu-images' and exists (select 1 from public.store_memberships sm where sm.store_id::text=(storage.foldername(name))[1] and sm.user_id=(select auth.uid()) and sm.is_active and sm.role in ('OWNER','ADMIN','MANAGER'))) with check (bucket_id='menu-images' and exists (select 1 from public.store_memberships sm where sm.store_id::text=(storage.foldername(name))[1] and sm.user_id=(select auth.uid()) and sm.is_active and sm.role in ('OWNER','ADMIN','MANAGER')));
create policy "Store members can delete menu images" on storage.objects for delete to authenticated using (bucket_id='menu-images' and exists (select 1 from public.store_memberships sm where sm.store_id::text=(storage.foldername(name))[1] and sm.user_id=(select auth.uid()) and sm.is_active and sm.role in ('OWNER','ADMIN','MANAGER')));
