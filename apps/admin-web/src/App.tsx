import { useMemo, useState, type ReactNode } from "react";
import {
  Activity, Bell, ChevronDown, ClipboardList, Clock3, CreditCard,
  LayoutDashboard, Menu, MoreHorizontal, Package, Search, Settings,
  ShoppingBag, Store, TrendingUp, Users, Utensils, Wallet,
} from "lucide-react";
import type { OrderStatus, OrderSummary } from "@food-pos/shared-types";
import { useAuth } from "./auth/AuthProvider";
import SignInForm from "./auth/SignInForm";

const initialOrders: OrderSummary[] = [
  { id: "1", orderNumber: "A-1048", orderType: "DINE_IN", tableName: "테이블 03", customerName: "김민수", itemSummary: "짜장면 2 · 탕수육(소) 1", totalAmount: 29000, status: "COOKING", paymentStatus: "UNPAID", createdAt: "14:32" },
  { id: "2", orderNumber: "A-1047", orderType: "TAKEOUT", customerName: "이서연", itemSummary: "짬뽕 1 · 군만두 1", totalAmount: 14000, status: "PENDING", paymentStatus: "UNPAID", createdAt: "14:29" },
  { id: "3", orderNumber: "A-1046", orderType: "DINE_IN", tableName: "테이블 01", customerName: "박지훈", itemSummary: "볶음밥 2", totalAmount: 18000, status: "CONFIRMED", paymentStatus: "UNPAID", createdAt: "14:25" },
  { id: "4", orderNumber: "A-1045", orderType: "DELIVERY", customerName: "최유진", itemSummary: "마파두부밥 1 · 짬뽕 1", totalAmount: 21000, status: "SERVED", paymentStatus: "PAID", createdAt: "14:18" },
  { id: "5", orderNumber: "A-1044", orderType: "DINE_IN", tableName: "테이블 05", customerName: "정우성", itemSummary: "탕수육(대) 1", totalAmount: 26000, status: "SERVED", paymentStatus: "PAID", createdAt: "14:11" },
];

const statusText: Record<OrderStatus, string> = {
  PENDING: "접수대기", CONFIRMED: "주문확인", COOKING: "조리중",
  SERVED: "제공완료", CANCELLED: "주문취소",
};
const money = (value: number) => new Intl.NumberFormat("ko-KR").format(value) + "원";

export default function App() {
  const { isConfigured, isLoading, session } = useAuth();

  if (isConfigured && isLoading) {
    return <main className="auth-loading">인증 세션을 확인하고 있습니다...</main>;
  }

  if (isConfigured && !session) {
    return <SignInForm />;
  }

  return <Dashboard demoMode={!isConfigured} />;
}

