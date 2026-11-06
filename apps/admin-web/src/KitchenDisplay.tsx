import { useCallback, useEffect, useMemo, useState } from "react";
import { ChefHat, Clock3, RefreshCw, Utensils } from "lucide-react";
import type { StoreSummary } from "./lib/dashboard";
import { supabase } from "./lib/supabase";
import "./kitchen-display.css";

type KitchenStatus = "PENDING" | "CONFIRMED" | "COOKING" | "SERVED";
type KitchenOrder = {
  id: string;
  order_number: string;
  order_type: string;
  table_name: string | null;
  customer_name: string | null;
  request_note: string | null;
  order_status: KitchenStatus;
  created_at: string;
  order_items: Array<{ id: string; menu_name_snapshot: string; quantity: number | string }> | null;
};

const statusLabels: Record<KitchenStatus, string> = {
  PENDING: "접수대기",
  CONFIRMED: "주문확인",
  COOKING: "조리중",
  SERVED: "제공완료",
};
const typeLabels: Record<string, string> = {
  DINE_IN: "매장",
  TAKEOUT: "포장",
  DELIVERY: "배달",
  PHONE: "전화",
  QR: "QR",
};
const nextStatus: Partial<Record<KitchenStatus, KitchenStatus>> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "COOKING",
  COOKING: "SERVED",
};
const moneylessQuantity = (value: number | string) => Number(value).toLocaleString("ko-KR");

function elapsedLabel(createdAt: string, now: number) {
  const minutes = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60000));
  if (minutes < 1) return "방금 접수";
  if (minutes < 60) return `${minutes}분 경과`;
  return `${Math.floor(minutes / 60)}시간 ${minutes % 60}분 경과`;
}

