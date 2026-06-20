import type { PageConfig, SiteConfig } from "@pumpstation/contracts";
import type { ProfileBundle } from "@/api/config";
import { WizardGridPage } from "@/engine/WizardGridPage";
import { StudioProfileProvider } from "@/providers/StudioProfileProvider";
import { WizardStudioContext } from "./WizardStudioContext";

/**
 * Единый WYSIWYG-канvas визарда для Studio и DraftPagePreview.
 * Тот же путь рендеринга, что на live `/wizard`.
 */
export function WizardLiveCanvas({
  page,
  site,
  bundle,
  previewStepId,
  selectedCardId,
  onSelectCard,
  minHeight = "100dvh",
}: {
  page: PageConfig;
  site: SiteConfig;
  bundle: ProfileBundle;
  previewStepId: string;
  selectedCardId?: string | null;
  onSelectCard?: (cardId: string) => void;
  minHeight?: string;
}) {
  return (
    <StudioProfileProvider bundle={bundle}>
      <WizardStudioContext.Provider value={{ selectedCardId, onSelectCard }}>
        <div className="w-full bg-white" style={{ minHeight }}>
          <WizardGridPage
            page={page}
            site={site}
            previewStepId={previewStepId}
            selectedCardId={selectedCardId}
            onSelectCard={onSelectCard}
          />
        </div>
      </WizardStudioContext.Provider>
    </StudioProfileProvider>
  );
}
