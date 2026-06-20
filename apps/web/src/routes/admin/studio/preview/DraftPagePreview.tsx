import { useEffect, useState } from "react";
import type { PageConfig, SiteConfig } from "@pumpstation/contracts";
import type { ProfileBundle } from "@/api/config";
import { SitePage } from "@/engine/SitePage";
import { WizardLiveCanvas } from "@/routes/admin/studio/wizard/WizardLiveCanvas";
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
  const wizardStepId = previewWizardStepId ?? "product-class";

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const content =
    page.type === "wizard" && bundle ? (
      <WizardLiveCanvas
        page={page}
        site={site}
        bundle={bundle}
        previewStepId={wizardStepId}
      />
    ) : (
      <SitePage page={page} site={site} />
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
          {content}
        </div>
      </PreviewViewport>
    </div>
  );
}
