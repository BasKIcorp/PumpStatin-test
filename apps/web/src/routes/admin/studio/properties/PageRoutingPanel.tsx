import type { PageConfig, SiteConfig } from "@pumpstation/contracts";
import { validatePageRoute } from "@pumpstation/contracts";
import { FIGMA } from "../figma/figmaTokens";

const inputClass =
  "w-full rounded border-0 px-2 py-1.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#0d99ff]";

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

export function PageRoutingPanel({
  page,
  site,
  onChange,
}: {
  page: PageConfig;
  site: SiteConfig;
  onChange: (patch: Partial<PageConfig>) => void;
}) {
  const routeError = validatePageRoute(site, page.id, page.route);

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-white">Маршрутизация</div>
      <Field label="Название">
        <input
          className={inputClass}
          style={{ background: FIGMA.inputBg }}
          value={page.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </Field>
      <Field label="Маршрут (URL)">
        <input
          className={`${inputClass} font-mono text-xs`}
          style={{ background: FIGMA.inputBg }}
          value={page.route}
          onChange={(e) => onChange({ route: e.target.value })}
          placeholder="/wizard"
        />
        {routeError ? (
          <p className="mt-1 text-[10px] text-red-400">{routeError}</p>
        ) : (
          <p className="mt-1 text-[10px] text-[#666]">
            Страница: <span className="font-mono text-[#0d99ff]">{page.route || "—"}</span>
          </p>
        )}
      </Field>
      <Field label="ID страницы">
        <input
          className={`${inputClass} font-mono text-xs opacity-70`}
          style={{ background: FIGMA.inputBg }}
          value={page.id}
          readOnly
        />
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
  );
}
