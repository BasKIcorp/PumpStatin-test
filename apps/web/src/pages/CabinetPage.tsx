import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import type { SelectionHistoryItem, SelectionProjectItem } from "@pumpstation/contracts";
import {
  attachSelectionsToProject,
  createSelectionProject,
  getSelectionHistory,
  getSelectionProjects,
} from "@/api/selection";
import { AppShell } from "@/components/layout/AppShell";

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ru-RU");
}

export function CabinetPage() {
  const [history, setHistory] = useState<SelectionHistoryItem[]>([]);
  const [projects, setProjects] = useState<SelectionProjectItem[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [selectedProject, setSelectedProject] = useState<number | "">("");
  const [selectedHistory, setSelectedHistory] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const selectedIds = useMemo(
    () => Object.keys(selectedHistory).filter((id) => selectedHistory[id]),
    [selectedHistory],
  );

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const [historyItems, projectItems] = await Promise.all([
        getSelectionHistory(),
        getSelectionProjects(),
      ]);
      setHistory(historyItems);
      setProjects(projectItems);
      if (!selectedProject && projectItems[0]) {
        setSelectedProject(projectItems[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки кабинета");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createProject = async () => {
    const name = newProjectName.trim();
    if (!name) return;
    setBusy(true);
    setError("");
    try {
      const created = await createSelectionProject(name);
      setNewProjectName("");
      await refresh();
      setSelectedProject(created.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать проект");
    } finally {
      setBusy(false);
    }
  };

  const attach = async () => {
    if (!selectedProject || selectedIds.length === 0) return;
    setBusy(true);
    setError("");
    try {
      await attachSelectionsToProject(selectedProject, selectedIds);
      setSelectedHistory({});
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось добавить подборы в проект");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Личный кабинет: проекты и история подборов</h1>
        <Link href="/" className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">
          К подбору
        </Link>
      </div>
      {error ? <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
      {loading ? (
        <div className="text-sm text-neutral-500">Загрузка…</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1.8fr]">
          <section className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="mb-3 text-lg font-semibold">Проекты</h2>
            <div className="mb-3 flex gap-2">
              <input
                className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
                placeholder="Название проекта"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
              <button
                type="button"
                onClick={() => void createProject()}
                disabled={busy || newProjectName.trim().length === 0}
                className="rounded bg-[var(--color-primary)] px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                Создать
              </button>
            </div>
            <ul className="space-y-2">
              {projects.map((project) => (
                <li key={project.id} className="rounded border border-neutral-200 px-2 py-2 text-sm">
                  <label className="flex cursor-pointer items-center justify-between gap-2">
                    <span className="font-medium">{project.name}</span>
                    <input
                      type="radio"
                      name="project"
                      checked={selectedProject === project.id}
                      onChange={() => setSelectedProject(project.id)}
                    />
                  </label>
                  <p className="mt-1 text-xs text-neutral-500">
                    Подборов: {project.selections_count} · {formatDate(project.created_at)}
                  </p>
                </li>
              ))}
              {projects.length === 0 ? <li className="text-sm text-neutral-500">Пока нет проектов</li> : null}
            </ul>
          </section>
          <section className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">История подборов</h2>
              <button
                type="button"
                onClick={() => void attach()}
                disabled={busy || !selectedProject || selectedIds.length === 0}
                className="rounded bg-[var(--color-accent)] px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                Добавить в проект
              </button>
            </div>
            <ul className="space-y-2">
              {history.map((item) => (
                <li key={item.selection_id} className="rounded border border-neutral-200 px-3 py-2">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedHistory[item.selection_id])}
                      onChange={(e) =>
                        setSelectedHistory((prev) => ({
                          ...prev,
                          [item.selection_id]: e.target.checked,
                        }))
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.summary}</p>
                      <p className="text-xs text-neutral-500">
                        {item.product_line.toUpperCase()} · {item.flow_id} · {formatDate(item.created_at)}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Проект: {item.project_id ? `#${item.project_id}` : "не назначен"}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
              {history.length === 0 ? <li className="text-sm text-neutral-500">История пока пуста</li> : null}
            </ul>
          </section>
        </div>
      )}
    </AppShell>
  );
}
