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

export interface DailyStats {
  orderCount: number;
  pendingCount: number;
  paidCount: number;
  paidSalesAmount: number;
  averagePaidAmount: number;
}

export interface DashboardData {
  recentOrders: DashboardOrder[];
  todayStats: DailyStats;
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
  const today = getBusinessDate(store.timezone || "Asia/Seoul");
  const selectFields = "id, order_number, order_type, table_name, customer_name, total_amount, order_status, payment_status, created_at, order_items(menu_name_snapshot, quantity)";

  const [recentResult, statsResult] = await Promise.all([
    supabase
      .from("orders")
      .select(selectFields)
      .eq("store_id", store.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("store_daily_order_stats")
      .select("order_count, pending_count, paid_count, paid_sales_amount, average_paid_amount")
      .eq("store_id", store.id)
      .eq("business_date", today)
      .maybeSingle(),
  ]);

  if (recentResult.error) throw recentResult.error;
  if (statsResult.error) throw statsResult.error;

  const recentRows = (recentResult.data ?? []) as unknown as OrderRow[];
  const stats = statsResult.data as {
    order_count: number;
    pending_count: number;
    paid_count: number;
    paid_sales_amount: number | string;
    average_paid_amount: number | string;
  } | null;

  return {
    recentOrders: recentRows.map((row) => mapOrder(row, store.timezone || "Asia/Seoul")),
    todayStats: {
      orderCount: Number(stats?.order_count ?? 0),
      pendingCount: Number(stats?.pending_count ?? 0),
      paidCount: Number(stats?.paid_count ?? 0),
      paidSalesAmount: Number(stats?.paid_sales_amount ?? 0),
      averagePaidAmount: Number(stats?.average_paid_amount ?? 0),
    },
  };
}
