import { useEffect, useState } from "react";
import type { PageConfig, SiteConfig } from "@pumpstation/contracts";
import type { ProfileBundle } from "@/api/config";
import { SitePage } from "@/engine/SitePage";
import { StudioProfileProvider } from "@/providers/StudioProfileProvider";
import { FIGMA } from "../figma/figmaTokens";
import { PreviewToolbar } from "./PreviewToolbar";
import { PreviewViewport, type PreviewViewportId } from "./previewViewport";

/** Inline preview of the current editor draft — read-only, full-screen capable */
export function DraftPagePreview({
  page,
  site,
  bundle,
  previewWizardStepId,
  onClose,
}: {
  page: PageConfig;
  site: SiteConfig;
  /** Черновик wizard/branding для превью визарда */
  bundle?: ProfileBundle;
  previewWizardStepId?: string;
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

  const content = (
    <SitePage
      page={page}
      site={site}
      previewWizardStepId={page.type === "wizard" ? previewWizardStepId : undefined}
    />
  );

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col"
      style={{ background: FIGMA.appBg }}
      data-testid="draft-page-preview"
    >
      <PreviewToolbar
        title={page.type === "wizard" ? "Превью визарда (черновик)" : "Превью (черновик)"}
        hint="Только просмотр — кнопки и ссылки неактивны"
        viewportId={viewportId}
        onViewportChange={setViewportId}
        onClose={onClose}
      />
      <PreviewViewport viewportId={viewportId}>
        <div className={page.type === "wizard" ? "min-h-[100dvh] w-full" : "min-h-full w-full"}>
          {bundle ? <StudioProfileProvider bundle={bundle}>{content}</StudioProfileProvider> : content}
        </div>
      </PreviewViewport>
    </div>
  );
}
