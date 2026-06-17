import type { PageConfig } from "@pumpstation/contracts";
import { FIGMA } from "../figma/figmaTokens";

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
  onChange,
}: {
  page: PageConfig;
  onChange: (patch: Partial<PageConfig>) => void;
}) {
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
        Выберите блок на холсте или в панели «Слои», чтобы редактировать его свойства.
      </p>
    </div>
  );
}
