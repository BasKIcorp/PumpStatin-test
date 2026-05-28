import { useEffect, useState } from "react";
import {
  fetchAdminMeta,
  fetchAdminProfileDetail,
  fetchAdminProfiles,
  updateAdminBranding,
  updateAdminProfilePlugins,
  type AdminMeta,
  type AdminProfileRow,
} from "@/api/admin";

export function AdminProfilesPage() {
  const [rows, setRows] = useState<AdminProfileRow[]>([]);
  const [meta, setMeta] = useState<AdminMeta | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [plugins, setPlugins] = useState({
    displayName: "",
    theme: "",
    algorithm: "",
    database: "",
    pdfTemplate: "",
    layoutVariant: "",
    active: true,
  });
  const [brandingYaml, setBrandingYaml] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAdminProfiles().then((r) => {
      setRows(r.profiles);
      if (r.profiles[0]) setSelectedId(r.profiles[0].profile.id);
    });
    fetchAdminMeta().then(setMeta).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetchAdminProfileDetail(selectedId)
      .then((d) => {
        const p = d.profile;
        const reg = d.registry ?? {};
        setPlugins({
          displayName: String(p.displayName ?? reg.displayName ?? ""),
          theme: String(p.theme ?? ""),
          algorithm: String(p.algorithm ?? ""),
          database: String(p.database ?? ""),
          pdfTemplate: String(p.pdfTemplate ?? ""),
          layoutVariant: String(
            (d.branding as { layoutVariant?: string }).layoutVariant ??
              reg.layoutVariant ??
              "",
          ),
          active: p.active !== false,
        });
        setBrandingYaml(JSON.stringify(d.branding, null, 2));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"));
  }, [selectedId]);

  const savePlugins = async () => {
    if (!selectedId) return;
    setError("");
    try {
      await updateAdminProfilePlugins(selectedId, plugins);
      setMessage("Плагины и витрина сохранены");
      const r = await fetchAdminProfiles();
      setRows(r.profiles);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const saveBranding = async () => {
    if (!selectedId) return;
    setError("");
    try {
      const branding = JSON.parse(brandingYaml) as Record<string, unknown>;
      await updateAdminBranding(selectedId, branding);
      setMessage("Брендинг сохранён");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неверный JSON или ошибка API");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Профили, фронт и PDF</h1>
      <p className="text-sm text-neutral-600">
        Профиль задаёт алгоритм подбора, источник данных, тему UI и шаблон PDF. Брендинг — цвета,
        тексты и вариант layout.
      </p>

      {message ? <p className="text-sm text-green-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {rows.map((r) => (
          <button
            key={r.profile.id}
            type="button"
            onClick={() => {
              setSelectedId(r.profile.id);
              setMessage("");
            }}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              selectedId === r.profile.id
                ? "border-[#13347f] bg-[#13347f] text-white"
                : "border-neutral-300 bg-white hover:bg-neutral-50"
            }`}
          >
            {r.profile.displayName ?? r.profile.id}
          </button>
        ))}
      </div>

      {selectedId && meta ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="text-sm font-semibold">Плагины ({selectedId})</h2>
            <Select
              label="Алгоритм"
              value={plugins.algorithm}
              options={meta.algorithms}
              onChange={(v) => setPlugins({ ...plugins, algorithm: v })}
            />
            <Select
              label="База данных"
              value={plugins.database}
              options={meta.databases}
              onChange={(v) => setPlugins({ ...plugins, database: v })}
            />
            <Select
              label="Тема UI"
              value={plugins.theme}
              options={meta.themes}
              onChange={(v) => {
                const pdf = meta.themePdfPairs[v];
                setPlugins({
                  ...plugins,
                  theme: v,
                  pdfTemplate: pdf ?? plugins.pdfTemplate,
                });
              }}
            />
            <Select
              label="Шаблон PDF"
              value={plugins.pdfTemplate}
              options={meta.pdfTemplates}
              onChange={(v) => setPlugins({ ...plugins, pdfTemplate: v })}
            />
            <Select
              label="Вариант layout (фронт)"
              value={plugins.layoutVariant}
              options={meta.layoutVariants}
              onChange={(v) => setPlugins({ ...plugins, layoutVariant: v })}
            />
            <label className="block text-xs text-neutral-600">
              Название
              <input
                className="field mt-1"
                value={plugins.displayName}
                onChange={(e) => setPlugins({ ...plugins, displayName: e.target.value })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={plugins.active}
                onChange={(e) => setPlugins({ ...plugins, active: e.target.checked })}
              />
              Профиль активен
            </label>
            <button type="button" className="btn-primary" onClick={() => void savePlugins()}>
              Сохранить плагины
            </button>
          </section>

          <section className="flex flex-col rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold">Брендинг (JSON)</h2>
            <textarea
              className="min-h-[320px] flex-1 font-mono text-xs"
              value={brandingYaml}
              onChange={(e) => setBrandingYaml(e.target.value)}
              spellCheck={false}
            />
            <button type="button" className="btn-primary mt-3 self-start" onClick={() => void saveBranding()}>
              Сохранить брендинг
            </button>
            <p className="mt-2 text-xs text-neutral-500">
              HTML-шаблоны PDF:{" "}
              {meta.pdfTemplateFiles.map((t) => t.id).join(", ")} (редактирование в файловой системе)
            </p>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs text-neutral-600">
      {label}
      <select className="field mt-1" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
