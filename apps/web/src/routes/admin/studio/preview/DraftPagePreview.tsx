import { useEffect, useState } from "react";
import type { PageConfig, SiteConfig } from "@pumpstation/contracts";
import { SitePage } from "@/engine/SitePage";
import { FIGMA } from "../figma/figmaTokens";
import { PreviewToolbar } from "./PreviewToolbar";
import { PreviewViewport, type PreviewViewportId } from "./previewViewport";
/** Inline preview of the current editor draft — read-only, full-screen capable */
export function DraftPagePreview({
  page,
  site,
  onClose,
}: {
  page: PageConfig;
  site: SiteConfig;
  onClose: () => void;
}) {
  const [viewportId, setViewportId] = useState<PreviewViewportId>("full");

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col"
      style={{ background: FIGMA.appBg }}
      data-testid="draft-page-preview"
    >
      <PreviewToolbar
        title="Превью (черновик)"
        hint="Только просмотр — кнопки и ссылки неактивны"
        viewportId={viewportId}
        onViewportChange={setViewportId}
        onClose={onClose}
      />
      <PreviewViewport viewportId={viewportId}>
        <SitePage page={page} site={site} />
      </PreviewViewport>
    </div>
  );
}
