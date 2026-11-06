import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Search, ShoppingCart, Trash2, Utensils, X } from "lucide-react";
import type { StoreSummary } from "./lib/dashboard";
import { fetchMenuCategories, fetchMenus, getMenuImageUrl, type MenuCategory, type MenuItem, type MenuOption } from "./lib/menu";
import { createPosOrder, type PosOrderLine } from "./lib/pos";
import { fetchStoreTables, type StoreTable } from "./lib/tables";
import "./pos-sales.css";

const money = (value: number) => new Intl.NumberFormat("ko-KR").format(value) + "원";
type CartLine = PosOrderLine & { key: string };
type SelectedOption = { groupName: string; option: MenuOption };

export default function PosSales({ store, onOrderCreated }: { store: StoreSummary; onOrderCreated?: () => void }) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<StoreTable[]>([]);
  const [tableId, setTableId] = useState("");
  const [categoryId, setCategoryId] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [activeMenu, setActiveMenu] = useState<MenuItem | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEOUT">("DINE_IN");
  const [customerName, setCustomerName] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([fetchMenuCategories(store.id), fetchMenus(store.id)])
      .then(([categoryRows, menuRows]) => {
        if (!alive) return;
        setCategories(categoryRows.filter((item) => item.is_active));
        setMenus(menuRows.filter((item) => item.is_available));
        setTables(tableRows);
        setTableId((current) => tableRows.some((table) => table.id === current) ? current : tableRows[0]?.id ?? "");
      })
      .catch((caught: unknown) => { if (alive) setError(caught instanceof Error ? caught.message : "판매 메뉴를 불러오지 못했습니다."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [store.id]);

  const visibleMenus = useMemo(() => menus.filter((menu) =>
    (categoryId === "ALL" || menu.category_id === categoryId) &&
    (!search.trim() || menu.name.toLowerCase().includes(search.trim().toLowerCase())),
  ), [menus, categoryId, search]);
  const totalQuantity = cart.reduce((sum, line) => sum + line.quantity, 0);
  const totalAmount = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  function addToCart(menu: MenuItem, choices: SelectedOption[] = []) {
    const unitPrice = menu.base_price + choices.reduce((sum, item) => sum + item.option.additional_price, 0);
    const optionText = choices.map((item) => `${item.groupName}: ${item.option.name}`).join(", ");
    const key = menu.id + "|" + choices.map((item) => item.option.id ?? item.option.name).join("|");
    setCart((current) => {
      const existing = current.find((line) => line.key === key);
      if (existing) return current.map((line) => line.key === key ? { ...line, quantity: line.quantity + 1 } : line);
      return [...current, { key, menuId: menu.id, menuName: menu.name, optionText, quantity: 1, unitPrice }];
    });
    setActiveMenu(null);
    setSelectedOptions({});
  }

  function chooseMenu(menu: MenuItem) {
    const groups = menu.menu_option_groups;
    const blockedRequired = groups.find((group) => group.is_required && !group.menu_options.some((option) => option.is_available));
    if (blockedRequired) { setError(`'${blockedRequired.name}' 필수 옵션에 선택 가능한 항목이 없습니다. 메뉴관리에서 옵션을 확인해 주세요.`); return; }
    if (!groups.some((group) => group.menu_options.some((option) => option.is_available))) { addToCart(menu); return; }
    setActiveMenu(menu);
    setSelectedOptions({});
  }

  function confirmOptions() {
    if (!activeMenu) return;
    const groups = activeMenu.menu_option_groups;
    const choices: SelectedOption[] = [];
    for (const group of groups) {
      const optionId = selectedOptions[group.id ?? group.name];
      if (group.is_required && !optionId) { setError(`'${group.name}' 옵션을 선택해 주세요.`); return; }
      const option = group.menu_options.find((item) => item.id === optionId);
      if (option) choices.push({ groupName: group.name, option });
    }
    setError("");
    addToCart(activeMenu, choices);
  }

  function updateQuantity(key: string, delta: number) {
    setCart((current) => current.map((line) => line.key === key ? { ...line, quantity: line.quantity + delta } : line).filter((line) => line.quantity > 0));
  }

  async function submitOrder() {
    if (!cart.length || saving) return;
    if (orderType === "DINE_IN" && !tableId) { setError("테이블 관리에서 테이블을 먼저 등록해 주세요."); return; }
    setSaving(true); setError(""); setNotice("");
    try {
      const orderNumber = await createPosOrder(store, {
        orderType,
        tableName: orderType === "DINE_IN" ? (tables.find((table) => table.id === tableId)?.name ?? null) : null,
        tableId: orderType === "DINE_IN" ? tableId : null,
        customerName: customerName.trim() || null,
        requestNote: requestNote.trim() || null,
        lines: cart,
      });
      setCart([]); setCustomerName(""); setRequestNote("");
      setNotice(`주문 #${orderNumber} 접수가 완료되었습니다. 주문관리에서 확인할 수 있습니다.`);
      onOrderCreated?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "주문 접수에 실패했습니다.");
    } finally { setSaving(false); }
  }

  return (
    <section className="pos-page">
      <div className="pos-heading"><div><div className="eyebrow">POINT OF SALE</div><h1>POS 판매</h1><p>{store.name} · 메뉴를 선택하고 주문을 접수하세요.</p></div><div className="pos-live"><i /> 판매 메뉴 {menus.length}개</div></div>
      {error && <div className="pos-alert error" role="alert">{error}<button onClick={() => setError("")}><X size={14}/></button></div>}
      {notice && <div className="pos-alert success" role="status">{notice}<button onClick={() => setNotice("")}><X size={14}/></button></div>}
      <div className="pos-layout">
        <div className="pos-catalog">
          <div className="pos-catalog-toolbar"><div className="pos-category-tabs"><button className={categoryId === "ALL" ? "active" : ""} onClick={() => setCategoryId("ALL")}>전체</button>{categories.map((category) => <button key={category.id} className={categoryId === category.id ? "active" : ""} onClick={() => setCategoryId(category.id)}>{category.name}</button>)}</div><label className="pos-search"><Search size={16}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="메뉴 검색"/></label></div>
          {loading ? <div className="pos-empty">판매 메뉴를 불러오는 중입니다...</div> : visibleMenus.length === 0 ? <div className="pos-empty"><Utensils size={25}/><strong>판매 가능한 메뉴가 없습니다.</strong><span>메뉴관리에서 카테고리와 판매 가능한 메뉴를 등록해 주세요.</span></div> :
            <div className="pos-menu-grid">{visibleMenus.map((menu) => {
              const image = getMenuImageUrl(menu.image_path);
              const category = categories.find((item) => item.id === menu.category_id);
              return <button className="pos-menu-card" key={menu.id} onClick={() => chooseMenu(menu)}>
                <div className="pos-menu-image">{image ? <img src={image} alt={menu.name}/> : <div className="pos-no-image"><Utensils size={24}/></div>}</div>
                <div className="pos-menu-info"><small>{category?.name ?? "메뉴"}</small><strong>{menu.name}</strong><span>{money(menu.base_price)}</span></div><span className="pos-add"><Plus size={17}/></span>
              </button>;
            })}</div>}
        </div>
        <aside className="pos-checkout">
          <div className="pos-cart-heading"><div><ShoppingCart size={18}/><h2>주문 내역</h2></div><span>{totalQuantity}개</span></div>
          <div className="pos-order-type"><button className={orderType === "DINE_IN" ? "active" : ""} onClick={() => setOrderType("DINE_IN")}>매장 식사</button><button className={orderType === "TAKEOUT" ? "active" : ""} onClick={() => setOrderType("TAKEOUT")}>포장</button></div>
          {orderType === "DINE_IN" && <label className="pos-field">테이블 선택<select value={tableId} onChange={(event) => setTableId(event.target.value)}><option value="">테이블을 선택하세요</option>{tables.map((table) => <option key={table.id} value={table.id}>{table.name} · {table.area} · {table.capacity}인석</option>)}</select>{tables.length === 0 && <small>테이블 관리에서 먼저 테이블을 등록해 주세요.</small>}</label>}
          <label className="pos-field">고객명 <span>(선택)</span><input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="고객명"/></label>
          <div className="pos-cart-list">{cart.length === 0 ? <div className="pos-cart-empty"><ShoppingCart size={25}/><span>메뉴를 선택하면<br/>여기에 주문 내역이 표시됩니다.</span></div> : cart.map((line) => <div className="pos-cart-line" key={line.key}>
            <div className="pos-cart-line-main"><strong>{line.menuName}</strong>{line.optionText && <small>{line.optionText}</small>}<b>{money(line.unitPrice * line.quantity)}</b></div>
            <div className="pos-quantity"><button onClick={() => updateQuantity(line.key, -1)} aria-label="수량 감소"><Minus size={13}/></button><strong>{line.quantity}</strong><button onClick={() => updateQuantity(line.key, 1)} aria-label="수량 증가"><Plus size={13}/></button><button className="pos-remove" onClick={() => setCart((current) => current.filter((item) => item.key !== line.key))} aria-label="삭제"><Trash2 size={14}/></button></div>
          </div>)}</div>
          <label className="pos-field pos-note">요청사항 <span>(선택)</span><textarea rows={2} value={requestNote} onChange={(event) => setRequestNote(event.target.value)} placeholder="요청사항을 입력하세요."/></label>
          <div className="pos-total"><span>총 주문 금액</span><strong>{money(totalAmount)}</strong></div>
          <button className="pos-submit" disabled={!cart.length || saving} onClick={() => void submitOrder()}>{saving ? "주문 접수 중..." : "주문 접수하기"}</button>
          <p className="pos-payment-hint">주문 접수 후 결제는 매장 카운터에서 진행합니다.</p>
        </aside>
      </div>
      {activeMenu && <div className="pos-option-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveMenu(null); }}>
        <div className="pos-option-modal"><div className="pos-option-title"><div><h2>{activeMenu.name}</h2><p>옵션을 선택해 주세요.</p></div><button onClick={() => setActiveMenu(null)}><X size={18}/></button></div>
          <div className="pos-option-base"><span>기본 가격</span><strong>{money(activeMenu.base_price)}</strong></div>
          {activeMenu.menu_option_groups.map((group) => {
            const options = group.menu_options.filter((option) => option.is_available);
            if (!options.length) return null;
            const groupKey = group.id ?? group.name;
            return <section className="pos-option-group" key={groupKey}><div><strong>{group.name}</strong><span>{group.is_required ? "필수 선택" : "선택 사항"}</span></div>{options.map((option) => <label className="pos-option-choice" key={option.id ?? option.name}><input type="radio" name={groupKey} checked={selectedOptions[groupKey] === option.id} onChange={() => setSelectedOptions((current) => ({ ...current, [groupKey]: option.id ?? option.name }))}/><span>{option.name}</span><b>{option.additional_price ? "+" + money(option.additional_price) : "추가금 없음"}</b></label>)}</section>;
          })}
          <button className="pos-submit" onClick={confirmOptions}>장바구니에 담기</button>
        </div>
      </div>}
    </section>
  );
}
