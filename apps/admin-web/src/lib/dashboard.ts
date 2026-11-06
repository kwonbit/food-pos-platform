import { supabase } from "./supabase";

export interface StoreSummary {
  id: string;
  tenant_id: string;
  name: string;
  timezone: string;
}

export interface DashboardOrder {
  id: string;
  orderNumber: string;
  orderType: "DINE_IN" | "TAKEOUT" | "DELIVERY" | "PHONE" | "QR";
  tableName?: string | null;
  customerName: string;
  itemSummary: string;
  totalAmount: number;
  status: "PENDING" | "CONFIRMED" | "COOKING" | "SERVED" | "CANCELLED";
  paymentStatus: "UNPAID" | "PARTIAL" | "PAID" | "REFUNDED" | "PARTIAL_REFUNDED";
  createdAt: string;
}

interface OrderRow {
  id: string;
  order_number: string;
  order_type: DashboardOrder["orderType"];
  table_name: string | null;
  customer_name: string | null;
  total_amount: number;
  order_status: DashboardOrder["status"];
  payment_status: DashboardOrder["paymentStatus"];
  created_at: string;
  order_items: Array<{ menu_name_snapshot: string; quantity: number | string }> | null;
}

export interface DashboardData {
  recentOrders: DashboardOrder[];
  todayOrders: Array<Pick<DashboardOrder, "status" | "paymentStatus" | "totalAmount">>;
}

function getBusinessDate(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function mapOrder(row: OrderRow, timezone: string): DashboardOrder {
  const itemSummary = (row.order_items ?? [])
    .map((item) => `${item.menu_name_snapshot} ${Number(item.quantity).toLocaleString("ko-KR")}`)
    .join(" · ");
  return {
    id: row.id,
    orderNumber: row.order_number,
    orderType: row.order_type,
    tableName: row.table_name,
    customerName: row.customer_name?.trim() || "고객",
    itemSummary: itemSummary || "주문 상세 없음",
    totalAmount: Number(row.total_amount),
    status: row.order_status,
    paymentStatus: row.payment_status,
    createdAt: new Intl.DateTimeFormat("ko-KR", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(row.created_at)),
  };
}

export async function fetchStores(): Promise<StoreSummary[]> {
  if (!supabase) throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
  const { data, error } = await supabase
    .from("stores")
    .select("id, tenant_id, name, timezone")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return (data ?? []) as StoreSummary[];
}

export async function fetchDashboardData(store: StoreSummary): Promise<DashboardData> {
  if (!supabase) throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
  const selectFields = "id, order_number, order_type, table_name, customer_name, total_amount, order_status, payment_status, created_at, order_items(menu_name_snapshot, quantity)";
  const today = getBusinessDate(store.timezone || "Asia/Seoul");

  const [recentResult, todayResult] = await Promise.all([
    supabase
      .from("orders")
      .select(selectFields)
      .eq("store_id", store.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("orders")
      .select("order_status, payment_status, total_amount")
      .eq("store_id", store.id)
      .eq("business_date", today)
      .limit(2000),
  ]);

  if (recentResult.error) throw recentResult.error;
  if (todayResult.error) throw todayResult.error;

  const recentRows = (recentResult.data ?? []) as unknown as OrderRow[];
  const todayRows = (todayResult.data ?? []) as Array<{
    order_status: DashboardOrder["status"];
    payment_status: DashboardOrder["paymentStatus"];
    total_amount: number;
  }>;

  return {
    recentOrders: recentRows.map((row) => mapOrder(row, store.timezone || "Asia/Seoul")),
    todayOrders: todayRows.map((row) => ({
      status: row.order_status,
      paymentStatus: row.payment_status,
      totalAmount: Number(row.total_amount),
    })),
  };
}
