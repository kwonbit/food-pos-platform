import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Check, ChevronDown, ImagePlus, Pencil, Plus, Search, Trash2, Utensils, X } from "lucide-react";
import type { StoreSummary } from "./lib/dashboard";
import {
  deleteCategory, deleteMenu, fetchMenuCategories, fetchMenus, getMenuImageUrl,
  saveCategory, saveMenu, setMenuAvailability, uploadMenuImage,
  type MenuCategory, type MenuDraft, type MenuItem,
} from "./lib/menu";

const money = (value: number) => new Intl.NumberFormat("ko-KR").format(value) + "원";
const emptyDraft = (categoryId: string): MenuDraft => ({
  category_id: categoryId, name: "", description: "", base_price: 0, image_path: null,
  is_available: true,
  groups: [
    { name: "", is_required: false, options: [] },
    { name: "", is_required: false, options: [] },
  ],
});

export default function MenuManagement({ store }: { store: StoreSummary }) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [categoryName, setCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showUnavailable, setShowUnavailable] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<MenuDraft>(emptyDraft(""));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [categoryRows, menuRows] = await Promise.all([
        fetchMenuCategories(store.id), fetchMenus(store.id),
      ]);
      setCategories(categoryRows);
      setMenus(menuRows);
      setSelectedCategory((current) => current === "ALL" || categoryRows.some((row) => row.id === current) ? current : "ALL");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "메뉴 정보를 불러오지 못했습니다.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [store.id]);

  const visibleMenus = useMemo(() => menus.filter((menu) =>
    (selectedCategory === "ALL" || menu.category_id === selectedCategory) &&
    (showUnavailable || menu.is_available) &&
    (!search.trim() || menu.name.toLowerCase().includes(search.trim().toLowerCase())),
  ), [menus, selectedCategory, showUnavailable, search]);

  async function handleCategorySave(event: FormEvent) {
    event.preventDefault();
    if (!categoryName.trim()) return;
    try {
      await saveCategory(store.id, categoryName, editingCategoryId ?? undefined);
      setCategoryName("");
      setEditingCategoryId(null);
      setNotice("카테고리를 저장했습니다.");
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "카테고리 저장에 실패했습니다."); }
  }

  async function handleCategoryDelete(category: MenuCategory) {
    if (!window.confirm(`'${category.name}' 카테고리를 삭제할까요? 해당 카테고리에 메뉴가 있으면 먼저 메뉴를 다른 카테고리로 이동해야 합니다.`)) return;
    try {
      await deleteCategory(category.id);
      if (selectedCategory === category.id) setSelectedCategory("ALL");
      if (editingCategoryId === category.id) { setEditingCategoryId(null); setCategoryName(""); }
      setNotice("카테고리를 삭제했습니다.");
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "카테고리를 삭제하지 못했습니다."); }
  }

  function openNewMenu() {
    if (!categories.length) { setError("먼저 음식 카테고리를 등록해 주세요."); return; }
    setDraft(emptyDraft(selectedCategory !== "ALL" ? selectedCategory : categories[0].id));
    setImageFile(null); setImagePreview(""); setError(""); setModalOpen(true);
  }

  function openEditMenu(menu: MenuItem) {
    setDraft({
      id: menu.id, category_id: menu.category_id, name: menu.name, description: menu.description,
      base_price: menu.base_price, image_path: menu.image_path, is_available: menu.is_available,
      groups: [1, 2].map((number) => {
        const group = menu.menu_option_groups.find((item) => item.group_no === number);
        return {
          name: group?.name ?? "", is_required: group?.is_required ?? false,
          options: (group?.menu_options ?? []).map((option) => ({
            id: option.id, name: option.name, additional_price: option.additional_price, is_available: option.is_available,
          })),
        };
      }),
    });
    setImageFile(null);
    setImagePreview(getMenuImageUrl(menu.image_path) ?? "");
    setError(""); setModalOpen(true);
  }

  function updateGroup(index: number, patch: Partial<MenuDraft["groups"][number]>) {
    setDraft((current) => ({ ...current, groups: current.groups.map((group, i) => i === index ? { ...group, ...patch } : group) }));
  }
  function updateOption(groupIndex: number, optionIndex: number, patch: Record<string, string | number | boolean>) {
    setDraft((current) => ({
      ...current,
      groups: current.groups.map((group, i) => i !== groupIndex ? group : {
        ...group, options: group.options.map((option, j) => j === optionIndex ? { ...option, ...patch } : option),
      }),
    }));
  }
  function addOption(groupIndex: number) {
    updateGroup(groupIndex, { options: [...draft.groups[groupIndex].options, { name: "", additional_price: 0, is_available: true }] });
  }
  function removeOption(groupIndex: number, optionIndex: number) {
    updateGroup(groupIndex, { options: draft.groups[groupIndex].options.filter((_, i) => i !== optionIndex) });
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleMenuSave(event: FormEvent) {
    event.preventDefault();
    if (!draft.name.trim()) { setError("메뉴명을 입력해 주세요."); return; }
    if (!draft.category_id) { setError("카테고리를 선택해 주세요."); return; }
    if (!Number.isSafeInteger(draft.base_price) || draft.base_price < 0) { setError("메뉴 가격을 확인해 주세요."); return; }
    for (const [index, group] of draft.groups.entries()) {
      if (group.name.trim() && group.options.some((option) => !option.name.trim())) {
        setError(`옵션 ${index + 1}에 이름이 비어 있는 항목이 있습니다.`); return;
      }
      if (group.options.some((option) => !Number.isSafeInteger(option.additional_price) || option.additional_price < 0)) {
        setError("옵션 추가 가격은 0원 이상의 정수로 입력해 주세요."); return;
      }
    }
    setSaving(true); setError("");
    try {
      let imagePath = draft.image_path;
      if (imageFile) imagePath = await uploadMenuImage(store.id, imageFile);
      await saveMenu(store.id, { ...draft, image_path: imagePath });
      setModalOpen(false); setNotice("메뉴를 저장했습니다.");
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "메뉴 저장에 실패했습니다."); }
    finally { setSaving(false); }
  }

  async function handleMenuDelete(menu: MenuItem) {
    if (!window.confirm(`'${menu.name}' 메뉴를 삭제할까요?`)) return;
    try { await deleteMenu(menu.id); setNotice("메뉴를 삭제했습니다."); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "메뉴를 삭제하지 못했습니다."); }
  }

  async function toggleAvailability(menu: MenuItem) {
    try { await setMenuAvailability(menu.id, !menu.is_available); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "판매 상태를 변경하지 못했습니다."); }
  }

  return (
    <section className="menu-management">
      <div className="menu-page-heading">
        <div><div className="eyebrow">STORE MENU</div><h1>메뉴 관리</h1><p>{store.name}의 음식 카테고리와 메뉴, 가격 및 옵션을 관리합니다.</p></div>
        <button className="primary-button" onClick={openNewMenu}><Plus size={16} /> 메뉴 등록</button>
      </div>
      {error && <div className="menu-alert error" role="alert">{error}<button onClick={() => setError("")}><X size={14}/></button></div>}
      {notice && <div className="menu-alert success">{notice}<button onClick={() => setNotice("")}><X size={14}/></button></div>}

      <div className="menu-category-panel panel">
        <div className="panel-heading"><div><h2>음식 카테고리</h2><p>메뉴를 분류할 카테고리를 등록하고 관리합니다.</p></div><span className="menu-count">{categories.length}개</span></div>
        <form className="category-entry" onSubmit={handleCategorySave}>
          <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="예: 짬뽕류, 식사류, 요리류" maxLength={60}/>
          <button className="primary-button" type="submit"><Check size={15}/>{editingCategoryId ? "수정 저장" : "카테고리 추가"}</button>
          {editingCategoryId && <button className="secondary-button" type="button" onClick={() => { setEditingCategoryId(null); setCategoryName(""); }}>취소</button>}
        </form>
        <div className="category-chips">
          <button className={selectedCategory === "ALL" ? "category-chip active" : "category-chip"} onClick={() => setSelectedCategory("ALL")}>전체 메뉴 <span>{menus.length}</span></button>
          {categories.map((category) => <div className="category-chip-wrap" key={category.id}>
            <button className={selectedCategory === category.id ? "category-chip active" : "category-chip"} onClick={() => setSelectedCategory(category.id)}>{category.name}<span>{menus.filter((menu) => menu.category_id === category.id).length}</span></button>
            <button className="chip-icon" title="카테고리 수정" onClick={() => { setEditingCategoryId(category.id); setCategoryName(category.name); }}><Pencil size={12}/></button>
            <button className="chip-icon danger" title="카테고리 삭제" onClick={() => void handleCategoryDelete(category)}><Trash2 size={12}/></button>
          </div>)}
          {!categories.length && !loading && <span className="category-empty">등록된 카테고리가 없습니다. 위 입력란에서 추가해 주세요.</span>}
        </div>
      </div>

      <div className="menu-list-heading">
        <div><h2>음식 메뉴 <span>{visibleMenus.length}</span></h2><p>메뉴 사진, 가격, 옵션 및 판매 상태를 관리합니다.</p></div>
        <div className="menu-list-tools">
          <label className="menu-search"><Search size={15}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="메뉴명 검색"/></label>
          <label className="availability-filter"><input type="checkbox" checked={showUnavailable} onChange={(event) => setShowUnavailable(event.target.checked)}/> 판매중지 포함</label>
        </div>
      </div>

      {loading ? <div className="panel menu-empty">메뉴 데이터를 불러오는 중입니다...</div> :
        visibleMenus.length === 0 ? <div className="panel menu-empty"><Utensils size={25}/><strong>등록된 메뉴가 없습니다.</strong><span>카테고리를 선택하고 첫 번째 메뉴를 등록해 보세요.</span><button className="primary-button" onClick={openNewMenu}><Plus size={15}/> 메뉴 등록</button></div> :
        <div className="menu-card-grid">{visibleMenus.map((menu) => {
          const category = categories.find((item) => item.id === menu.category_id);
          const imageUrl = getMenuImageUrl(menu.image_path);
          return <article className={`menu-card ${menu.is_available ? "" : "unavailable"}`} key={menu.id}>
            <div className="menu-card-image">{imageUrl ? <img src={imageUrl} alt={menu.name}/> : <div className="menu-image-placeholder"><ImagePlus size={27}/><span>이미지 없음</span></div>}
              {!menu.is_available && <span className="soldout-label">판매 중지</span>}
            </div>
            <div className="menu-card-body"><div className="menu-card-meta"><span>{category?.name ?? "미분류"}</span><button className={menu.is_available ? "availability on" : "availability"} onClick={() => void toggleAvailability(menu)}>{menu.is_available ? "판매중" : "중지"}</button></div>
              <h3>{menu.name}</h3><p>{menu.description || "메뉴 설명이 없습니다."}</p><strong className="menu-price">{money(menu.base_price)}</strong>
              {menu.menu_option_groups.length > 0 && <div className="menu-option-summary">{menu.menu_option_groups.map((group) => group.name).join(" · ")}</div>}
              <div className="menu-card-actions"><button onClick={() => openEditMenu(menu)}><Pencil size={13}/> 수정</button><button className="delete" onClick={() => void handleMenuDelete(menu)}><Trash2 size={13}/> 삭제</button></div>
            </div>
          </article>;
        })}</div>
      }

      {modalOpen && <div className="menu-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setModalOpen(false); }}>
        <form className="menu-modal" onSubmit={handleMenuSave}>
          <div className="menu-modal-heading"><div><h2>{draft.id ? "메뉴 수정" : "새 메뉴 등록"}</h2><p>메뉴 정보와 선택 옵션을 입력하세요.</p></div><button type="button" className="modal-close" onClick={() => setModalOpen(false)}><X size={19}/></button></div>
          {error && <div className="menu-alert error">{error}</div>}
          <div className="menu-form-grid">
            <label className="menu-image-upload"><span>메뉴 사진</span><div className="menu-image-preview">{imagePreview ? <img src={imagePreview} alt="메뉴 미리보기"/> : <div><ImagePlus size={25}/><small>사진 미리보기</small></div>}</div><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void handleImageChange(event)}/><small>JPG, PNG, WEBP · 최대 5MB</small></label>
            <div className="menu-basic-fields">
              <label>메뉴명<input required maxLength={100} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="예: 해물짬뽕"/></label>
              <label>카테고리<select required value={draft.category_id} onChange={(event) => setDraft({ ...draft, category_id: event.target.value })}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label>판매 가격 (원)<input required type="number" min="0" step="1" value={draft.base_price} onChange={(event) => setDraft({ ...draft, base_price: Number(event.target.value) })}/></label>
              <label>메뉴 설명<textarea rows={3} maxLength={500} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="메뉴에 대한 간단한 설명"/></label>
              <label className="menu-available-check"><input type="checkbox" checked={draft.is_available} onChange={(event) => setDraft({ ...draft, is_available: event.target.checked })}/> 판매 가능</label>
            </div>
          </div>
          <div className="menu-options-heading"><div><h3>추가 옵션</h3><p>옵션 그룹은 최대 2개까지 설정할 수 있습니다. 옵션 추가 금액은 기본 가격에 더해집니다.</p></div></div>
          <div className="menu-option-groups">{draft.groups.map((group, groupIndex) => <section className="menu-option-group" key={groupIndex}>
            <div className="option-group-title"><strong>옵션 그룹 {groupIndex + 1}</strong><label><input type="checkbox" checked={group.is_required} onChange={(event) => updateGroup(groupIndex, { is_required: event.target.checked })}/> 필수 선택</label></div>
            <input className="option-group-name" value={group.name} onChange={(event) => updateGroup(groupIndex, { name: event.target.value })} placeholder={groupIndex === 0 ? "예: 면 선택" : "예: 맵기 선택"}/>
            {group.options.map((option, optionIndex) => <div className="option-entry" key={optionIndex}><input aria-label="옵션명" value={option.name} onChange={(event) => updateOption(groupIndex, optionIndex, { name: event.target.value })} placeholder="옵션명"/><label><input aria-label="추가 금액" type="number" min="0" step="1" value={option.additional_price} onChange={(event) => updateOption(groupIndex, optionIndex, { additional_price: Number(event.target.value) })}/> 원</label><button type="button" onClick={() => removeOption(groupIndex, optionIndex)} aria-label="옵션 삭제"><X size={14}/></button></div>)}
            <button type="button" className="add-option-button" onClick={() => addOption(groupIndex)}><Plus size={13}/> 옵션 추가</button>
          </section>)}</div>
          <div className="menu-modal-actions"><button type="button" className="secondary-button" disabled={saving} onClick={() => setModalOpen(false)}>취소</button><button type="submit" className="primary-button" disabled={saving}>{saving ? "저장 중..." : "메뉴 저장"}</button></div>
        </form>
      </div>}
    </section>
  );
}
