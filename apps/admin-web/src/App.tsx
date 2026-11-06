import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity, Bell, ChevronDown, ClipboardList, Clock3, CreditCard,
  LayoutDashboard, Menu, MoreHorizontal, Package, Search, Settings,
  ShoppingBag, Store, TrendingUp, Users, Utensils, Wallet, RefreshCw,
} from "lucide-react";
import type { OrderStatus } from "@food-pos/shared-types";
import { useAuth } from "./auth/AuthProvider";
import SignInForm from "./auth/SignInForm";
import MenuManagement from "./MenuManagement";
import { fetchDashboardData, fetchStores, type DashboardOrder, type StoreSummary } from "./lib/dashboard";

const statusText: Record<OrderStatus, string> = {
  PENDING: "접수대기", CONFIRMED: "주문확인", COOKING: "조리중",
  SERVED: "제공완료", CANCELLED: "주문취소",
};
const money = (value: number) => new Intl.NumberFormat("ko-KR").format(value) + "원";

export default function App() {
  const { isConfigured, isLoading, session } = useAuth();
  if (isConfigured && isLoading) return <main className="auth-loading">인증 세션을 확인하고 있습니다...</main>;
  if (isConfigured && !session) return <SignInForm />;
  return <Dashboard demoMode={!isConfigured} />;
}

