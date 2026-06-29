import { ThemeEditor } from "@/routes/admin/studio/theme/ThemeEditor";
import { MenuEditor, FooterEditor } from "@/routes/admin/studio/layout/LayoutEditor";
import { SiteRoutingEditor } from "@/routes/admin/studio/frontend/SiteRoutingEditor";
import type { SiteConfig } from "@pumpstation/contracts";
import { FIGMA } from "../figma/figmaTokens";

export function SiteSettingsEditor({
  branding,
  layout,
  routing,
  pages,
  profileId,
  onSaveTheme,
  onSaveLayout,
  onSaveRouting,
}: {
  branding: Record<string, unknown>;
  layout: SiteConfig["layout"];
  routing: SiteConfig["routing"];
  pages: SiteConfig["pages"];
  profileId?: string;
  onSaveTheme: (branding: Record<string, unknown>) => void;
  onSaveLayout: (layout: SiteConfig["layout"]) => void;
  onSaveRouting: (routing: NonNullable<SiteConfig["routing"]>) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 overflow-auto p-6" style={{ background: FIGMA.appBg }}>
      <div className="mx-auto w-full max-w-3xl space-y-8 rounded-lg bg-white p-6 shadow-xl">
        <ThemeEditor branding={branding} profileId={profileId} onSave={onSaveTheme} />
        <hr className="border-neutral-200" />
        <SiteRoutingEditor routing={routing} pages={pages} onChange={onSaveRouting} />
        <hr className="border-neutral-200" />
        <MenuEditor
          menu={layout.header.menu}
          pageOptions={pages.map((p) => ({ id: p.id, title: p.title }))}
          onChange={(menu) => onSaveLayout({ ...layout, header: { ...layout.header, menu } })}
        />
        <hr className="border-neutral-200" />
        <FooterEditor
          footer={layout.footer}
          pageOptions={pages.map((p) => ({ id: p.id, title: p.title }))}
          onChange={(footer) => onSaveLayout({ ...layout, footer })}
        />
      </div>
    </div>
  );
}
