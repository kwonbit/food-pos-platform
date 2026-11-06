import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, RefreshCw, Search, X } from "lucide-react";
import type { StoreSummary } from "./lib/dashboard";
import { fetchOrders, updateOrderStatus, updatePaymentStatus, type ManagedOrder, type OrderStatus, type PaymentStatus } from "./lib/orders";
import "./order-management.css";
import { supabase } from "./lib/supabase";

const statusLabels: Record<OrderStatus,string> = { PENDING:"접수대기", CONFIRMED:"주문확인", COOKING:"조리중", SERVED:"제공완료", CANCELLED:"주문취소" };
const paymentLabels: Record<PaymentStatus,string> = { UNPAID:"미결제", PARTIAL:"부분결제", PAID:"결제완료", REFUNDED:"환불", PARTIAL_REFUNDED:"부분환불" };
const typeLabels: Record<string,string> = { DINE_IN:"매장", TAKEOUT:"포장", DELIVERY:"배달", PHONE:"전화", QR:"QR" };
const money = (n:number) => new Intl.NumberFormat("ko-KR").format(n)+"원";
const dateTime = (v:string) => new Intl.DateTimeFormat("ko-KR",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(v));
const flow: OrderStatus[] = ["PENDING","CONFIRMED","COOKING","SERVED"];