function Dashboard({ demoMode }: { demoMode: boolean }) {
  const { user, signOut } = useAuth();
  const [authError, setAuthError] = useState("");
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [todayStats, setTodayStats] = useState({ orderCount: 0, pendingCount: 0, paidCount: 0, paidSalesAmount: 0, averagePaidAmount: 0, confirmedCount: 0, cookingCount: 0, servedCount: 0 });
  const [filter, setFilter] = useState<"ALL" | OrderStatus>("ALL");
  const [query, setQuery] = useState("");
  const [activeNav, setActiveNav] = useState("대시보드");
  const [mobileNav, setMobileNav] = useState(false);
  const [loadingStores, setLoadingStores] = useState(!demoMode);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [demoOrders] = useState<DashboardOrder[]>([
    { id: "1", orderNumber: "A-1048", orderType: "DINE_IN", tableName: "테이블 03", customerName: "김민수", itemSummary: "짜장면 2 · 탕수육(소) 1", totalAmount: 29000, status: "COOKING", paymentStatus: "UNPAID", createdAt: "14:32" },
    { id: "2", orderNumber: "A-1047", orderType: "TAKEOUT", customerName: "이서연", itemSummary: "짬뽕 1 · 군만두 1", totalAmount: 14000, status: "PENDING", paymentStatus: "UNPAID", createdAt: "14:29" },
    { id: "3", orderNumber: "A-1046", orderType: "DINE_IN", tableName: "테이블 01", customerName: "박지훈", itemSummary: "볶음밥 2", totalAmount: 18000, status: "CONFIRMED", paymentStatus: "UNPAID", createdAt: "14:25" },
    { id: "4", orderNumber: "A-1045", orderType: "DELIVERY", customerName: "최유진", itemSummary: "마파두부밥 1 · 짬뽕 1", totalAmount: 21000, status: "SERVED", paymentStatus: "PAID", createdAt: "14:18" },
    { id: "5", orderNumber: "A-1044", orderType: "DINE_IN", tableName: "테이블 05", customerName: "정우성", itemSummary: "탕수육(대) 1", totalAmount: 26000, status: "SERVED", paymentStatus: "PAID", createdAt: "14:11" },
  ]);

  useEffect(() => {
    if (demoMode) return;
    let active = true;
    setLoadingStores(true);
    fetchStores()
      .then((result) => {
        if (!active) return;
        setStores(result);
        setSelectedStoreId((current) => current || result[0]?.id || "");
        setDataError("");
      })
      .catch((error: unknown) => {
        if (active) setDataError(error instanceof Error ? error.message : "매장 정보를 불러오지 못했습니다.");
      })
      .finally(() => { if (active) setLoadingStores(false); });
    return () => { active = false; };
  }, [demoMode]);

  const selectedStore = stores.find((store) => store.id === selectedStoreId) ?? null;

  useEffect(() => {
    if (demoMode || !selectedStore) return;
    let active = true;
    setLoadingData(true);
    fetchDashboardData(selectedStore)
      .then((result) => {
        if (!active) return;
        setOrders(result.recentOrders);
        setTodayStats(result.todayStats);
        setDataError("");
      })
      .catch((error: unknown) => {
        if (active) setDataError(error instanceof Error ? error.message : "주문 현황을 불러오지 못했습니다.");
      })
      .finally(() => { if (active) setLoadingData(false); });
    return () => { active = false; };
  }, [demoMode, selectedStoreId, refreshKey]);

  const visibleOrders = demoMode ? demoOrders : orders;
  const filteredOrders = useMemo(() => visibleOrders.filter((order) => {
    const matchesStatus = filter === "ALL" || order.status === filter;
    const search = query.trim().toLowerCase();
    const matchesQuery = !search || [order.orderNumber, order.customerName, order.tableName ?? "", order.itemSummary]
      .some((value) => value.toLowerCase().includes(search));
    return matchesStatus && matchesQuery;
  }), [visibleOrders, filter, query]);

  const metrics = demoMode
    ? (() => {
        const valid = demoOrders.filter((row) => row.status !== "CANCELLED");
        const paid = valid.filter((row) => row.paymentStatus === "PAID");
        const sales = paid.reduce((sum, row) => sum + row.totalAmount, 0);
        return {
          sales,
          orderCount: valid.length,
          pendingCount: valid.filter((row) => ["PENDING", "CONFIRMED", "COOKING"].includes(row.status)).length,
          average: paid.length ? Math.round(sales / paid.length) : 0,
          paidCount: paid.length,
        };
      })()
    : {
        sales: todayStats.paidSalesAmount,
        orderCount: todayStats.orderCount,
        pendingCount: todayStats.pendingCount,
        average: todayStats.averagePaidAmount,
        paidCount: todayStats.paidCount,
      };

  const navItems = [
    { label: "대시보드", icon: LayoutDashboard },
    { label: "주문 관리", icon: ClipboardList, count: metrics.pendingCount },
    { label: "메뉴 관리", icon: Utensils },
    { label: "테이블 관리", icon: Store },
    { label: "직원 관리", icon: Users },
    { label: "매출 · 정산", icon: Wallet },
    { label: "재고 관리", icon: Package },
  ];

  const noStore = !demoMode && !loadingStores && stores.length === 0;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand"><div className="brand-mark"><Utensils size={20} /></div><div><strong>food<span>pos</span></strong><small>STORE MANAGEMENT</small></div></div>
        <div className="store-switch"><div className="store-avatar">매</div><div className="store-copy"><strong>{demoMode ? "데모 매장" : selectedStore?.name ?? "매장 미등록"}</strong><small>{demoMode ? "미리보기" : selectedStore ? "연결된 매장" : "매장 권한 확인 필요"}</small></div><ChevronDown size={16} /></div>
        <div className="nav-label">WORKSPACE</div>
        <nav>{navItems.map(({ label, icon: Icon, count }) => <button key={label} className={`nav-item ${activeNav === label ? "active" : ""}`} onClick={() => { setActiveNav(label); setMobileNav(false); }}><Icon size={18} /><span>{label}</span>{count ? <em>{count}</em> : null}</button>)}</nav>
        <div className="sidebar-bottom"><div className="nav-label">SYSTEM</div><button className="nav-item" onClick={() => setActiveNav("설정")}><Settings size={18} /><span>설정</span></button><div className="help-card"><div className="help-icon"><Activity size={17} /></div><strong>{demoMode ? "데모 화면" : dataError ? "연결 확인 필요" : "데이터 연결"}</strong><p>{demoMode ? "표시되는 주문은 예시 데이터입니다." : "매장별 권한으로 데이터를 조회합니다."}</p><span><i /> {demoMode ? "샘플 데이터" : "Supabase"}</span></div><div className="profile"><div className="profile-avatar">관</div><div><strong>매장 관리자</strong><small>{user?.email ?? "데모 계정 미연결"}</small></div><MoreHorizontal size={19} /></div></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="메뉴 열기"><Menu size={20} /></button><div className="breadcrumb">매장 운영 <span>/</span> <strong>{activeNav}</strong></div><div className="top-actions"><div className={`connection ${demoMode ? "demo-connection" : ""}`}><i /> {demoMode ? "데모 모드" : "Supabase 연결됨"}</div><button className="icon-button notification" aria-label="알림"><Bell size={19} /><b /></button><button className="icon-button" aria-label="새로고침" onClick={() => setRefreshKey((value) => value + 1)} disabled={loadingData}><RefreshCw size={17} /></button><div className="top-divider" /><div className="today">{new Intl.DateTimeFormat("ko-KR", { dateStyle: "long", timeZone: selectedStore?.timezone || "Asia/Seoul" }).format(new Date())}</div>{!demoMode && <button className="signout-button" onClick={async () => { const message = await signOut(); setAuthError(message ?? ""); }}>로그아웃</button>}</div></header>

        <div className="page-wrap">
          {activeNav === "메뉴 관리" ? (selectedStore ? <MenuManagement store={selectedStore} /> : <section className="panel onboarding-panel"><div className="onboarding-icon"><Utensils size={22} /></div><h2>메뉴 관리를 시작할 수 없습니다.</h2><p>{demoMode ? "현재 Preview 배포가 데모 모드로 실행 중입니다. Cloudflare Pages의 Preview 환경 변수에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 Production과 동일하게 등록한 뒤 다시 배포해 주세요." : loadingStores ? "매장 정보를 불러오고 있습니다..." : dataError ? dataError : "로그인 계정에 연결된 활성 매장을 찾지 못했습니다. 더짬뽕47 매장 멤버십과 권한을 확인해 주세요."}</p></section>) : <>
          {demoMode && <div className="demo-notice"><strong>데모 모드</strong><span>현재 주문과 매출은 예시 데이터입니다. Supabase 환경 변수를 설정하면 로그인 후 실제 매장 데이터를 조회합니다.</span></div>}
          {authError && <div className="auth-inline-error" role="alert">{authError}</div>}
          {dataError && <div className="data-error" role="alert"><strong>데이터 조회 오류</strong><span>{dataError}</span><small>Supabase Data API의 public 스키마 노출 설정과 관리자 매장 권한을 확인해 주세요.</small></div>}
          <section className="welcome-row"><div><div className="eyebrow">STORE MANAGEMENT</div><h1>안녕하세요, 매장 관리자님 <span>👋</span></h1><p>오늘 매장 운영 현황을 한눈에 확인하세요.</p></div>{!demoMode && stores.length > 1 && <select className="store-select" value={selectedStoreId} onChange={(event) => setSelectedStoreId(event.target.value)}>{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select>}</section>

          {noStore && <section className="panel onboarding-panel"><div className="onboarding-icon"><Store size={22} /></div><h2>연결된 매장이 없습니다.</h2><p>로그인 계정에 매장 멤버십을 등록하면 이 화면에 실제 주문과 매출이 표시됩니다.</p><ol><li>Supabase Authentication에서 관리자 계정의 User UID를 확인합니다.</li><li>public.tenants와 public.stores에 조직과 매장을 등록합니다.</li><li>public.store_memberships에 해당 UID와 매장 ID를 연결합니다.</li></ol><span>매장 멤버십이 등록되면 새로고침 후 자동으로 매장이 표시됩니다.</span></section>}

          {!noStore && <>
            <section className="stats-grid">
              <StatCard label="오늘 매출" value={money(metrics.sales)} change={demoMode ? "샘플" : "결제완료 기준"} note={demoMode ? "데모 데이터" : `결제완료 ${metrics.paidCount}건`} icon={<Wallet />} tone="violet" />
              <StatCard label="오늘 주문" value={`${metrics.orderCount}건`} change={demoMode ? "샘플" : "취소 제외"} note={demoMode ? "데모 데이터" : "영업일 기준 주문"} icon={<ShoppingBag />} tone="blue" />
              <StatCard label="처리 대기" value={`${metrics.pendingCount}건`} change="확인 필요" note="접수 및 조리 진행 중" icon={<Clock3 />} tone="orange" />
              <StatCard label="평균 결제 금액" value={money(metrics.average)} change="결제완료 기준" note={`${metrics.paidCount}건 기준`} icon={<TrendingUp />} tone="green" />
            </section>

            <section className="content-grid">
              <div className="panel order-panel">
                <div className="panel-heading"><div><h2>최근 주문</h2><p>{demoMode ? "화면 확인용 예시 주문입니다." : "선택한 매장에 접수된 실제 주문입니다."}</p></div><button className="text-button" onClick={() => { setActiveNav("주문 관리"); setFilter("ALL"); }}>전체 주문 보기 <span>→</span></button></div>
                <div className="toolbar"><div className="filter-tabs">{(["ALL", "PENDING", "CONFIRMED", "COOKING", "SERVED"] as const).map((item) => <button key={item} className={filter === item ? "selected" : ""} onClick={() => setFilter(item)}>{item === "ALL" ? "전체" : statusText[item]}</button>)}</div><label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="주문·고객 검색" /></label></div>
                <div className="table-scroll"><table><thead><tr><th>주문번호</th><th>주문 정보</th><th>주문 유형</th><th>금액</th><th>상태</th><th>접수 시간</th></tr></thead><tbody>{filteredOrders.map((order) => <tr key={order.id}><td><strong className="order-no">#{order.orderNumber}</strong></td><td><strong>{order.customerName}</strong><small className="subline">{order.tableName ? order.tableName + " · " : ""}{order.itemSummary}</small></td><td><span className="type-pill">{({ DINE_IN: "매장", TAKEOUT: "포장", DELIVERY: "배달", PHONE: "전화", QR: "QR" })[order.orderType]}</span></td><td className="amount">{money(order.totalAmount)}</td><td><StatusPill status={order.status} /></td><td className="time-cell">{order.createdAt}</td></tr>)}</tbody></table>{loadingData && <div className="empty-state">주문 데이터를 불러오는 중입니다...</div>}{!loadingData && filteredOrders.length === 0 && <div className="empty-state">{demoMode ? "검색 결과가 없습니다." : "표시할 주문이 없습니다."}</div>}</div>
                <div className="panel-foot"><span>최근 주문 <strong>{filteredOrders.length}</strong>건</span><span>{demoMode ? "샘플 데이터" : "실제 Supabase 데이터"}</span></div>
              </div>

              <div className="right-column">
                <div className="panel quick-panel"><div className="panel-heading"><div><h2>빠른 메뉴</h2><p>자주 사용하는 기능으로 이동합니다.</p></div></div><div className="quick-grid"><QuickAction icon={<ClipboardList />} label="주문 관리" onClick={() => setActiveNav("주문 관리")} /><QuickAction icon={<Utensils />} label="메뉴 등록" onClick={() => setActiveNav("메뉴 관리")} /><QuickAction icon={<CreditCard />} label="매출 정산" onClick={() => setActiveNav("매출 · 정산")} /><QuickAction icon={<Users />} label="직원 관리" onClick={() => setActiveNav("직원 관리")} /></div></div>
                <div className="panel status-panel"><div className="panel-heading"><div><h2>주문 처리 현황</h2><p>오늘 주문 상태별 건수</p></div><span className="live-label"><i /> DB</span></div><div className="status-list">{(["PENDING", "CONFIRMED", "COOKING", "SERVED"] as OrderStatus[]).map((status) => { const demoCount = demoOrders.filter((order) => order.status === status).length; const count = status === "PENDING" ? todayStats.pendingCount : status === "CONFIRMED" ? todayStats.confirmedCount : status === "COOKING" ? todayStats.cookingCount : todayStats.servedCount; return <div className="status-row" key={status}><span><StatusPill status={status} /></span><strong>{(demoMode ? demoCount : count)}건</strong></div>; })}</div><div className="status-total"><span>오늘 전체 주문</span><strong>{metrics.orderCount}건</strong></div></div>
              </div>
            </section>
          </>}
          </>}
          <footer className="footer"><span>© 2026 Food POS Platform</span><span>버전 0.2.0 · {demoMode ? "데모 모드" : "실제 데이터 연결"}</span></footer>
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
