import { useMemo, useState } from "react";
import type { PageConfig, SiteConfig } from "@pumpstation/contracts";
import type { ProfileBundle } from "@/api/config";
import { SitePage } from "@/engine/SitePage";
import { StudioProfileProvider } from "@/providers/StudioProfileProvider";
import { FIGMA } from "../figma/figmaTokens";
import { PreviewToolbar } from "./PreviewToolbar";
import { PreviewViewport, type PreviewViewportId } from "./previewViewport";

function sortPreviewPages(pages: PageConfig[]): PageConfig[] {
  return [...pages].sort((a, b) => {
    if (a.inMenu !== b.inMenu) return a.inMenu ? -1 : 1;
    return a.title.localeCompare(b.title, "ru");
  });
}

function wizardPreviewStepId(page: PageConfig, bundle: ProfileBundle): string | undefined {
  if (page.type !== "wizard") return undefined;
  const frameSteps = page.frames ? Object.keys(page.frames) : [];
  if (frameSteps.length > 0) return frameSteps[0];
  const nav = bundle.wizard?.navigation as { steps?: { id: string }[] } | undefined;
  return nav?.steps?.[0]?.id;
}

/** Превью всего сайта с текущим черновиком (pages + layout + wizard nav) */
export function DraftSitePreview({
  site,
  bundle,
  onClose,
}: {
  site: SiteConfig;
  bundle: ProfileBundle;
  onClose: () => void;
}) {
  const sorted = useMemo(() => sortPreviewPages(site.pages), [site.pages]);
  const [pageId, setPageId] = useState(() => sorted[0]?.id ?? "");
  const page = sorted.find((p) => p.id === pageId) ?? sorted[0];
  const [viewportId, setViewportId] = useState<PreviewViewportId>("full");

  if (!page) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#888]">
        Нет страниц для превью
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" style={{ background: FIGMA.appBg }}>
      <PreviewToolbar
        title="Превью сайта (черновик)"
        hint="Только просмотр — кнопки и ссылки неактивны"
        viewportId={viewportId}
        onViewportChange={setViewportId}
        onClose={onClose}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <nav
          className="w-48 shrink-0 overflow-y-auto border-r py-2"
          style={{ borderColor: FIGMA.panelBorder, background: FIGMA.panel }}
        >
          {sorted.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setPageId(p.id);
                setViewportId("full");
              }}
              className="block w-full truncate px-3 py-1.5 text-left text-xs"
              style={
                p.id === pageId
                  ? { background: FIGMA.accentSoft, color: FIGMA.accent }
                  : { color: FIGMA.textMuted }
              }
            >
              {p.title}
              {p.type && p.type !== "page" ? (
                <span className="ml-1 text-[9px] opacity-60">({p.type})</span>
              ) : null}
            </button>
          ))}
        </nav>

        <PreviewViewport viewportId={viewportId}>
          <StudioProfileProvider bundle={bundle}>
            <SitePage
              key={page.id}
              page={page}
              site={site}
              previewWizardStepId={wizardPreviewStepId(page, bundle)}
            />
          </StudioProfileProvider>
        </PreviewViewport>
      </div>
    </div>
  );
}
