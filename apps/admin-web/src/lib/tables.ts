import { supabase } from "./supabase";
import type { StoreSummary } from "./dashboard";

export interface StoreTable {
  id: string;
  tenant_id: string;
  store_id: string;
  name: string;
  area: string;
  capacity: number;
  sort_order: number;
  is_active: boolean;
}

function client() {
  if (!supabase) throw new Error("Supabase 연결이 설정되지 않았습니다.");
  return supabase;
}

export async function fetchStoreTables(storeId: string, activeOnly = false): Promise<StoreTable[]> {
  let query = client().from("store_tables").select("id, tenant_id, store_id, name, area, capacity, sort_order, is_active")
    .eq("store_id", storeId).order("sort_order").order("name");
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as StoreTable[];
}

export async function saveStoreTable(
  store: StoreSummary,
  input: { id?: string; name: string; area: string; capacity: number; sort_order: number; is_active: boolean },
) {
  const db = client();
  const values = {
    tenant_id: store.tenant_id, store_id: store.id, name: input.name.trim(),
    area: input.area.trim() || "홀", capacity: input.capacity, sort_order: input.sort_order,
    is_active: input.is_active, updated_at: new Date().toISOString(),
  };
  const result = input.id
    ? await db.from("store_tables").update(values).eq("id", input.id).eq("store_id", store.id)
    : await db.from("store_tables").insert(values);
  if (result.error) throw result.error;
}

export async function setStoreTableActive(storeId: string, tableId: string, isActive: boolean) {
  const { error } = await client().from("store_tables")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", tableId).eq("store_id", storeId);
  if (error) throw error;
}