function Dashboard({ demoMode }: { demoMode: boolean }) {
  const { user, signOut } = useAuth();
  const [authError, setAuthError] = useState("");
  const [orders, setOrders] = useState(initialOrders);
  const [filter, setFilter] = useState<"ALL" | OrderStatus>("ALL");
  const [query, setQuery] = useState("");
  const [activeNav, setActiveNav] = useState("대시보드");
  const [mobileNav, setMobileNav] = useState(false);

  const filteredOrders = useMemo(() => orders.filter((order) => {
    const matchesStatus = filter === "ALL" || order.status === filter;
    const search = query.trim().toLowerCase();
    const matchesQuery = !search || [order.orderNumber, order.customerName, order.tableName ?? "", order.itemSummary]
      .some((value) => value.toLowerCase().includes(search));
    return matchesStatus && matchesQuery;
  }), [orders, filter, query]);

  const updateStatus = (id: string, status: OrderStatus) => {
    setOrders((current) => current.map((order) => order.id === id ? { ...order, status } : order));
  };

  const navItems = [
    { label: "대시보드", icon: LayoutDashboard },
    { label: "주문 관리", icon: ClipboardList, count: 3 },
    { label: "메뉴 관리", icon: Utensils },
    { label: "테이블 관리", icon: Store },
    { label: "직원 관리", icon: Users },
    { label: "매출 · 정산", icon: Wallet },
    { label: "재고 관리", icon: Package },
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand"><div className="brand-mark"><Utensils size={20} /></div><div><strong>food<span>pos</span></strong><small>STORE MANAGEMENT</small></div></div>
        <div className="store-switch"><div className="store-avatar">한</div><div className="store-copy"><strong>한빛 중화요리</strong><small>대표 매장 · 대구</small></div><ChevronDown size={16} /></div>
        <div className="nav-label">WORKSPACE</div>
        <nav>{navItems.map(({ label, icon: Icon, count }) => <button key={label} className={`nav-item ${activeNav === label ? "active" : ""}`} onClick={() => { setActiveNav(label); setMobileNav(false); }}><Icon size={18} /><span>{label}</span>{count && <em>{count}</em>}</button>)}</nav>
        <div className="sidebar-bottom"><div className="nav-label">SYSTEM</div><button className="nav-item" onClick={() => setActiveNav("설정")}><Settings size={18} /><span>설정</span></button><div className="help-card"><div className="help-icon"><Activity size={17} /></div><strong>운영 상태 양호</strong><p>모든 서비스가 정상적으로 작동 중입니다.</p><span><i /> 시스템 연결됨</span></div><div className="profile"><div className="profile-avatar">관</div><div><strong>매장 관리자</strong><small>{user?.email ?? "데모 계정 미연결"}</small></div><MoreHorizontal size={19} /></div></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="메뉴 열기"><Menu size={20} /></button><div className="breadcrumb">매장 운영 <span>/</span> <strong>{activeNav}</strong></div><div className="top-actions"><div className="connection"><i /> {demoMode ? "데모 모드" : "인증 연결됨"}</div><button className="icon-button notification" aria-label="알림"><Bell size={19} /><b /></button><div className="top-divider" /><div className="today">2026년 11월 6일 <ChevronDown size={14} /></div>{!demoMode && <button className="signout-button" onClick={async () => { const message = await signOut(); setAuthError(message ?? ""); }}>로그아웃</button>}</div></header>

        <div className="page-wrap">
          {demoMode && <div className="demo-notice"><strong>Supabase 미설정 · 데모 모드</strong><span>현재 화면은 샘플 데이터입니다. .env.local 또는 Cloudflare 환경 변수에 Supabase URL과 anon key를 설정하면 로그인 화면이 활성화됩니다.</span></div>}
          {authError && <div className="auth-inline-error" role="alert">{authError}</div>}
          <section className="welcome-row"><div><div className="eyebrow">FRIDAY, NOVEMBER 06, 2026</div><h1>안녕하세요, 매장 관리자님 <span>👋</span></h1><p>오늘 매장 운영 현황을 한눈에 확인하세요.</p></div><button className="primary-button" onClick={() => { setFilter("ALL"); setQuery(""); }}><Activity size={16} /> 현황 새로고침</button></section>

          <section className="stats-grid">
            <StatCard label="오늘 매출" value="₩ 1,284,000" change="+12.8%" note="지난주 같은 요일 대비" icon={<Wallet />} tone="violet" />
            <StatCard label="오늘 주문" value="48건" change="+8.2%" note="지난주 같은 요일 대비" icon={<ShoppingBag />} tone="blue" />
            <StatCard label="처리 대기" value="3건" change="확인 필요" note="접수 및 조리 진행 중" icon={<Clock3 />} tone="orange" />
            <StatCard label="평균 주문 금액" value="₩ 26,750" change="+4.6%" note="오늘 주문 기준" icon={<TrendingUp />} tone="green" />
          </section>

          <section className="content-grid">
            <div className="panel order-panel">
              <div className="panel-heading"><div><h2>최근 주문</h2><p>매장에 접수된 최신 주문을 확인하고 관리하세요.</p></div><button className="text-button" onClick={() => setActiveNav("주문 관리")}>전체 주문 보기 <span>→</span></button></div>
              <div className="toolbar"><div className="filter-tabs">{(["ALL", "PENDING", "CONFIRMED", "COOKING", "SERVED"] as const).map((item) => <button key={item} className={filter === item ? "selected" : ""} onClick={() => setFilter(item)}>{item === "ALL" ? "전체" : statusText[item]}</button>)}</div><label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="주문·고객 검색" /></label></div>
              <div className="table-scroll"><table><thead><tr><th>주문번호</th><th>주문 정보</th><th>주문 유형</th><th>금액</th><th>상태</th><th>접수 시간</th><th /></tr></thead><tbody>{filteredOrders.map((order) => <tr key={order.id}><td><strong className="order-no">#{order.orderNumber}</strong></td><td><strong>{order.customerName}</strong><small className="subline">{order.tableName ? order.tableName + " · " : ""}{order.itemSummary}</small></td><td><span className="type-pill">{({ DINE_IN: "매장", TAKEOUT: "포장", DELIVERY: "배달", PHONE: "전화", QR: "QR" })[order.orderType]}</span></td><td className="amount">{money(order.totalAmount)}</td><td><StatusPill status={order.status} /></td><td className="time-cell">{order.createdAt}</td><td><select aria-label={`${order.orderNumber} 상태 변경`} value={order.status} onChange={(event) => updateStatus(order.id, event.target.value as OrderStatus)}><option value="PENDING">접수대기</option><option value="CONFIRMED">주문확인</option><option value="COOKING">조리중</option><option value="SERVED">제공완료</option><option value="CANCELLED">주문취소</option></select></td></tr>)}</tbody></table>{filteredOrders.length === 0 && <div className="empty-state">검색 결과가 없습니다.</div>}</div>
              <div className="panel-foot"><span>총 <strong>{filteredOrders.length}</strong>건의 주문</span><span>샘플 데이터 · 실제 주문 연동 전</span></div>
            </div>

            <div className="right-column">
              <div className="panel quick-panel"><div className="panel-heading"><div><h2>빠른 메뉴</h2><p>자주 사용하는 기능으로 이동합니다.</p></div></div><div className="quick-grid"><QuickAction icon={<ClipboardList />} label="주문 관리" onClick={() => setActiveNav("주문 관리")} /><QuickAction icon={<Utensils />} label="메뉴 등록" onClick={() => setActiveNav("메뉴 관리")} /><QuickAction icon={<CreditCard />} label="매출 정산" onClick={() => setActiveNav("매출 · 정산")} /><QuickAction icon={<Users />} label="직원 관리" onClick={() => setActiveNav("직원 관리")} /></div></div>
              <div className="panel status-panel"><div className="panel-heading"><div><h2>주문 처리 현황</h2><p>현재 주문 상태별 건수</p></div><span className="live-label"><i /> LIVE</span></div><div className="status-list">{(["PENDING", "CONFIRMED", "COOKING", "SERVED"] as OrderStatus[]).map((status) => { const count = orders.filter((order) => order.status === status).length; return <div className="status-row" key={status}><span><StatusPill status={status} /></span><strong>{count}건</strong></div>; })}</div><div className="status-total"><span>전체 주문</span><strong>{orders.length}건</strong></div></div>
            </div>
          </section>
          <footer className="footer"><span>© 2026 Food POS Platform</span><span>버전 0.1.0 · 관리자 웹 미리보기</span></footer>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, change, note, icon, tone }: { label: string; value: string; change: string; note: string; icon: ReactNode; tone: string }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><div className={`stat-icon ${tone}`}>{icon}</div></div><strong className="stat-value">{value}</strong><div className="stat-bottom"><b className={tone === "orange" ? "neutral-change" : ""}>{change}</b><span>{note}</span></div></div>;
}
function StatusPill({ status }: { status: OrderStatus }) {
  return <span className={`status-pill status-${status.toLowerCase()}`}><i />{statusText[status]}</span>;
}
function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button className="quick-action" onClick={onClick}><span>{icon}</span><strong>{label}</strong></button>;
}
