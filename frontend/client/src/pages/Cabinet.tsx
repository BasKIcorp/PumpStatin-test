import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import axios from "@/lib/csrf";
import {
  ADMIN_LEAF_TAB_IDS,
  getVisibleAdminLeaves,
  getVisibleAdminSections,
  isAdminLeafVisible,
  normalizeAdminLeaf,
} from "@/config/adminNav";
import { AdminAllUsersHistory } from "@/components/admin/AdminAllUsersHistory";
import AppAdmin from "./AppAdmin";
import { downloadProjectPackagePdf } from "@/lib/api";
import { hrefResumeSelection, pathForSiteBase, readPreferredSiteSlugFromStorage } from "@/lib/site";

/* ── Типы ─────────────────────────────────────────────────── */
interface Selection {
  id: number;
  name: string;
  Q: number;
  H: number;
  n1: number;
  n2: number;
  pump_types: string;
  fluid_type: string;
  temperature: number;
  pump_name: string;
  created_at: string;
  has_station_pdf_snapshot?: boolean;
}

interface ProjectSelection extends Pick<
  Selection,
  "id" | "name" | "Q" | "H" | "n1" | "n2" | "pump_types" | "fluid_type" | "temperature" | "pump_name" | "created_at"
> {
  has_station_pdf_snapshot?: boolean;
  /** Витрина, на которой делали расчёт (если сохранён снимок). */
  selection_site_slug?: string | null;
}

interface Project {
  id: number;
  name: string;
  address: string;
  /** Витрина, к которой привязан бренд; null — старые проекты / общий интерфейс. */
  site_slug?: string | null;
  created_at: string;
  selections: ProjectSelection[];
}

/* ── Вкладки ──────────────────────────────────────────────── */
const USER_TABS = [
  { id: "selections", label: "История подборов" },
  { id: "projects", label: "Мои проекты" },
] as const;

type AdminTabId = (typeof ADMIN_LEAF_TAB_IDS)[number];
type UserTabId  = (typeof USER_TABS)[number]["id"];
type TabId      = UserTabId | AdminTabId;

const ADMIN_TAB_IDS = getVisibleAdminLeaves() as readonly string[];

const CABINET_SIDEBAR_LS_KEY = "cabinet.sidebar.collapsed";

function readSidebarCollapsedInitial(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(CABINET_SIDEBAR_LS_KEY) === "1";
  } catch {
    return false;
  }
}

/* ── Утилиты ─────────────────────────────────────────────── */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function WorkingPoint({ Q, H }: { Q: number; H: number }) {
  return <span className="text-[var(--funnel-text-muted)] text-sm">{Q}&nbsp;м³/ч;&nbsp;{H}&nbsp;м</span>;
}