export default function KitchenDisplay({ store }: { store: StoreSummary }) {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [showCompleted, setShowCompleted] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) {
      setError("Supabase 연결이 설정되지 않았습니다.");
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from("orders")
      .select("id,order_number,order_type,table_name,customer_name,request_note,order_status,created_at,order_items(id,menu_name_snapshot,quantity)")
      .eq("store_id", store.id)
      .in("order_status", showCompleted ? ["PENDING", "CONFIRMED", "COOKING", "SERVED"] : ["PENDING", "CONFIRMED", "COOKING"])
      .order("created_at", { ascending: true })
      .limit(150);
    if (queryError) {
      setError(queryError.message);
    } else {
      setOrders((data ?? []) as unknown as KitchenOrder[]);
      setError("");
    }
    setLoading(false);
  }, [store.id, showCompleted]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    // POS creates the order row first and its order_items rows immediately after.
    // The orders INSERT event can arrive between those two writes, so defer the
    // first read and retry once to ensure the nested order_items relation is present.
    const refreshTimers: number[] = [];
    const scheduleRefresh = () => {
      refreshTimers.push(window.setTimeout(() => { void load(); }, 400));
      refreshTimers.push(window.setTimeout(() => { void load(); }, 1200));
    };
    const channel = client
      .channel("kitchen-orders-" + store.id)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "orders",
        filter: "store_id=eq." + store.id,
      }, scheduleRefresh)
      .subscribe();
    return () => {
      refreshTimers.forEach((timer) => window.clearTimeout(timer));
      void client.removeChannel(channel);
    };
  }, [store.id, load]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const counts = useMemo(() => ({
    pending: orders.filter((order) => order.order_status === "PENDING").length,
    confirmed: orders.filter((order) => order.order_status === "CONFIRMED").length,
    cooking: orders.filter((order) => order.order_status === "COOKING").length,
    served: orders.filter((order) => order.order_status === "SERVED").length,
  }), [orders]);

  async function advance(order: KitchenOrder) {
    const status = nextStatus[order.order_status];
    if (!status || !supabase) return;
    setBusyId(order.id);
    setError("");
    const { error: updateError } = await supabase
      .from("orders")
      .update({ order_status: status, updated_at: new Date().toISOString() })
      .eq("id", order.id)
      .eq("store_id", store.id);
    if (updateError) setError(updateError.message);
    else await load();
    setBusyId("");
  }

  return (
    <section className="kitchen-page">
      <div className="kitchen-heading">
        <div>
          <div className="eyebrow">KITCHEN OPERATIONS</div>
          <h1><ChefHat size={25} /> 주방 디스플레이</h1>
          <p>새 주문을 확인하고 조리 진행 상태를 관리합니다.</p>
        </div>
        <div className="kitchen-heading-actions">
          <label className="kitchen-completed-toggle">
            <input type="checkbox" checked={showCompleted} onChange={(event) => setShowCompleted(event.target.checked)} />
            제공완료 포함
          </label>
          <button className="kitchen-refresh" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> 새로고침</button>
        </div>
      </div>

      <div className="kitchen-counts">
        <div className="kitchen-count pending"><span>접수대기</span><strong>{counts.pending}</strong><small>새 주문</small></div>
        <div className="kitchen-count confirmed"><span>주문확인</span><strong>{counts.confirmed}</strong><small>조리 준비</small></div>
        <div className="kitchen-count cooking"><span>조리중</span><strong>{counts.cooking}</strong><small>조리 진행</small></div>
        {showCompleted && <div className="kitchen-count served"><span>제공완료</span><strong>{counts.served}</strong><small>완료 주문</small></div>}
      </div>

      {error && <div className="kitchen-error" role="alert">{error}</div>}
      {loading && <div className="kitchen-empty">주문을 불러오는 중입니다...</div>}
      {!loading && orders.length === 0 && <div className="kitchen-empty"><ChefHat size={30} /><strong>현재 처리할 주문이 없습니다.</strong><span>새 주문이 접수되면 이 화면에 자동으로 표시됩니다.</span></div>}

      <div className="kitchen-columns">
        {(["PENDING", "CONFIRMED", "COOKING", ...(showCompleted ? ["SERVED"] : [])] as KitchenStatus[]).map((status) => {
          const rows = orders.filter((order) => order.order_status === status);
          return (
            <section className={`kitchen-column column-${status.toLowerCase()}`} key={status}>
              <header><div><i /><strong>{statusLabels[status]}</strong></div><span>{rows.length}건</span></header>
              <div className="kitchen-card-list">
                {rows.map((order) => (
                  <article className="kitchen-order-card" key={order.id}>
                    <div className="kitchen-card-top">
                      <strong>#{order.order_number}</strong>
                      <span className="kitchen-elapsed"><Clock3 size={12} /> {elapsedLabel(order.created_at, now)}</span>
                    </div>
                    <div className="kitchen-order-meta">
                      <b>{order.table_name || typeLabels[order.order_type] || order.order_type}</b>
                      <span>{typeLabels[order.order_type] || order.order_type}</span>
                    </div>
                    {order.customer_name && <div className="kitchen-customer">{order.customer_name}</div>}
                    <div className="kitchen-items">
                      {(order.order_items ?? []).map((item) => (
                        <div key={item.id}><span>{item.menu_name_snapshot}</span><strong>× {moneylessQuantity(item.quantity)}</strong></div>
                      ))}
                    </div>
                    {order.request_note && <div className="kitchen-note"><b>요청사항</b><span>{order.request_note}</span></div>}
                    {nextStatus[status] && <button className="kitchen-next-button" disabled={busyId === order.id} onClick={() => void advance(order)}>
                      {busyId === order.id ? "변경 중..." : status === "PENDING" ? "주문 확인" : status === "CONFIRMED" ? "조리 시작" : "제공 완료"}
                    </button>}
                    {status === "SERVED" && <div className="kitchen-done"><Utensils size={14} /> 제공 완료</div>}
                  </article>
                ))}
                {rows.length === 0 && <div className="kitchen-column-empty">주문 없음</div>}
              </div>
            </section>
          );
        })}
      </div>
      <div className="kitchen-live-note"><i /> 실시간 주문 동기화 사용 중 · 화면이 열려 있는 동안 새 주문과 상태 변경이 자동 반영됩니다.</div>
    </section>
  );
}
