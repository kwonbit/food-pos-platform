import { supabase } from "./supabase";
import type { StoreSummary } from "./dashboard";

export interface PosOrderLine {
  menuId: string;
  menuName: string;
  optionText: string;
  quantity: number;
  unitPrice: number;
}

interface CreateOrderInput {
  orderType: "DINE_IN" | "TAKEOUT";
  tableName: string | null;
  customerName: string | null;
  requestNote: string | null;
  lines: PosOrderLine[];
}

function client() {
  if (!supabase) throw new Error("Supabase 연결이 설정되지 않았습니다.");
  return supabase;
}

function makeOrderNumber(timezone: string) {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "2-digit", month: "2-digit", day: "2-digit" }).format(new Date()).replaceAll("-", "");
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date()).replaceAll(":", "");
  const suffix = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).slice(0, 4).toUpperCase();
  return `P${date}-${time}-${suffix}`;
}

export async function createPosOrder(store: StoreSummary, input: CreateOrderInput): Promise<string> {
  const db = client();
  if (!input.lines.length) throw new Error("주문할 메뉴를 선택해 주세요.");
  const subtotal = input.lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  if (!Number.isSafeInteger(subtotal) || subtotal < 0) throw new Error("주문 금액을 확인해 주세요.");
  const orderNumber = makeOrderNumber(store.timezone || "Asia/Seoul");
  const { data: order, error: orderError } = await db.from("orders").insert({
    tenant_id: store.tenant_id,
    store_id: store.id,
    order_number: orderNumber,
    order_type: input.orderType,
    table_name: input.tableName,
    customer_name: input.customerName,
    request_note: input.requestNote,
    order_status: "PENDING",
    payment_status: "UNPAID",
    subtotal_amount: subtotal,
    discount_amount: 0,
    tax_amount: 0,
    total_amount: subtotal,
  }).select("id").single();
  if (orderError) throw orderError;

  const itemRows = input.lines.map((line) => ({
    order_id: order.id,
    menu_name_snapshot: line.optionText ? `${line.menuName} (${line.optionText})` : line.menuName,
    quantity: line.quantity,
    unit_price_snapshot: line.unitPrice,
    line_total_amount: line.unitPrice * line.quantity,
  }));
  const { error: itemError } = await db.from("order_items").insert(itemRows);
  if (itemError) {
    await db.from("orders").delete().eq("id", order.id).eq("store_id", store.id);
    throw itemError;
  }
  return orderNumber;
}