/* ── Главный компонент ───────────────────────────────────── */
export default function Cabinet() {
  const { user, loading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [publicDataIntent, setPublicDataIntent] = useState<{ table: string; id: number } | null>(
    null,
  );
  /** Для администатора: свои подборы или журнал по всем пользователям */
  const [cabinetSelectionsScope, setCabinetSelectionsScope] = useState<"mine" | "all">("mine");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsedInitial);
  const sidebarRef = useRef<HTMLElement>(null);

  /* Данные пользователя */
  const [selections, setSelections] = useState<Selection[]>([]);
  const [projects,   setProjects]   = useState<Project[]>([]);
  const [selFilter,  setSelFilter]  = useState("");
  const [projFilter, setProjFilter] = useState("");

  /* Модалка: новый проект */
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjName,    setNewProjName]    = useState("");
  const [newProjAddr,    setNewProjAddr]    = useState("");
  const [creating,       setCreating]       = useState(false);

  /* Модалка: добавить подбор в проект */
  const [addToProj,    setAddToProj]    = useState<{ selectionId: number } | null>(null);
  const [targetProject, setTargetProject] = useState<number | "">("");

  /* Inline rename для подборов */
  const [renamingSelId, setRenamingSelId] = useState<number | null>(null);
  const [renameValue,   setRenameValue]   = useState("");

  /* Inline edit для проектов */
  const [editingProjId,   setEditingProjId]   = useState<number | null>(null);
  const [editProjName,    setEditProjName]    = useState("");
  const [editProjAddress, setEditProjAddress] = useState("");
  const [projectPdfLoadingId, setProjectPdfLoadingId] = useState<number | null>(null);

  /** Модалка: добавить в текущий проект несколько подборов из истории */
  const [historyPickProjectId, setHistoryPickProjectId] = useState<number | null>(null);
  const [historyPickFilter, setHistoryPickFilter] = useState("");
  const [historyPickIds, setHistoryPickIds] = useState<number[]>([]);
  const [historyPickAdding, setHistoryPickAdding] = useState(false);

  const isAdmin = user?.role === "admin";

  /** Скрытые вкладки (раздел «Дизайн») → White-Label */
  useEffect(() => {
    if (!isAdmin) return;
    if (ADMIN_LEAF_TAB_IDS.includes(activeTab) && !isAdminLeafVisible(activeTab)) {
      setActiveTab(normalizeAdminLeaf(activeTab) as TabId);
    }
  }, [isAdmin, activeTab]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CABINET_SIDEBAR_LS_KEY, sidebarCollapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;
    if (sidebarCollapsed) {
      el.setAttribute("inert", "");
    } else {
      el.removeAttribute("inert");
    }
  }, [sidebarCollapsed]);

  /* Общая ссылка «к подбору» из ЛК — по последней витрине в URL пользователя */
  function selectionHomeHref() {
    return pathForSiteBase(readPreferredSiteSlugFromStorage());
  }

  /* Загружаем данные пользователя */
  useEffect(() => {
    if (!user) return;
    axios.get("/api/user/selections/").then(r => setSelections(r.data)).catch(() => {});
    axios.get("/api/user/projects/").then(r => setProjects(r.data)).catch(() => {});
  }, [user]);

  /* Создание проекта */
  async function createProject() {
    if (!newProjName.trim()) return;
    setCreating(true);
    try {
      const pref = readPreferredSiteSlugFromStorage();
      const r = await axios.post("/api/user/projects/", {
        name: newProjName,
        address: newProjAddr,
        ...(pref ? { site_slug: pref } : {}),
      });
      const newProj: Project = {
        id: r.data.id,
        name: newProjName,
        address: newProjAddr,
        site_slug: r.data.site_slug ?? null,
        created_at: new Date().toISOString(),
        selections: [],
      };
      setProjects(p => [newProj, ...p]);
      setNewProjName("");
      setNewProjAddr("");
      setShowNewProject(false);
    } finally {
      setCreating(false);
    }
  }

  async function deleteProject(id: number) {
    if (!confirm("Удалить проект?")) return;
    await axios.delete(`/api/user/projects/${id}/`);
    setProjects(p => p.filter(x => x.id !== id));
  }

  async function addSelectionToProject() {
    if (!addToProj || !targetProject) return;
    await axios.post(`/api/user/projects/${targetProject}/selections/`, {
      selection_id: addToProj.selectionId,
    });
    const r = await axios.get("/api/user/projects/");
    setProjects(r.data);
    setAddToProj(null);
    setTargetProject("");
  }

  async function saveSelectionName(id: number) {
    const trimmed = renameValue.trim();
    await axios.patch(`/api/user/selections/${id}/rename/`, { name: trimmed }).catch(() => {});
    setSelections(prev => prev.map(s => s.id === id ? { ...s, name: trimmed } : s));
    setRenamingSelId(null);
  }

  async function removeSelectionFromProject(projectId: number, selectionId: number) {
    await axios.delete(`/api/user/projects/${projectId}/selections/${selectionId}/`);
    setProjects(prev => prev.map(p =>
      p.id === projectId
        ? { ...p, selections: p.selections.filter(s => s.id !== selectionId) }
        : p
    ));
  }

  function openHistoryPicker(projectId: number) {
    setHistoryPickProjectId(projectId);
    setHistoryPickFilter("");
    setHistoryPickIds([]);
  }

  async function addHistoryPicksToProject(projectId: number, ids: number[]) {
    if (ids.length === 0) return;
    setHistoryPickAdding(true);
    try {
      await Promise.all(
        ids.map(id =>
          axios.post(`/api/user/projects/${projectId}/selections/`, { selection_id: id }),
        ),
      );
      const r = await axios.get("/api/user/projects/");
      setProjects(r.data);
      setHistoryPickProjectId(null);
      setHistoryPickIds([]);
    } finally {
      setHistoryPickAdding(false);
    }
  }

  async function saveProjectEdit(id: number) {
    const name = editProjName.trim();
    const address = editProjAddress.trim();
    await axios.patch(`/api/user/projects/${id}/`, { name, address }).catch(() => {});
    setProjects(prev => prev.map(p => p.id === id ? { ...p, name, address } : p));
    setEditingProjId(null);
  }

  async function handleDownloadProjectPdf(projectId: number) {
    setProjectPdfLoadingId(projectId);
    try {
      const proj = projects.find((p) => p.id === projectId);
      const { blob, filename, pdfWarnings } = await downloadProjectPackagePdf(
        projectId,
        proj?.site_slug ?? undefined,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      if (pdfWarnings.length) {
        console.warn("[PDF предупреждения]", pdfWarnings);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Не удалось сформировать PDF проекта";
      window.alert(msg);
    } finally {
      setProjectPdfLoadingId(null);
    }
  }

  /* Фильтрация */
  const filteredSel  = selections.filter(s => {
    const q = selFilter.toLowerCase();
    const label = (s.name || s.pump_name || "").toLowerCase();
    return label.includes(q);
  });

  const historyPickProject = historyPickProjectId != null
    ? projects.find(p => p.id === historyPickProjectId)
    : undefined;
  const historyPickInProject = new Set(historyPickProject?.selections.map(s => s.id) ?? []);
  const historyPickCandidates = selections.filter(s => !historyPickInProject.has(s.id));
  const historyPickFiltered = historyPickCandidates.filter(s => {
    const q = historyPickFilter.toLowerCase();
    const label = (s.name || s.pump_name || "").toLowerCase();
    return (
      label.includes(q)
      || String(s.Q).includes(q)
      || String(s.H).includes(q)
    );
  });

  function toggleHistoryPickId(id: number) {
    setHistoryPickIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  }
  const filteredProj = projects.filter(p =>
    p.name.toLowerCase().includes(projFilter.toLowerCase()) ||
    (p.address || "").toLowerCase().includes(projFilter.toLowerCase())
  );

  /* Флаги */
  const isAdminTab  = ADMIN_TAB_IDS.includes(activeTab);

  const navigateAdminToPublicData = React.useCallback((tableName: string) => {
    setActiveTab("data");
    setPublicDataIntent({ table: tableName, id: Date.now() });
  }, []);

  const clearPublicDataIntent = React.useCallback(() => setPublicDataIntent(null), []);

  /* ── Рендер ─────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="cabinet-root min-h-screen flex items-center justify-center text-[var(--funnel-text-muted)]">
        Загрузка...
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="cabinet-root min-h-screen flex flex-col">

      {/* ── Шапка ─────────────────────────────────────────── */}
      <header className="cabinet-surface border-b shadow-sm z-10 flex-shrink-0">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              aria-expanded={!sidebarCollapsed}
              aria-controls="cabinet-sidebar"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-300 cabinet-surface text-[var(--funnel-text-muted)] shadow-sm transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--funnel-primary)]"
              title={sidebarCollapsed ? "Показать меню" : "Скрыть меню"}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
              ) : (
                <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
              )}
              <span className="sr-only">
                {sidebarCollapsed ? "Показать боковое меню" : "Скрыть боковое меню"}
              </span>
            </button>
            <a href={selectionHomeHref()} className="flex items-center space-x-3 min-w-0">
              {!isAdmin && (
                <img src="/assets/logo.png" alt="Logo" className="h-9 object-contain" />
              )}
              <span className="font-semibold text-[var(--funnel-text)] hidden md:inline text-sm">
                Конфигуратор насосных станций
              </span>
            </a>
          </div>
          <div className="flex items-center space-x-3">
            {isAdmin && (
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-[color-mix(in_srgb,var(--funnel-primary)_15%,var(--funnel-surface))] text-[var(--funnel-primary)]">
                Администратор
              </span>
            )}
            <span className="text-sm text-[var(--funnel-text-muted)] hidden sm:inline">
              {user.name || user.email}
            </span>
            <button
              onClick={async () => { await logout(); navigate("/"); }}
              className="text-sm text-[var(--funnel-text-muted)] hover:text-red-500 transition-colors px-2 py-1 rounded"
              title="Выйти"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Боковое меню ──────────────────────────────── */}
        <aside
          ref={sidebarRef}
          id="cabinet-sidebar"
          aria-hidden={sidebarCollapsed}
          className={`cabinet-surface border-r flex-shrink-0 flex flex-col overflow-y-auto transition-[width] duration-200 ease-out ${
            sidebarCollapsed ? "w-0 border-transparent overflow-x-hidden" : "w-56"
          }`}
        >

          {/* Профиль */}
          <div className="px-4 pt-5 pb-4 border-b">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 bg-[color-mix(in_srgb,var(--funnel-primary)_15%,var(--funnel-surface))] text-[var(--funnel-primary)]">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--funnel-text)] truncate">
                  {user.name || "Пользователь"}
                </p>
                <p className="text-xs text-[var(--funnel-text-muted)] truncate">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Навигация: пользователь */}
          <nav className="flex-1 py-2">
            <div className="px-3 pt-2 pb-1">
              <p className="text-[10px] font-semibold text-[var(--funnel-text-muted)] uppercase tracking-wider">
                Личный кабинет
              </p>
            </div>
            {USER_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  activeTab === tab.id
                    ? "cabinet-nav-active font-medium"
                    : "text-[var(--funnel-text-muted)] hover:bg-black/[0.04] hover:text-[var(--funnel-text)]"
                }`}
              >
                {tab.label}
              </button>
            ))}

            {/* Навигация: администратор (группы и подразделы) */}
            {isAdmin && (
              <>
                <div className="px-3 pt-5 pb-1">
                  <p className="text-[10px] font-semibold text-[var(--funnel-text-muted)] uppercase tracking-wider">
                    Администрирование
                  </p>
                </div>
                {getVisibleAdminSections().map((section) => (
                  <div key={section.id} className="mb-1">
                    <p className="px-4 py-1.5 text-[11px] font-semibold text-[var(--funnel-text-muted)] uppercase tracking-wide">
                      {section.label}
                    </p>
                    {section.leaves.map((leaf) => (
                      <button
                        key={leaf.id}
                        onClick={() => setActiveTab(leaf.id as AdminTabId)}
                        className={`w-full text-left pl-6 pr-4 py-2 text-sm transition-colors ${
                          activeTab === leaf.id
                            ? "cabinet-nav-active font-medium"
                            : "text-[var(--funnel-text-muted)] hover:bg-black/[0.04] hover:text-[var(--funnel-text)]"
                        }`}
                      >
                        {leaf.label}
                      </button>
                    ))}
                  </div>
                ))}
              </>
            )}
          </nav>

          {/* Кнопка нового подбора */}
          <div className="p-3 border-t flex-shrink-0">
            <a
              href={selectionHomeHref()}
              className="flex items-center justify-center w-full px-3 py-2 text-sm selection-work-btn-primary hover:opacity-90 rounded-lg transition-colors font-medium"
            >
              + Новый подбор
            </a>
          </div>
        </aside>

        {/* ── Основной контент ──────────────────────────── */}
        <main className="flex-1 overflow-y-auto">

          {/* Вкладка: История подборов (личный кабинет) */}
          {activeTab === "selections" && (
            <div
              className={`p-6 w-full ${
                isAdmin && cabinetSelectionsScope === "all" ? "max-w-7xl" : "max-w-4xl"
              } mx-auto`}
            >
              {isAdmin && (
                <div className="mb-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setCabinetSelectionsScope("mine")}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      cabinetSelectionsScope === "mine"
                        ? "selection-work-btn-primary"
                        : "border border-gray-200 cabinet-surface text-[var(--funnel-text-muted)] hover:bg-black/[0.04]"
                    }`}
                  >
                    Мои подборы
                  </button>
                  <button
                    type="button"
                    onClick={() => setCabinetSelectionsScope("all")}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      cabinetSelectionsScope === "all"
                        ? "selection-work-btn-primary"
                        : "border border-gray-200 cabinet-surface text-[var(--funnel-text-muted)] hover:bg-black/[0.04]"
                    }`}
                  >
                    Все пользователи
                  </button>
                </div>
              )}

              {(!isAdmin || cabinetSelectionsScope === "mine") && (
                <>
              <div className="flex items-center justify-between mb-5">
                <h1 className="text-xl font-semibold text-[var(--funnel-text)]">История подборов</h1>
                <span className="text-sm text-[var(--funnel-text-muted)]">{selections.length} записей</span>
              </div>

              <div className="cabinet-surface rounded-xl border border-gray-200 shadow-sm">
                <div className="px-5 py-3 border-b border-gray-100">
                  <input
                    value={selFilter}
                    onChange={e => setSelFilter(e.target.value)}
                    placeholder="Фильтр по названию подбора или насосу..."
                    className="w-full max-w-sm border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--funnel-primary)]"
                  />
                </div>

                {filteredSel.length === 0 ? (
                  <div className="py-16 text-center">
                    <p className="text-[var(--funnel-text-muted)] text-sm">
                      {selections.length === 0 ? "Нет сохранённых подборов" : "Ничего не найдено"}
                    </p>
                    <a href={selectionHomeHref()} className="inline-block mt-3 text-sm text-[var(--funnel-primary)] hover:underline">
                      Начать первый подбор →
                    </a>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="cabinet-table-head border-b border-gray-100">
                        <tr>
                          <th className="text-left px-5 py-3 font-medium text-[var(--funnel-text-muted)]">Наименование</th>
                          <th className="text-left px-4 py-3 font-medium text-[var(--funnel-text-muted)]">Рабочая точка</th>
                          <th className="text-left px-4 py-3 font-medium text-[var(--funnel-text-muted)]">Дата</th>
                          <th className="px-4 py-3 w-36"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredSel.map(s => (
                          <tr key={s.id} className="hover:bg-black/[0.04] transition-colors">
                            <td className="px-5 py-3 font-medium text-[var(--funnel-text)]">
                              {renamingSelId === s.id ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    autoFocus
                                    value={renameValue}
                                    onChange={e => setRenameValue(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === "Enter") saveSelectionName(s.id);
                                      if (e.key === "Escape") setRenamingSelId(null);
                                    }}
                                    className="border border-blue-400 rounded px-1.5 py-0.5 text-sm w-44 focus:outline-none"
                                  />
                                  <button onClick={() => saveSelectionName(s.id)} className="text-xs text-[var(--funnel-primary)] hover:text-[var(--funnel-primary)]">✓</button>
                                  <button onClick={() => setRenamingSelId(null)} className="text-xs text-[var(--funnel-text-muted)] hover:text-[var(--funnel-text-muted)]">✕</button>
                                </div>
                              ) : (
                                <span
                                  className="cursor-pointer hover:underline"
                                  title="Нажмите для переименования"
                                  onClick={() => { setRenamingSelId(s.id); setRenameValue(s.name || s.pump_name || ""); }}
                                >
                                  {s.name || s.pump_name || "—"}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <WorkingPoint Q={s.Q} H={s.H} />
                            </td>
                            <td className="px-4 py-3 text-[var(--funnel-text-muted)] text-xs">
                              {formatDate(s.created_at)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => { setAddToProj({ selectionId: s.id }); setTargetProject(""); }}
                                  className="text-xs text-blue-500 hover:text-[var(--funnel-primary)] whitespace-nowrap"
                                >
                                  В проект
                                </button>
                                <a
                                  href={hrefResumeSelection(readPreferredSiteSlugFromStorage(), s)}
                                  className="text-xs selection-work-btn-secondary hover:opacity-90 px-2.5 py-1 rounded transition-colors whitespace-nowrap"
                                >
                                  Повторить
                                </a>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
                </>
              )}

              {isAdmin && cabinetSelectionsScope === "all" && <AdminAllUsersHistory />}
            </div>
          )}

          {/* Вкладка: Мои проекты */}
          {activeTab === "projects" && (
            <div className="p-6 max-w-4xl">
              <div className="flex items-center justify-between mb-5">
                <h1 className="text-xl font-semibold text-[var(--funnel-text)]">Мои проекты</h1>
                <button
                  onClick={() => setShowNewProject(true)}
                  className="text-sm selection-work-btn-primary hover:opacity-90 px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  + Новый проект
                </button>
              </div>

              <div className="mb-4">
                <input
                  value={projFilter}
                  onChange={e => setProjFilter(e.target.value)}
                  placeholder="Фильтр по названию или адресу..."
                  className="w-full max-w-sm border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--funnel-primary)]"
                />
              </div>

              {filteredProj.length === 0 ? (
                <div className="cabinet-surface rounded-xl border border-gray-200 shadow-sm py-16 text-center">
                  <p className="text-[var(--funnel-text-muted)] text-sm">
                    {projects.length === 0 ? "Нет проектов" : "Ничего не найдено"}
                  </p>
                  <button
                    onClick={() => setShowNewProject(true)}
                    className="inline-block mt-3 text-sm text-[var(--funnel-primary)] hover:underline"
                  >
                    Создать первый проект →
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredProj.map(p => (
                    <div
                      key={p.id}
                      className="cabinet-surface rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                    >
                      <div className="px-5 py-4 flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {editingProjId === p.id ? (
                            <div className="space-y-1.5">
                              <input
                                autoFocus
                                value={editProjName}
                                onChange={e => setEditProjName(e.target.value)}
                                placeholder="Название проекта"
                                className="w-full border border-blue-400 rounded px-2 py-1 text-sm focus:outline-none"
                              />
                              <input
                                value={editProjAddress}
                                onChange={e => setEditProjAddress(e.target.value)}
                                placeholder="Адрес объекта"
                                className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none"
                              />
                              <div className="flex gap-2">
                                <button onClick={() => saveProjectEdit(p.id)} className="text-xs px-3 py-1 rounded selection-work-btn-primary hover:opacity-90">Сохранить</button>
                                <button onClick={() => setEditingProjId(null)} className="text-xs text-[var(--funnel-text-muted)] hover:text-[var(--funnel-text)] px-2 py-1">Отмена</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="font-medium text-[var(--funnel-text)]">{p.name}</p>
                              {p.address && (
                                <p className="text-xs text-[var(--funnel-text-muted)] mt-0.5">{p.address}</p>
                              )}
                              <p className="text-xs text-[var(--funnel-text-muted)] mt-0.5">
                                {formatDate(p.created_at)} · {p.selections.length} подборов
                              </p>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-3 mt-0.5 shrink-0 flex-wrap justify-end">
                          {editingProjId !== p.id && (
                            <>
                              <button
                                type="button"
                                onClick={() => openHistoryPicker(p.id)}
                                className="text-xs font-medium text-[var(--funnel-primary)] border border-zinc-300 rounded-lg px-2.5 py-1 transition-colors whitespace-nowrap bg-[color-mix(in_srgb,var(--funnel-primary)_10%,var(--funnel-surface))] hover:opacity-90"
                                title="Добавить записи из вкладки «История подборов»"
                              >
                                + Из истории
                              </button>
                              <button
                                type="button"
                                onClick={() => { setEditingProjId(p.id); setEditProjName(p.name); setEditProjAddress(p.address || ""); }}
                                className="text-[var(--funnel-text-muted)] hover:text-blue-500 transition-colors text-xs px-1"
                                title="Редактировать проект"
                              >
                                ✎
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteProject(p.id)}
                            className="text-[var(--funnel-text-muted)] hover:text-red-500 transition-colors text-sm font-medium px-1"
                            title="Удалить проект"
                            aria-label="Удалить проект"
                          >
                            ×
                          </button>
                        </div>
                      </div>

                      {p.selections.length === 0 ? (
                        <div className="border-t border-gray-100 px-5 py-8 text-center space-y-2">
                          <p className="text-sm text-[var(--funnel-text-muted)]">
                            В проекте пока нет подборов. Добавьте их кнопкой «+ Из истории» или со вкладки «История подборов» — действие «В проект».
                          </p>
                          {selections.length === 0 && (
                            <a href={selectionHomeHref()} className="inline-block text-sm text-[var(--funnel-primary)] hover:underline">
                              Перейти к первому подбору →
                            </a>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="border-t border-gray-100">
                            <table className="w-full text-xs">
                            <thead className="cabinet-table-head">
                              <tr>
                                <th className="text-left px-5 py-2 font-medium text-[var(--funnel-text-muted)]">Наименование</th>
                                <th className="text-left px-4 py-2 font-medium text-[var(--funnel-text-muted)]">Рабочая точка</th>
                                <th className="text-left px-4 py-2 font-medium text-[var(--funnel-text-muted)]">Дата</th>
                                <th className="text-right px-4 py-2 font-medium text-[var(--funnel-text-muted)]">Действия</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {p.selections.map(s => (
                                <tr key={s.id} className="hover:bg-black/[0.04]">
                                  <td className="px-5 py-2 text-[var(--funnel-text)] font-medium">
                                    {(s.name && s.name.trim()) ? s.name : (s.pump_name || "—")}
                                  </td>
                                  <td className="px-4 py-2">
                                    <WorkingPoint Q={s.Q} H={s.H} />
                                  </td>
                                  <td className="px-4 py-2 text-[var(--funnel-text-muted)]">
                                    {formatDate(s.created_at)}
                                  </td>
                                  <td className="px-4 py-2 text-right whitespace-nowrap space-x-2">
                                    <a
                                      href={hrefResumeSelection(s.selection_site_slug ?? p.site_slug, s)}
                                      className="text-[var(--funnel-primary)] hover:text-[var(--funnel-primary)] hover:underline"
                                    >
                                      Повторить
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => removeSelectionFromProject(p.id, s.id)}
                                      className="text-gray-300 hover:text-red-400 transition-colors align-middle"
                                      title="Убрать из проекта"
                                    >
                                      ×
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          </div>
                          <div className="border-t border-gray-100 px-5 py-3 flex flex-wrap items-center gap-2 bg-[var(--funnel-panel-header-bg)]">
                            <button
                              type="button"
                              disabled={
                                projectPdfLoadingId === p.id ||
                                !p.selections.every((s) => s.has_station_pdf_snapshot)
                              }
                              onClick={() => void handleDownloadProjectPdf(p.id)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {projectPdfLoadingId === p.id ? "Формируем PDF…" : "Скачать ТКП проекта"}
                            </button>
                            {p.site_slug && (
                              <span className="text-[11px] text-[var(--funnel-text-muted)]">
                                Витрина: <span className="font-mono">{p.site_slug}</span>
                              </span>
                            )}
                            {!p.selections.every((s) => s.has_station_pdf_snapshot) && (
                              <span className="text-[11px] text-amber-800 max-w-md leading-snug">
                                У каждого подбора должна быть сохранена конфигурация: на сайте после выбора насоса нажмите «Рассчитать» (вход в аккаунт обязателен).
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Вкладки администратора — рендерим AppAdmin во встроенном режиме */}
          {isAdmin && isAdminTab && (
            <div className="p-6">
              <AppAdmin
                embedded
                activeTab={activeTab}
                onNavigateToPublicData={navigateAdminToPublicData}
                publicDataIntent={publicDataIntent}
                onPublicDataIntentHandled={clearPublicDataIntent}
              />
            </div>
          )}

        </main>
      </div>

      {/* ── Модалка: создать проект ─────────────────────── */}
      {showNewProject && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="cabinet-surface rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-[var(--funnel-text)] mb-4">Новый проект</h3>
            <div className="space-y-3">
              <input
                autoFocus
                value={newProjName}
                onChange={e => setNewProjName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && createProject()}
                placeholder="Название проекта"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--funnel-primary)]"
              />
              <input
                value={newProjAddr}
                onChange={e => setNewProjAddr(e.target.value)}
                placeholder="Адрес объекта (необязательно)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--funnel-primary)]"
              />
            </div>
            <div className="flex space-x-2 mt-4">
              <button
                onClick={() => { setShowNewProject(false); setNewProjName(""); setNewProjAddr(""); }}
                className="flex-1 border border-zinc-300 py-2 rounded-lg text-sm selection-work-btn-secondary hover:opacity-90"
              >
                Отмена
              </button>
              <button
                onClick={createProject}
                disabled={creating || !newProjName.trim()}
                className="flex-1 selection-work-btn-primary hover:opacity-90 py-2 rounded-lg text-sm disabled:opacity-50"
              >
                {creating ? "Создание..." : "Создать"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Модалка: добавить в проект ──────────────────── */}
      {addToProj && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="cabinet-surface rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-[var(--funnel-text)] mb-4">Добавить в проект</h3>
            {projects.length === 0 ? (
              <p className="text-sm text-[var(--funnel-text-muted)]">
                Нет проектов. Сначала создайте проект.
              </p>
            ) : (
              <select
                value={targetProject}
                onChange={e => setTargetProject(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--funnel-primary)]"
              >
                <option value="">— Выберите проект —</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
            <div className="flex space-x-2 mt-4">
              <button
                onClick={() => setAddToProj(null)}
                className="flex-1 border border-zinc-300 py-2 rounded-lg text-sm selection-work-btn-secondary hover:opacity-90"
              >
                Отмена
              </button>
              <button
                onClick={addSelectionToProject}
                disabled={!targetProject}
                className="flex-1 selection-work-btn-primary hover:opacity-90 py-2 rounded-lg text-sm disabled:opacity-50"
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {historyPickProjectId != null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="cabinet-surface rounded-xl shadow-xl w-full max-w-md p-6 flex flex-col max-h-[min(560px,85vh)]">
            <h3 className="text-lg font-semibold text-[var(--funnel-text)]">Добавить подборы в проект</h3>
            <p className="text-sm text-[var(--funnel-text-muted)] mt-1 truncate" title={historyPickProject?.name}>
              «{historyPickProject?.name ?? ""}»
            </p>
            {historyPickCandidates.length === 0 ? (
              <p className="text-sm text-[var(--funnel-text-muted)] mt-4">
                Все подборы из истории уже в этом проекте или история пуста.
              </p>
            ) : (
              <>
                <input
                  value={historyPickFilter}
                  onChange={e => setHistoryPickFilter(e.target.value)}
                  placeholder="Поиск по названию, Q, H…"
                  className="mt-4 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--funnel-primary)]"
                />
                <div className="flex justify-between items-center mt-2 mb-1 gap-2">
                  <span className="text-xs text-[var(--funnel-text-muted)]">{historyPickFiltered.length} доступно</span>
                  <button
                    type="button"
                    className="text-xs text-[var(--funnel-primary)] hover:text-[var(--funnel-primary)] shrink-0"
                    onClick={() => {
                      const ids = historyPickFiltered.map(s => s.id);
                      if (ids.length === 0) return;
                      const allOn = ids.every(id => historyPickIds.includes(id));
                      setHistoryPickIds(prev =>
                        allOn ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])],
                      );
                    }}
                  >
                    {historyPickFiltered.length > 0 &&
                    historyPickFiltered.every(s => historyPickIds.includes(s.id))
                      ? "Снять выделение"
                      : "Выделить все"}
                  </button>
                </div>
                <ul className="mt-1 overflow-y-auto flex-1 min-h-[120px] max-h-[280px] border border-gray-100 rounded-lg divide-y divide-gray-50">
                  {historyPickFiltered.map(s => (
                    <li key={s.id} className="flex items-start gap-3 px-3 py-2 hover:bg-black/[0.04]">
                      <input
                        type="checkbox"
                        className="mt-1 rounded border-gray-300"
                        checked={historyPickIds.includes(s.id)}
                        onChange={() => toggleHistoryPickId(s.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[var(--funnel-text)] font-medium truncate">
                          {(s.name && s.name.trim()) ? s.name : (s.pump_name || `Подбор #${s.id}`)}
                        </p>
                        <p className="text-xs text-[var(--funnel-text-muted)]">
                          <WorkingPoint Q={s.Q} H={s.H} /> · {formatDate(s.created_at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="flex gap-2 mt-4 shrink-0">
              <button
                type="button"
                onClick={() => { setHistoryPickProjectId(null); setHistoryPickIds([]); }}
                className="flex-1 border border-zinc-300 py-2 rounded-lg text-sm selection-work-btn-secondary hover:opacity-90"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={
                  historyPickIds.length === 0 ||
                  historyPickAdding ||
                  historyPickCandidates.length === 0
                }
                onClick={() => {
                  if (historyPickProjectId == null) return;
                  void addHistoryPicksToProject(historyPickProjectId, historyPickIds);
                }}
                className="flex-1 selection-work-btn-primary hover:opacity-90 py-2 rounded-lg text-sm disabled:opacity-50"
              >
                {historyPickAdding
                  ? "Добавление…"
                  : `Добавить${historyPickIds.length ? ` (${historyPickIds.length})` : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
