-- Seed a starter Chinese-restaurant menu for 더짬뽕47 only when no menu items exist.
-- Prices are editable examples, not verified store prices.
do $$
declare
  v_store_id uuid := 'fc58dbda-99bb-41d1-a336-afb766ba6982';
  v_noodle_id uuid;
  v_rice_id uuid;
  v_dish_id uuid;
  v_side_id uuid;
  v_jjamppong_id uuid;
  v_jjajang_id uuid;
  v_ganjjajang_id uuid;
  v_fried_rice_id uuid;
  v_tangsuyuk_id uuid;
  v_mandu_id uuid;
  v_group_id uuid;
begin
  if exists (select 1 from public.menus where store_id = v_store_id) then
    raise notice 'Menu seed skipped: this store already has menu items.';
    return;
  end if;

  select id into v_noodle_id from public.menu_categories where store_id = v_store_id and name = '면류' limit 1;
  if v_noodle_id is null then
    insert into public.menu_categories(store_id,name,sort_order,is_active)
    values (v_store_id,'면류',0,true) returning id into v_noodle_id;
  end if;

  insert into public.menu_categories(store_id,name,sort_order,is_active)
  values (v_store_id,'밥류',1,true) returning id into v_rice_id;
  insert into public.menu_categories(store_id,name,sort_order,is_active)
  values (v_store_id,'요리류',2,true) returning id into v_dish_id;
  insert into public.menu_categories(store_id,name,sort_order,is_active)
  values (v_store_id,'사이드',3,true) returning id into v_side_id;

  insert into public.menus(store_id,category_id,name,description,base_price,image_path,is_available,sort_order)
  values (v_store_id,v_noodle_id,'짬뽕','얼큰하고 진한 해물 육수의 대표 짬뽕',9000,null,true,0)
  returning id into v_jjamppong_id;
  insert into public.menus(store_id,category_id,name,description,base_price,image_path,is_available,sort_order)
  values (v_store_id,v_noodle_id,'짜장면','고소한 춘장 소스와 쫄깃한 면의 기본 짜장면',7000,null,true,1)
  returning id into v_jjajang_id;
  insert into public.menus(store_id,category_id,name,description,base_price,image_path,is_available,sort_order)
  values (v_store_id,v_noodle_id,'간짜장','주문 즉시 볶아낸 진한 간짜장 소스',9000,null,true,2)
  returning id into v_ganjjajang_id;
  insert into public.menus(store_id,category_id,name,description,base_price,image_path,is_available,sort_order)
  values (v_store_id,v_rice_id,'볶음밥','고슬고슬하게 볶아낸 중식 볶음밥',9000,null,true,0)
  returning id into v_fried_rice_id;
  insert into public.menus(store_id,category_id,name,description,base_price,image_path,is_available,sort_order)
  values (v_store_id,v_dish_id,'탕수육 소','바삭하게 튀긴 돼지고기에 새콤달콤한 소스',18000,null,true,0)
  returning id into v_tangsuyuk_id;
  insert into public.menus(store_id,category_id,name,description,base_price,image_path,is_available,sort_order)
  values (v_store_id,v_side_id,'군만두','겉은 바삭하고 속은 촉촉한 군만두',6000,null,true,0)
  returning id into v_mandu_id;

  insert into public.menu_option_groups(menu_id,group_no,name,is_required,sort_order)
  values (v_jjamppong_id,1,'매운맛 선택',true,0) returning id into v_group_id;
  insert into public.menu_options(group_id,name,additional_price,is_available,sort_order) values
    (v_group_id,'순한맛',0,true,0),(v_group_id,'보통맛',0,true,1),(v_group_id,'매운맛',0,true,2);

  insert into public.menu_option_groups(menu_id,group_no,name,is_required,sort_order)
  values (v_jjamppong_id,2,'면 추가',false,1) returning id into v_group_id;
  insert into public.menu_options(group_id,name,additional_price,is_available,sort_order) values
    (v_group_id,'면 추가',2000,true,0);

  insert into public.menu_option_groups(menu_id,group_no,name,is_required,sort_order)
  values (v_jjajang_id,1,'곱빼기',false,0) returning id into v_group_id;
  insert into public.menu_options(group_id,name,additional_price,is_available,sort_order) values
    (v_group_id,'곱빼기',2000,true,0);

  insert into public.menu_option_groups(menu_id,group_no,name,is_required,sort_order)
  values (v_ganjjajang_id,1,'곱빼기',false,0) returning id into v_group_id;
  insert into public.menu_options(group_id,name,additional_price,is_available,sort_order) values
    (v_group_id,'곱빼기',2000,true,0);

  insert into public.menu_option_groups(menu_id,group_no,name,is_required,sort_order)
  values (v_fried_rice_id,1,'추가 선택',false,0) returning id into v_group_id;
  insert into public.menu_options(group_id,name,additional_price,is_available,sort_order) values
    (v_group_id,'짜장소스 추가',1000,true,0),(v_group_id,'계란후라이 추가',1000,true,1);

  insert into public.menu_option_groups(menu_id,group_no,name,is_required,sort_order)
  values (v_tangsuyuk_id,1,'소스 선택',true,0) returning id into v_group_id;
  insert into public.menu_options(group_id,name,additional_price,is_available,sort_order) values
    (v_group_id,'부먹',0,true,0),(v_group_id,'찍먹',0,true,1);
end $$;