export default function OrderManagement({store}:{store:StoreSummary}) {
  const [orders,setOrders] = useState<ManagedOrder[]>([]);
  const [filter,setFilter] = useState<"ALL"|OrderStatus>("ALL");
  const [query,setQuery] = useState("");
  const [selected,setSelected] = useState<string>("");
  const [busy,setBusy] = useState("");
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); try { setOrders(await fetchOrders(store)); setError(""); } catch(e) { setError(e instanceof Error?e.message:"주문을 불러오지 못했습니다."); } finally { setLoading(false); } },[store.id]);
  useEffect(()=>{ void load(); },[load]);
  useEffect(()=>{
    const client = supabase;
    if (!client) return;
    const channel = client.channel("orders-"+store.id)
      .on("postgres_changes",{event:"*",schema:"public",table:"orders",filter:"store_id=eq."+store.id},()=>{ void load(); })
      .subscribe();
    return ()=>{ void client.removeChannel(channel); };
  },[store.id,load]);
  const visible = useMemo(()=>orders.filter(o=>{
    const q=query.trim().toLowerCase();
    return (filter==="ALL"||o.order_status===filter) && (!q||[o.order_number,o.customer_name??"",o.customer_phone??"",o.table_name??"",o.delivery_address??"",...o.order_items.map(i=>i.menu_name_snapshot)].some(v=>v.toLowerCase().includes(q)));
  }),[orders,filter,query]);
  const current = orders.find(o=>o.id===selected) ?? null;
  const summary = useMemo(()=>({
    count:visible.length, amount:visible.filter(o=>o.order_status!=="CANCELLED").reduce((s,o)=>s+Number(o.total_amount),0),
    pending:visible.filter(o=>o.order_status==="PENDING").length, unpaid:visible.filter(o=>o.payment_status==="UNPAID"&&o.order_status!=="CANCELLED").length
  }),[visible]);
  async function changeStatus(order:ManagedOrder,status:OrderStatus) {
    setBusy(order.id); setError("");
    try { await updateOrderStatus(store,order.id,status); await load(); }
    catch(e){setError(e instanceof Error?e.message:"주문 상태 변경에 실패했습니다.");}
    finally{setBusy("");}
  }
  async function changePayment(order:ManagedOrder,status:PaymentStatus) {
    setBusy(order.id); setError("");
    try { await updatePaymentStatus(store,order.id,status); await load(); }
    catch(e){setError(e instanceof Error?e.message:"결제 상태 변경에 실패했습니다.");}
    finally{setBusy("");}
  }
  return <section className="orders-page">
    <div className="orders-title"><div><div className="eyebrow">STORE OPERATIONS</div><h1>주문 관리</h1><p>접수된 주문을 확인하고 조리 및 결제 상태를 관리합니다.</p></div><button className="orders-refresh" onClick={()=>void load()} disabled={loading}><RefreshCw size={15}/> 새로고침</button></div>
    {error&&<div className="orders-error" role="alert">{error}</div>}
    <div className="orders-summary"><div><span>조회 주문</span><strong>{summary.count}건</strong></div><div><span>접수대기</span><strong>{summary.pending}건</strong></div><div><span>미결제</span><strong>{summary.unpaid}건</strong></div><div><span>취소 제외 합계</span><strong>{money(summary.amount)}</strong></div></div>
    <div className="panel orders-panel"><div className="orders-toolbar"><div className="orders-filters">{(["ALL","PENDING","CONFIRMED","COOKING","SERVED","CANCELLED"] as const).map(s=><button key={s} className={filter===s?"active":""} onClick={()=>setFilter(s)}>{s==="ALL"?"전체":statusLabels[s]}</button>)}</div><label className="orders-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="주문번호, 고객, 전화번호, 주소 검색"/></label></div>
    <div className="orders-table-wrap"><table className="orders-table"><thead><tr><th>주문번호 / 접수시간</th><th>주문정보</th><th>유형</th><th>금액</th><th>주문상태</th><th>결제</th><th></th></tr></thead><tbody>
    {visible.map(o=><tr key={o.id} className={selected===o.id?"chosen":""} onClick={()=>setSelected(o.id)}><td><b>#{o.order_number}</b><small>{dateTime(o.created_at)}</small></td><td><strong>{o.customer_name||o.table_name||"고객"}</strong><small>{o.order_items.map(i=>i.menu_name_snapshot+" × "+i.quantity).join(" · ")}</small></td><td>{typeLabels[o.order_type]||o.order_type}</td><td className="orders-amount">{money(Number(o.total_amount))}</td><td><span className={"orders-status status-"+o.order_status.toLowerCase()}>{statusLabels[o.order_status]}</span></td><td><span className={"orders-payment payment-"+o.payment_status.toLowerCase()}>{paymentLabels[o.payment_status]}</span></td><td><button className="orders-detail-btn" onClick={e=>{e.stopPropagation();setSelected(o.id)}}>상세보기</button></td></tr>)}
    </tbody></table>{loading&&<div className="orders-empty">주문을 불러오는 중입니다...</div>}{!loading&&!visible.length&&<div className="orders-empty">조회된 주문이 없습니다.</div>}</div></div>
    {current&&<div className="orders-detail panel"><div className="orders-detail-head"><div><span>주문 상세</span><h2>#{current.order_number}</h2></div><button onClick={()=>setSelected("")} aria-label="상세 닫기"><X size={18}/></button></div>
      <div className="orders-detail-grid"><div><label>주문 유형</label><b>{typeLabels[current.order_type]||current.order_type}</b></div><div><label>접수 시간</label><b>{dateTime(current.created_at)}</b></div><div><label>고객명</label><b>{current.customer_name||"-"}</b></div><div><label>연락처</label><b>{current.customer_phone||"-"}</b></div>{current.table_name&&<div><label>테이블</label><b>{current.table_name}</b></div>}{current.delivery_address&&<div className="wide"><label>배달 주소</label><b>{current.delivery_address}</b></div>}{current.request_note&&<div className="wide"><label>요청사항</label><b>{current.request_note}</b></div>}</div>
      <div className="orders-line-items">{current.order_items.map(i=><div key={i.id}><span>{i.menu_name_snapshot} × {i.quantity}</span><b>{money(Number(i.line_total_amount))}</b></div>)}<div className="orders-grand"><strong>주문 합계</strong><strong>{money(Number(current.total_amount))}</strong></div></div>
      <div className="orders-actions"><div><label>주문 상태</label><div className="orders-action-buttons">{flow.map(s=><button key={s} disabled={busy===current.id||current.order_status==="CANCELLED"} className={current.order_status===s?"selected":""} onClick={()=>void changeStatus(current,s)}>{statusLabels[s]}</button>)}<button className="cancel" disabled={busy===current.id||current.order_status==="CANCELLED"||current.payment_status==="PAID"} onClick={()=>void changeStatus(current,"CANCELLED")}>주문취소</button></div></div><div><label>결제 상태</label><div className="orders-payment-actions">{(["UNPAID","PAID","REFUNDED"] as PaymentStatus[]).map(s=><button key={s} disabled={busy===current.id} className={current.payment_status===s?"selected":""} onClick={()=>void changePayment(current,s)}>{paymentLabels[s]}</button>)}</div></div></div>
      {busy===current.id&&<p className="orders-saving"><Check size={14}/> 저장 중...</p>}
    </div>}
  </section>;
}
