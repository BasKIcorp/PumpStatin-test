import { useState } from "react";

export interface ThemeEditorProps {
  branding: Record<string, unknown>;
  onSave: (branding: Record<string, unknown>) => void;
}

export function ThemeEditor({ branding, onSave }: ThemeEditorProps) {
  const b = branding as Record<string, any>;
  const colors: Record<string, string> = b.colors ?? {};
  const fonts: Record<string, string> = b.fonts ?? {};
  const assets: Record<string, string> = b.assets ?? {};
  const appearance: Record<string, unknown> = b.appearance ?? {};

  const [form, setForm] = useState({
    appTitle: String(b.appTitle ?? ""),
    layoutVariant: String(b.layoutVariant ?? "sidebar-brand"),
    primary: colors.primary ?? "#13347f",
    accent: colors.accent ?? "#71d0f9",
    background: colors.background ?? "#ffffff",
    surface: colors.surface ?? "#ffffff",
    text: colors.text ?? "#000000",
    fontBody: fonts.body ?? '"Segoe UI", system-ui, sans-serif',
    fontAccent: fonts.accent ?? "Caveat, cursive",
    logoUrl: assets.logoUrl ?? "",
    funnelBg: String(appearance.funnelBackground ?? "#f5f7fa"),
    panelBorder: String(appearance.panelBorder ?? "#d1d5db"),
  });

  const layoutOptions = [
    "strela-funnel",
    "sidebar-brand",
    "topbar-dark",
    "minimal-light",
    "sidebar-gradient",
  ];

  const handleSave = () => {
    onSave({
      appTitle: form.appTitle,
      layoutVariant: form.layoutVariant,
      colors: {
        primary: form.primary,
        accent: form.accent,
        background: form.background,
        surface: form.surface,
        text: form.text,
      },
      fonts: {
        body: form.fontBody,
        accent: form.fontAccent,
      },
      assets: {
        logoUrl: form.logoUrl,
        favicon: "/favicon.ico",
      },
      appearance: {
        ...appearance,
        funnelBackground: form.funnelBg,
        panelBorder: form.panelBorder,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-700">Глобальные стили</h3>
        <button
          type="button"
          onClick={handleSave}
          className="rounded bg-[#13347f] px-4 py-1.5 text-sm text-white hover:bg-[#0f2866]"
        >
          Сохранить
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-3">
          <h4 className="text-xs font-semibold uppercase text-neutral-500">Основное</h4>

          <Field label="Название сайта">
            <input
              className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
              value={form.appTitle}
              onChange={(e) => setForm({ ...form, appTitle: e.target.value })}
            />
          </Field>

          <Field label="Вариант layout">
            <select
              className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
              value={form.layoutVariant}
              onChange={(e) => setForm({ ...form, layoutVariant: e.target.value })}
            >
              {layoutOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </Field>

          <Field label="URL логотипа">
            <input
              className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
              value={form.logoUrl}
              onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
            />
          </Field>
        </section>

        <section className="space-y-3">
          <h4 className="text-xs font-semibold uppercase text-neutral-500">Шрифты</h4>

          <Field label="Основной шрифт">
            <select
              className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
              value={form.fontBody}
              onChange={(e) => setForm({ ...form, fontBody: e.target.value })}
            >
              <option value='"Segoe UI", system-ui, sans-serif'>Segoe UI</option>
              <option value='"Open Sans", system-ui, sans-serif'>Open Sans</option>
              <option value='system-ui, sans-serif'>System UI</option>
            </select>
          </Field>

          <Field label="Акцентный шрифт">
            <select
              className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
              value={form.fontAccent}
              onChange={(e) => setForm({ ...form, fontAccent: e.target.value })}
            >
              <option value="Caveat, cursive">Caveat</option>
              <option value='"Segoe UI", system-ui, sans-serif'>Segoe UI</option>
            </select>
          </Field>
        </section>
      </div>

      <section className="space-y-3">
        <h4 className="text-xs font-semibold uppercase text-neutral-500">Цвета</h4>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <ColorPicker
            label="Primary"
            value={form.primary}
            onChange={(v) => setForm({ ...form, primary: v })}
          />
          <ColorPicker
            label="Accent"
            value={form.accent}
            onChange={(v) => setForm({ ...form, accent: v })}
          />
          <ColorPicker
            label="Background"
            value={form.background}
            onChange={(v) => setForm({ ...form, background: v })}
          />
          <ColorPicker
            label="Surface"
            value={form.surface}
            onChange={(v) => setForm({ ...form, surface: v })}
          />
          <ColorPicker
            label="Text"
            value={form.text}
            onChange={(v) => setForm({ ...form, text: v })}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h4 className="text-xs font-semibold uppercase text-neutral-500">appearance.* (воронка)</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorPicker
            label="funnelBackground"
            value={form.funnelBg}
            onChange={(v) => setForm({ ...form, funnelBg: v })}
          />
          <ColorPicker
            label="panelBorder"
            value={form.panelBorder}
            onChange={(v) => setForm({ ...form, panelBorder: v })}
          />
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-600">{label}</label>
      {children}
    </div>
  );
}

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs text-neutral-600">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          className="h-8 w-10 cursor-pointer rounded border border-neutral-300"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          className="w-24 rounded border border-neutral-300 px-2 py-1 text-xs font-mono"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
