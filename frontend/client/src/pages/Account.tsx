import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import axios from "@/lib/csrf";
import { downloadProjectPackagePdf } from "@/lib/api";
import { readPreferredSiteSlugFromStorage } from "@/lib/site";

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

type ProjectSelection = Pick<
  Selection,
  | "id"
  | "name"
  | "Q"
  | "H"
  | "n1"
  | "n2"
  | "pump_types"
  | "fluid_type"
  | "temperature"
  | "pump_name"
  | "created_at"
> & { has_station_pdf_snapshot?: boolean };

interface Project {
  id: number;
  name: string;
  address: string;
  created_at: string;
  selections: ProjectSelection[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function WorkingPoint({ Q, H }: { Q: number; H: number }) {
  return <span className="text-gray-500 text-sm">{Q} м³/ч; {H} м</span>;
}

export default function Account() {
  const { user, logout, loading } = useAuth();
  const [, navigate] = useLocation();

  const [selections, setSelections] = useState<Selection[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selFilter, setSelFilter] = useState("");
  const [projFilter, setProjFilter] = useState("");

  // Модалка создания проекта
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newProjAddr, setNewProjAddr] = useState("");
  const [creating, setCreating] = useState(false);

  // Модалка добавления подбора в проект
  const [addToProj, setAddToProj] = useState<{ selectionId: number } | null>(null);
  const [targetProject, setTargetProject] = useState<number | "">("");
  const [projectPdfLoadingId, setProjectPdfLoadingId] = useState<number | null>(null);

  const [historyPickProjectId, setHistoryPickProjectId] = useState<number | null>(null);
  const [historyPickFilter, setHistoryPickFilter] = useState("");
  const [historyPickIds, setHistoryPickIds] = useState<number[]>([]);
  const [historyPickAdding, setHistoryPickAdding] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    axios.get("/api/user/selections/").then(r => setSelections(r.data)).catch(() => {});
    axios.get("/api/user/projects/").then(r => setProjects(r.data)).catch(() => {});
  }, [user]);

  async function handleLogout() {
    await logout();
    navigate("/");
  }

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
      const newProj: Project = { id: r.data.id, name: newProjName, address: newProjAddr, created_at: new Date().toISOString(), selections: [] };
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
    await axios.post(`/api/user/projects/${targetProject}/selections/`, { selection_id: addToProj.selectionId });
    const r = await axios.get("/api/user/projects/");
    setProjects(r.data);
    setAddToProj(null);
    setTargetProject("");
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
      window.alert(e instanceof Error ? e.message : "Не удалось сформировать PDF проекта");
    } finally {
      setProjectPdfLoadingId(null);
    }
  }

  const filteredSel = selections.filter(s => {
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
    return label.includes(q) || String(s.Q).includes(q) || String(s.H).includes(q);
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

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Загрузка...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center py-3">
          <a href="/" className="flex items-center space-x-3">
            <img src="/assets/logo.png" alt="Logo" className="h-10 object-contain" />
            <span className="text-lg font-semibold text-gray-800">Конфигуратор насосных станций</span>
          </a>
          <div className="flex items-center space-x-4">
            <a href="/" className="text-sm text-blue-600 hover:underline">+ Новый подбор</a>
            <span className="text-sm text-gray-600">{user.name || user.email}</span>
            <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-red-500 transition-colors">
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Личный кабинет</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── История подборов ──────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col" style={{ maxHeight: 600 }}>
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800 mb-2">История подборов</h2>
              <input
                value={selFilter}
                onChange={e => setSelFilter(e.target.value)}
                placeholder="Название или насос…"
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="overflow-y-auto flex-1">
              {filteredSel.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-10">Нет подборов</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Наименование</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Рабочая точка</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredSel.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {(s.name && s.name.trim()) ? s.name : (s.pump_name || "—")}
                        </td>
                        <td className="px-4 py-3"><WorkingPoint Q={s.Q} H={s.H} /></td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => { setAddToProj({ selectionId: s.id }); setTargetProject(""); }}
                              className="text-xs text-blue-500 hover:text-blue-700 whitespace-nowrap"
                            >
                              В проект
                            </button>
                            <a
                              href={`/?Q=${s.Q}&H=${s.H}&n1=${s.n1}&n2=${s.n2}&fluid=${encodeURIComponent(s.fluid_type || "")}`}
                              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors whitespace-nowrap"
                            >
                              Подобрать
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ── Проекты ───────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col" style={{ maxHeight: 600 }}>
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-semibold text-gray-800">Проекты</h2>
                <button
                  onClick={() => setShowNewProject(true)}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg transition-colors"
                >
                  + Новый проект
                </button>
              </div>
              <input
                value={projFilter}
                onChange={e => setProjFilter(e.target.value)}
                placeholder="Фильтр"
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
              {filteredProj.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-10">Нет проектов</p>
              ) : (
                filteredProj.map(p => (
                  <div key={p.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800">{p.name}</p>
                        {p.address && <p className="text-xs text-gray-400 mt-0.5">{p.address}</p>}
                        <p className="text-xs text-gray-400">{formatDate(p.created_at)} · {p.selections.length} подборов</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => openHistoryPicker(p.id)}
                          className="text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-2 py-1 transition-colors whitespace-nowrap"
                        >
                          + Из истории
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteProject(p.id)}
                          className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                          aria-label="Удалить проект"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {p.selections.length === 0 ? (
                      <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                        Подборов нет — нажмите «+ Из истории» или в таблице слева «В проект».
                      </p>
                    ) : (
                      <>
                        <table className="w-full text-xs mt-2">
                          <thead>
                            <tr className="text-gray-400">
                              <th className="text-left py-1 font-normal">Наименование</th>
                              <th className="text-left py-1 font-normal">Рабочая точка</th>
                              <th className="text-left py-1 font-normal">Дата</th>
                              <th className="text-right py-1 font-normal">Действия</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {p.selections.map(s => (
                              <tr key={s.id}>
                                <td className="py-1.5 pr-2 text-gray-700 font-medium">
                                  {(s.name && s.name.trim()) ? s.name : (s.pump_name || "—")}
                                </td>
                                <td className="py-1.5 pr-2"><WorkingPoint Q={s.Q} H={s.H} /></td>
                                <td className="py-1.5 text-gray-400">{formatDate(s.created_at)}</td>
                                <td className="py-1.5 text-right whitespace-nowrap space-x-2">
                                  <a
                                    href={`/?Q=${s.Q}&H=${s.H}&n1=${s.n1}&n2=${s.n2}&fluid=${encodeURIComponent(s.fluid_type || "")}`}
                                    className="text-blue-600 hover:underline"
                                  >
                                    Повторить
                                  </a>
                                  <button
                                    type="button"
                                    className="text-gray-300 hover:text-red-400"
                                    title="Убрать из проекта"
                                    onClick={() => removeSelectionFromProject(p.id, s.id)}
                                  >
                                    ×
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
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
                          {!p.selections.every((s) => s.has_station_pdf_snapshot) && (
                            <span className="text-[11px] text-amber-800">
                              Нужен расчёт станции на сайте для каждого подбора («Рассчитать», вход в аккаунт).
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Модалка: создать проект */}
      {showNewProject && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Новый проект</h3>
            <div className="space-y-3">
              <input
                autoFocus
                value={newProjName}
                onChange={e => setNewProjName(e.target.value)}
                placeholder="Название проекта"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={newProjAddr}
                onChange={e => setNewProjAddr(e.target.value)}
                placeholder="Адрес объекта (необязательно)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex space-x-2 mt-4">
              <button
                onClick={() => setShowNewProject(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={createProject}
                disabled={creating || !newProjName.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {creating ? "Создание..." : "Создать"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка: добавить в проект */}
      {addToProj && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Добавить в проект</h3>
            {projects.length === 0 ? (
              <p className="text-sm text-gray-500">Нет проектов. Сначала создайте проект.</p>
            ) : (
              <select
                value={targetProject}
                onChange={e => setTargetProject(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={addSelectionToProject}
                disabled={!targetProject}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {historyPickProjectId != null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 flex flex-col max-h-[min(560px,85vh)]">
            <h3 className="text-lg font-semibold text-gray-800">Добавить подборы в проект</h3>
            <p className="text-sm text-gray-600 mt-1 truncate" title={historyPickProject?.name}>
              «{historyPickProject?.name ?? ""}»
            </p>
            {historyPickCandidates.length === 0 ? (
              <p className="text-sm text-gray-500 mt-4">
                Все подборы из истории уже в этом проекте или история пуста.
              </p>
            ) : (
              <>
                <input
                  value={historyPickFilter}
                  onChange={e => setHistoryPickFilter(e.target.value)}
                  placeholder="Поиск по названию, Q, H…"
                  className="mt-4 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex justify-between items-center mt-2 mb-1 gap-2">
                  <span className="text-xs text-gray-400">{historyPickFiltered.length} доступно</span>
                  <button
                    type="button"
                    className="text-xs text-blue-600 hover:text-blue-800 shrink-0"
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
                    <li key={s.id} className="flex items-start gap-3 px-3 py-2 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        className="mt-1 rounded border-gray-300"
                        checked={historyPickIds.includes(s.id)}
                        onChange={() => toggleHistoryPickId(s.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-800 font-medium truncate">
                          {(s.name && s.name.trim()) ? s.name : (s.pump_name || `Подбор #${s.id}`)}
                        </p>
                        <p className="text-xs text-gray-500">
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
                className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50"
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
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm disabled:opacity-50"
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
