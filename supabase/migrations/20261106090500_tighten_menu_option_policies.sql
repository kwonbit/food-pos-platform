drop policy if exists "Managers can manage menu option groups" on public.menu_option_groups;
create policy "Managers can insert menu option groups" on public.menu_option_groups for insert to authenticated
with check (exists (select 1 from public.menus m join public.store_memberships sm on sm.store_id=m.store_id where m.id=menu_option_groups.menu_id and sm.user_id=(select auth.uid()) and sm.is_active and sm.role in ('OWNER','ADMIN','MANAGER')));
create policy "Managers can update menu option groups" on public.menu_option_groups for update to authenticated
using (exists (select 1 from public.menus m join public.store_memberships sm on sm.store_id=m.store_id where m.id=menu_option_groups.menu_id and sm.user_id=(select auth.uid()) and sm.is_active and sm.role in ('OWNER','ADMIN','MANAGER')))
with check (exists (select 1 from public.menus m join public.store_memberships sm on sm.store_id=m.store_id where m.id=menu_option_groups.menu_id and sm.user_id=(select auth.uid()) and sm.is_active and sm.role in ('OWNER','ADMIN','MANAGER')));
create policy "Managers can delete menu option groups" on public.menu_option_groups for delete to authenticated
using (exists (select 1 from public.menus m join public.store_memberships sm on sm.store_id=m.store_id where m.id=menu_option_groups.menu_id and sm.user_id=(select auth.uid()) and sm.is_active and sm.role in ('OWNER','ADMIN','MANAGER')));

drop policy if exists "Managers can manage menu options" on public.menu_options;
create policy "Managers can insert menu options" on public.menu_options for insert to authenticated
with check (exists (select 1 from public.menu_option_groups g join public.menus m on m.id=g.menu_id join public.store_memberships sm on sm.store_id=m.store_id where g.id=menu_options.group_id and sm.user_id=(select auth.uid()) and sm.is_active and sm.role in ('OWNER','ADMIN','MANAGER')));
create policy "Managers can update menu options" on public.menu_options for update to authenticated
using (exists (select 1 from public.menu_option_groups g join public.menus m on m.id=g.menu_id join public.store_memberships sm on sm.store_id=m.store_id where g.id=menu_options.group_id and sm.user_id=(select auth.uid()) and sm.is_active and sm.role in ('OWNER','ADMIN','MANAGER')))
with check (exists (select 1 from public.menu_option_groups g join public.menus m on m.id=g.menu_id join public.store_memberships sm on sm.store_id=m.store_id where g.id=menu_options.group_id and sm.user_id=(select auth.uid()) and sm.is_active and sm.role in ('OWNER','ADMIN','MANAGER')));
create policy "Managers can delete menu options" on public.menu_options for delete to authenticated
using (exists (select 1 from public.menu_option_groups g join public.menus m on m.id=g.menu_id join public.store_memberships sm on sm.store_id=m.store_id where g.id=menu_options.group_id and sm.user_id=(select auth.uid()) and sm.is_active and sm.role in ('OWNER','ADMIN','MANAGER')));
