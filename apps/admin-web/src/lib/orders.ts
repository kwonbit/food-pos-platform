import { supabase } from "./supabase";
import type { StoreSummary } from "./dashboard";

export type OrderStatus = "PENDING" | "CONFIRMED" | "COOKING" | "SERVED" | "CANCELLED";
export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID" | "REFUNDED" | "PARTIAL_REFUNDED";
export interface ManagedOrder {
  id: string; order_number: string; order_type: string; table_name: string | null;
  customer_name: string | null; customer_phone: string | null; delivery_address: string | null;
  request_note: string | null; order_status: OrderStatus; payment_status: PaymentStatus;
  total_amount: number; created_at: string;
  order_items: Array<{ id: string; menu_name_snapshot: string; quantity: number; unit_price_snapshot: number; line_total_amount: number }>;
}
function db() { if (!supabase) throw new Error("Supabase 연결이 설정되지 않았습니다."); return supabase; }
export async function fetchOrders(store: StoreSummary): Promise<ManagedOrder[]> {
  const { data, error } = await db().from("orders")
    .select("id,order_number,order_type,table_name,customer_name,customer_phone,delivery_address,request_note,order_status,payment_status,total_amount,created_at,order_items(id,menu_name_snapshot,quantity,unit_price_snapshot,line_total_amount)")
    .eq("store_id", store.id).order("created_at", { ascending: false }).limit(250);
  if (error) throw error;
  return (data ?? []) as unknown as ManagedOrder[];
}
export async function updateOrderStatus(store: StoreSummary, id: string, status: OrderStatus) {
  const { error } = await db().from("orders").update({ order_status: status, updated_at: new Date().toISOString() }).eq("id", id).eq("store_id", store.id);
  if (error) throw error;
}
export async function updatePaymentStatus(store: StoreSummary, id: string, status: PaymentStatus) {
  const { error } = await db().from("orders").update({ payment_status: status, updated_at: new Date().toISOString() }).eq("id", id).eq("store_id", store.id);
  if (error) throw error;
}
