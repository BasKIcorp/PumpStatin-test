import type { PageConfig, SiteConfig } from "@pumpstation/contracts";
import { validatePageRoute } from "@pumpstation/contracts";
import { FIGMA } from "../figma/figmaTokens";

const LAYOUT_VARIANTS = [
  "strela-funnel",
  "sidebar-brand",
  "topbar-dark",
  "minimal-light",
  "sidebar-gradient",
  "auth-minimal",
  "cms-default",
];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] text-[#b3b3b3]">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded border-0 px-2 py-1.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#0d99ff]";

export function PagePropertiesPanel({
  page,
  site,
  onChange,
}: {
  page: PageConfig;
  site?: SiteConfig;
  onChange: (patch: Partial<PageConfig>) => void;
}) {
  const routeError = site ? validatePageRoute(site, page.id, page.route) : null;

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 text-xs font-medium text-white">Страница</div>
        <div className="space-y-3">
          <Field label="Название">
            <input
              className={inputClass}
              style={{ background: FIGMA.inputBg }}
              value={page.title}
              onChange={(e) => onChange({ title: e.target.value })}
            />
          </Field>
          <Field label="Маршрут">
            <input
              className={`${inputClass} font-mono text-xs`}
              style={{ background: FIGMA.inputBg }}
              value={page.route}
              onChange={(e) => onChange({ route: e.target.value })}
            />
            {routeError ? (
              <p className="mt-1 text-[10px] text-red-400">{routeError}</p>
            ) : null}
          </Field>
          <Field label="Профиль страницы">
            <select
              className={inputClass}
              style={{ background: FIGMA.inputBg }}
              value={page.pageProfile ?? ""}
              onChange={(e) => onChange({ pageProfile: e.target.value || undefined })}
            >
              <option value="">— по умолчанию —</option>
              {LAYOUT_VARIANTS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Тип страницы">
            <select
              className={inputClass}
              style={{ background: FIGMA.inputBg }}
              value={page.type ?? "page"}
              onChange={(e) =>
                onChange({ type: e.target.value as PageConfig["type"] })
              }
            >
              <option value="page">CMS</option>
              <option value="wizard">Визард</option>
              <option value="auth">Авторизация</option>
              <option value="cabinet">Кабинет</option>
            </select>
          </Field>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-[#b3b3b3]">
            <input
              type="checkbox"
              checked={page.inMenu}
              onChange={(e) => onChange({ inMenu: e.target.checked })}
              className="rounded border-[#555]"
            />
            Показывать в меню
          </label>
        </div>
      </div>
      <p className="text-[11px] leading-relaxed text-[#666]">
        Выберите блок на сетке или в «Слоях». Перетаскивание и resize — при выбранном блоке.
      </p>
    </div>
  );
}
