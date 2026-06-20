import type { PageConfig, SiteConfig, SiteRoutingConfig } from "@pumpstation/contracts";
import { resolveLandingRoute } from "@pumpstation/contracts";
import { FIGMA } from "../figma/figmaTokens";

export function SiteRoutingEditor({
  routing,
  pages,
  onChange,
}: {
  routing: SiteRoutingConfig | undefined;
  pages: PageConfig[];
  onChange: (routing: SiteRoutingConfig) => void;
}) {
  const landingId = routing?.landingPageId ?? "home";
  const sitePreview: SiteConfig = { layout: { header: { logo: { src: "", width: 0, link: "" }, menu: [], loginButton: true }, footer: { columns: [], copyright: "" } }, pages, routing: { landingPageId: landingId } };
  const landingRoute = resolveLandingRoute(sitePreview);

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-neutral-900">Маршрутизация сайта</h3>
        <p className="mt-1 text-xs text-neutral-500">
          Корень <span className="font-mono">/</span> перенаправляет на выбранную страницу.
        </p>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-700">Стартовая страница (редирект с /)</label>
        <select
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          value={landingId}
          onChange={(e) => onChange({ landingPageId: e.target.value })}
        >
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} ({p.route})
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-neutral-500">
          Сейчас <span className="font-mono">/</span> → <span className="font-mono text-[#0d99ff]">{landingRoute}</span>
        </p>
      </div>
      <div>
        <div className="mb-2 text-xs font-medium text-neutral-700">Все маршруты</div>
        <div className="overflow-hidden rounded border border-neutral-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-3 py-2 font-medium">Страница</th>
                <th className="px-3 py-2 font-medium">Маршрут</th>
                <th className="px-3 py-2 font-medium">Тип</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.id} className="border-t border-neutral-100">
                  <td className="px-3 py-2 text-neutral-900">{p.title}</td>
                  <td className="px-3 py-2 font-mono text-[#0d99ff]">{p.route}</td>
                  <td className="px-3 py-2 text-neutral-500">{p.type ?? "page"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-neutral-500" style={{ color: FIGMA.textMuted }}>
          Маршрут каждой страницы редактируется в режимах «Страницы» и «Визард».
        </p>
      </div>
    </section>
  );
}
