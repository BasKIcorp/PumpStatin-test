import { useEffect, useState } from "react";
import { apiFetch } from "@/api/client";

export function VersionPanel({ profileId }: { profileId?: string }) {
  const [versions, setVersions] = useState<
    { hash: string; timestamp: string; message: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [rollbackMsg, setRollbackMsg] = useState("");
  const [publishMsg, setPublishMsg] = useState("");
  const [status, setStatus] = useState<{ dirty: boolean; changes: string[] } | null>(null);

  const loadVersions = () => {
    if (!profileId) return;
    apiFetch<{ versions: typeof versions }>(
      `/api/v1/admin/profiles/${encodeURIComponent(profileId)}/versions`,
    )
      .then((d) => setVersions(d.versions ?? []))
      .catch(() => {});
  };

  const loadStatus = () => {
    if (!profileId) return;
    apiFetch<{ dirty: boolean; changes: string[] }>(
      `/api/v1/admin/profiles/${encodeURIComponent(profileId)}/status`,
    )
      .then(setStatus)
      .catch(() => {});
  };

  useEffect(() => {
    if (!profileId) return;
    setLoading(true);
    Promise.all([
      apiFetch<{ versions: typeof versions }>(
        `/api/v1/admin/profiles/${encodeURIComponent(profileId)}/versions`,
      ),
      apiFetch<{ dirty: boolean; changes: string[] }>(
        `/api/v1/admin/profiles/${encodeURIComponent(profileId)}/status`,
      ),
    ])
      .then(([v, s]) => {
        setVersions(v.versions ?? []);
        setStatus(s);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profileId]);

  const handleSnapshot = async () => {
    if (!profileId) return;
    setSaveMsg("");
    try {
      await apiFetch(
        `/api/v1/admin/profiles/${encodeURIComponent(profileId)}/snapshot`,
        {
          method: "POST",
          body: JSON.stringify({ message: msg || `Снимок ${new Date().toLocaleString("ru-RU")}` }),
        },
      );
      setSaveMsg("Снимок создан");
      loadVersions();
      setTimeout(() => setSaveMsg(""), 2000);
    } catch (e) {
      setSaveMsg("Ошибка: " + (e instanceof Error ? e.message : "unknown"));
    }
  };

  const handleRollback = async (hash: string) => {
    if (!profileId) return;
    if (!confirm(`Откатить профиль к коммиту ${hash}?`)) return;
    setRollbackMsg("");
    try {
      await apiFetch(
        `/api/v1/admin/profiles/${encodeURIComponent(profileId)}/rollback/${hash}`,
        { method: "POST" },
      );
      setRollbackMsg(`Откат к ${hash} выполнен. Обновите страницу.`);
    } catch (e) {
      setRollbackMsg("Ошибка: " + (e instanceof Error ? e.message : "unknown"));
    }
  };

  const handlePublish = async () => {
    if (!profileId) return;
    if (!confirm("Опубликовать изменения на продакшн?")) return;
    setPublishMsg("");
    try {
      const resp = await apiFetch<{ ok: boolean; message: string; push?: string }>(
        `/api/v1/admin/profiles/${encodeURIComponent(profileId)}/publish`,
        { method: "POST" },
      );
      if (resp.ok) {
        setPublishMsg("✅ Опубликовано!");
        loadStatus();
      } else {
        setPublishMsg("❌ Ошибка публикации");
      }
    } catch (e) {
      setPublishMsg("❌ Ошибка: " + (e instanceof Error ? e.message : "unknown"));
    }
    setTimeout(() => setPublishMsg(""), 5000);
  };

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-700">Версионирование и публикация</h3>
        {status && (
          <span
            className={`rounded px-2 py-0.5 text-[10px] font-medium ${
              status.dirty
                ? "bg-yellow-100 text-yellow-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {status.dirty ? "⚡ Есть изменения" : "✅ Синхронизировано"}
          </span>
        )}
      </div>

      {/* Status summary */}
      {status && status.dirty && status.changes.length > 0 && (
        <div className="mb-3 rounded bg-yellow-50 px-2 py-1">
          <div className="text-[10px] font-medium text-yellow-700">Несохранённые изменения:</div>
          {status.changes.filter(Boolean).map((line, i) => (
            <div key={i} className="font-mono text-[10px] text-yellow-600">
              {line}
            </div>
          ))}
        </div>
      )}

      {/* Snapshot */}
      <div className="mb-3 flex items-center gap-2">
        <input
          className="flex-1 rounded border px-2 py-1 text-sm"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Описание снимка..."
        />
        <button
          type="button"
          onClick={handleSnapshot}
          className="rounded bg-[#13347f] px-3 py-1.5 text-sm text-white hover:bg-[#0f2866]"
        >
          Снимок
        </button>
      </div>

      {/* Publish button */}
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={handlePublish}
          className="rounded bg-green-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-800"
        >
          🚀 Опубликовать на прод
        </button>
        {publishMsg && (
          <span className="text-xs font-medium">{publishMsg}</span>
        )}
      </div>

      {saveMsg && (
        <div className="mb-2 rounded bg-green-100 px-2 py-1 text-xs text-green-700">{saveMsg}</div>
      )}
      {rollbackMsg && (
        <div className="mb-2 rounded bg-yellow-50 px-2 py-1 text-xs text-yellow-700">{rollbackMsg}</div>
      )}

      {/* History */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase text-neutral-500">
          История ({versions.length})
        </h4>
        {loading ? (
          <p className="text-xs text-neutral-400">Загрузка...</p>
        ) : versions.length === 0 ? (
          <p className="text-xs text-neutral-400">
            Нет снимков. Сделайте первый снимок выше.
          </p>
        ) : (
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {versions.map((v) => (
              <div
                key={v.hash}
                className="flex items-center justify-between rounded bg-neutral-50 px-2 py-1.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-mono text-neutral-500">
                    {v.hash}
                  </div>
                  <div className="truncate text-xs text-neutral-700">
                    {v.message}
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    {new Date(v.timestamp).toLocaleString("ru-RU")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRollback(v.hash)}
                  className="rounded px-1.5 py-0.5 text-[10px] text-orange-600 hover:bg-orange-50"
                >
                  Откатить
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
