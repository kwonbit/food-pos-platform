import { supabase } from "./supabase";

export interface MenuCategory {
  id: string;
  store_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}
export interface MenuOption {
  id?: string;
  name: string;
  additional_price: number;
  is_available: boolean;
}
export interface MenuOptionGroup {
  id?: string;
  group_no: 1 | 2;
  name: string;
  is_required: boolean;
  menu_options: MenuOption[];
}
export interface MenuItem {
  id: string;
  store_id: string;
  category_id: string;
  name: string;
  description: string;
  base_price: number;
  image_path: string | null;
  is_available: boolean;
  sort_order: number;
  menu_option_groups: MenuOptionGroup[];
}
export interface MenuDraft {
  id?: string;
  category_id: string;
  name: string;
  description: string;
  base_price: number;
  image_path: string | null;
  is_available: boolean;
  groups: Array<{ name: string; is_required: boolean; options: MenuOption[] }>;
}

function client() {
  if (!supabase) throw new Error("Supabase 연결이 설정되지 않았습니다.");
  return supabase;
}

export async function fetchMenuCategories(storeId: string): Promise<MenuCategory[]> {
  const { data, error } = await client().from("menu_categories")
    .select("id, store_id, name, sort_order, is_active")
    .eq("store_id", storeId).order("sort_order").order("name");
  if (error) throw error;
  return (data ?? []) as MenuCategory[];
}

export async function fetchMenus(storeId: string): Promise<MenuItem[]> {
  const { data, error } = await client().from("menus")
    .select("id, store_id, category_id, name, description, base_price, image_path, is_available, sort_order, menu_option_groups(id, group_no, name, is_required, menu_options(id, name, additional_price, is_available))")
    .eq("store_id", storeId).order("sort_order").order("name");
  if (error) throw error;
  return ((data ?? []) as unknown as MenuItem[]).map((menu) => ({
    ...menu,
    menu_option_groups: [...(menu.menu_option_groups ?? [])].sort((a, b) => a.group_no - b.group_no)
      .map((group) => ({ ...group, menu_options: group.menu_options ?? [] })),
  }));
}

export async function saveCategory(storeId: string, name: string, categoryId?: string) {
  const db = client();
  const result = categoryId
    ? await db.from("menu_categories").update({ name: name.trim(), updated_at: new Date().toISOString() }).eq("id", categoryId).eq("store_id", storeId)
    : await db.from("menu_categories").insert({ store_id: storeId, name: name.trim() });
  if (result.error) throw result.error;
}

export async function deleteCategory(categoryId: string) {
  const { error } = await client().from("menu_categories").delete().eq("id", categoryId);
  if (error) throw error;
}

export async function uploadMenuImage(storeId: string, file: File): Promise<string> {
  const db = client();
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("JPG, PNG, WEBP 이미지 파일만 업로드할 수 있습니다.");
  }
  if (file.size > 5 * 1024 * 1024) throw new Error("이미지는 5MB 이하로 등록해 주세요.");
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${storeId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await db.storage.from("menu-images").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

export function getMenuImageUrl(path: string | null): string | null {
  if (!path || !supabase) return null;
  return supabase.storage.from("menu-images").getPublicUrl(path).data.publicUrl;
}

export async function saveMenu(storeId: string, draft: MenuDraft) {
  const db = client();
  const payload = {
    store_id: storeId,
    category_id: draft.category_id,
    name: draft.name.trim(),
    description: draft.description.trim(),
    base_price: draft.base_price,
    image_path: draft.image_path,
    is_available: draft.is_available,
    updated_at: new Date().toISOString(),
  };
  let menuId = draft.id;
  if (menuId) {
    const { error } = await db.from("menus").update(payload).eq("id", menuId).eq("store_id", storeId);
    if (error) throw error;
  } else {
    const { data, error } = await db.from("menus").insert(payload).select("id").single();
    if (error) throw error;
    menuId = data.id;
  }

  const { error: removeError } = await db.from("menu_option_groups").delete().eq("menu_id", menuId);
  if (removeError) throw removeError;

  for (let index = 0; index < 2; index += 1) {
    const group = draft.groups[index];
    if (!group.name.trim() && group.options.length === 0) continue;
    if (!group.name.trim()) throw new Error(`옵션 ${index + 1} 그룹명을 입력해 주세요.`);
    const { data: groupRow, error: groupError } = await db.from("menu_option_groups")
      .insert({ menu_id: menuId, group_no: index + 1, name: group.name.trim(), is_required: group.is_required, sort_order: index })
      .select("id").single();
    if (groupError) throw groupError;
    const options = group.options.filter((option) => option.name.trim()).map((option, optionIndex) => ({
      group_id: groupRow.id,
      name: option.name.trim(),
      additional_price: option.additional_price,
      is_available: option.is_available,
      sort_order: optionIndex,
    }));
    if (options.length) {
      const { error } = await db.from("menu_options").insert(options);
      if (error) throw error;
    }
  }
}

export async function deleteMenu(menuId: string) {
  const { error } = await client().from("menus").delete().eq("id", menuId);
  if (error) throw error;
}

export async function setMenuAvailability(menuId: string, available: boolean) {
  const { error } = await client().from("menus").update({ is_available: available, updated_at: new Date().toISOString() }).eq("id", menuId);
  if (error) throw error;
}
