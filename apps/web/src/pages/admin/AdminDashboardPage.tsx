import { useEffect, useState } from "react";
import { fetchAdminMeta, fetchAdminProfiles, fetchAdminUsers, fetchDbStatus } from "@/api/admin";
import type { AdminMeta } from "@/api/admin";

export function AdminDashboardPage() {
  const [meta, setMeta] = useState<AdminMeta | null>(null);
  const [counts, setCounts] = useState({ users: 0, profiles: 0 });
  const [db, setDb] = useState<{ mode: string; editable: boolean } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([fetchAdminMeta(), fetchAdminUsers(), fetchAdminProfiles(), fetchDbStatus()])
      .then(([m, u, p, d]) => {
        setMeta(m);
        setCounts({ users: u.users.length, profiles: p.profiles.length });
        setDb(d);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"));
  }, []);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!meta) {
    return <p className="text-sm text-neutral-500">Загрузка…</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Обзор системы</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Пользователи" value={String(counts.users)} />
        <StatCard label="Профили (витрины)" value={String(counts.profiles)} />
        <StatCard
          label="База данных"
          value={db?.mode === "postgres" ? "PostgreSQL" : "Mock (только чтение)"}
        />
      </div>

      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">Плагины backend</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-neutral-500">Алгоритмы подбора</dt>
            <dd className="font-mono text-xs">{meta.algorithms.join(", ")}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Адаптеры БД</dt>
            <dd className="font-mono text-xs">{meta.databases.join(", ")}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Шаблоны PDF</dt>
            <dd className="font-mono text-xs">{meta.pdfTemplates.join(", ")}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Темы фронта</dt>
            <dd className="font-mono text-xs">{meta.themes.join(", ")}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">Среда</h2>
        <ul className="space-y-1 text-sm text-neutral-700">
          <li>
            Профиль по умолчанию: <code className="text-xs">{meta.runtime.appProfileId}</code>
          </li>
          <li>USE_MOCK_DB: {meta.runtime.useMockDb ? "да" : "нет"}</li>
        </ul>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
