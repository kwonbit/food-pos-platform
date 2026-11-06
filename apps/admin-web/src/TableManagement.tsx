import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Plus, Pencil, RefreshCw, Store, X } from "lucide-react";
import type { StoreSummary } from "./lib/dashboard";
import { fetchStoreTables, saveStoreTable, setStoreTableActive, type StoreTable } from "./lib/tables";
import "./table-management.css";

const emptyForm = { name: "", area: "홀", capacity: 4, sort_order: 0, is_active: true };
const errorText = (error: unknown) => {
  if (error && typeof error === "object" && "code" in error && error.code === "23505") return "같은 매장에 동일한 테이블명이 이미 있습니다.";
  return error instanceof Error ? error.message : "테이블 처리 중 오류가 발생했습니다.";
};

export default function TableManagement({ store }: { store: StoreSummary }) {
  const [tables, setTables] = useState<StoreTable[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setTables(await fetchStoreTables(store.id)); setError(""); }
    catch (e) { setError(errorText(e)); }
    finally { setLoading(false); }
  }, [store.id]);

  useEffect(() => { void load(); }, [load]);

  function openNew() {
    setEditing(null); setForm({ ...emptyForm, sort_order: tables.length + 1 }); setShowForm(true); setError(""); setNotice("");
  }
  function openEdit(table: StoreTable) {
    setEditing(table.id);
    setForm({ name: table.name, area: table.area, capacity: table.capacity, sort_order: table.sort_order, is_active: table.is_active });
    setShowForm(true); setError(""); setNotice("");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || saving) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await saveStoreTable(store, { ...form, id: editing ?? undefined });
      setShowForm(false); setNotice(editing ? "테이블 정보가 수정되었습니다." : "테이블이 등록되었습니다.");
      await load();
    } catch (e) { setError(errorText(e)); }
    finally { setSaving(false); }
  }
  async function toggle(table: StoreTable) {
    setError(""); setNotice("");
    try {
      await setStoreTableActive(store.id, table.id, !table.is_active);
      setNotice(table.is_active ? "테이블을 사용 중지했습니다. 기존 주문 기록은 유지됩니다." : "테이블을 다시 활성화했습니다.");
      await load();
    } catch (e) { setError(errorText(e)); }
  }

  const activeCount = tables.filter((table) => table.is_active).length;
  const areas = [...new Set(tables.map((table) => table.area || "홀"))];

  return <section className="tables-page">
    <div className="tables-title"><div><div className="eyebrow">STORE CONFIGURATION</div><h1>테이블 관리</h1><p>{store.name}의 홀 테이블과 좌석 정보를 관리합니다.</p></div><div className="tables-title-actions"><button className="tables-refresh" onClick={() => void load()} disabled={loading}><RefreshCw size={15}/> 새로고침</button><button className="tables-add" onClick={openNew}><Plus size={16}/> 테이블 등록</button></div></div>
    <div className="tables-summary"><div><span>전체 테이블</span><strong>{tables.length}개</strong></div><div><span>사용 중</span><strong>{activeCount}개</strong></div><div><span>사용 중지</span><strong>{tables.length - activeCount}개</strong></div><div><span>구역</span><strong>{areas.length}개</strong></div></div>
    {error && <div className="tables-alert error" role="alert">{error}</div>}
    {notice && <div className="tables-alert success" role="status">{notice}</div>}
    {showForm && <form className="panel tables-form" onSubmit={(event) => void submit(event)}>
      <div className="tables-form-head"><div><h2>{editing ? "테이블 수정" : "새 테이블 등록"}</h2><p>테이블명은 매장 내에서 중복될 수 없습니다.</p></div><button type="button" onClick={() => setShowForm(false)} aria-label="닫기"><X size={18}/></button></div>
      <div className="tables-form-grid">
        <label>테이블명<input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: 테이블 01" required maxLength={40}/></label>
        <label>구역<input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="예: 홀, 창가, 룸" maxLength={40}/></label>
        <label>좌석 수<input type="number" min={1} max={99} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} required/></label>
        <label>정렬 순서<input type="number" min={0} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}/></label>
      </div>
      <label className="tables-active-check"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })}/> POS에서 사용</label>
      <div className="tables-form-actions"><button type="button" className="secondary" onClick={() => setShowForm(false)}>취소</button><button type="submit" disabled={saving}>{saving ? "저장 중..." : "저장하기"}</button></div>
    </form>}
    <div className="panel tables-list-panel"><div className="tables-list-head"><div><h2>등록된 테이블</h2><p>사용 중인 테이블은 POS 판매 화면에서 선택할 수 있습니다.</p></div><span>{activeCount} / {tables.length} 사용 중</span></div>
      {loading ? <div className="tables-empty">테이블 정보를 불러오는 중입니다...</div> : tables.length === 0 ? <div className="tables-empty"><Store size={28}/><strong>등록된 테이블이 없습니다.</strong><span>테이블 등록 버튼을 눌러 첫 테이블을 추가해 주세요.</span></div> :
      <div className="tables-groups">{areas.map((area) => <section className="tables-area" key={area}><div className="tables-area-title">{area}<span>{tables.filter((t) => t.area === area).length}개</span></div><div className="tables-grid">{tables.filter((t) => t.area === area).map((table) => <article className={`table-card ${table.is_active ? "" : "inactive"}`} key={table.id}><div className="table-card-top"><span className="table-card-icon"><Store size={18}/></span><span className={table.is_active ? "table-active" : "table-inactive"}>{table.is_active ? "사용 중" : "중지"}</span></div><strong>{table.name}</strong><small>{table.capacity}인석 · 순서 {table.sort_order}</small><div className="table-card-actions"><button onClick={() => openEdit(table)}><Pencil size={13}/> 수정</button><button onClick={() => void toggle(table)}>{table.is_active ? "사용 중지" : "사용 재개"}</button></div></article>)}</div></section>)}</div>}
    </div>
  </section>;
}
