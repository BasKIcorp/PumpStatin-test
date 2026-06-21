import type { PageConfig, SiteConfig } from "@pumpstation/contracts";
import type { ProfileBundle } from "@/api/config";
import { WizardGridPage } from "@/engine/WizardGridPage";
import { StudioProfileProvider } from "@/providers/StudioProfileProvider";
import { WizardStudioContext } from "./WizardStudioContext";

/**
 * WYSIWYG-канvas визарда для Studio и DraftPagePreview.
 * embedded=true — сайдбар внутри контейнера, не поверх UI редактора.
 */
export function WizardLiveCanvas({
  page,
  site,
  bundle,
  previewStepId,
  selectedCardId,
  onSelectCard,
  minHeight = "min(100dvh, 900px)",
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
        <div
          className="relative isolate h-full w-full overflow-hidden bg-white"
          style={{ minHeight }}
        >
          <WizardGridPage
            page={page}
            site={site}
            previewStepId={previewStepId}
            selectedCardId={selectedCardId}
            onSelectCard={onSelectCard}
            embedded
          />
        </div>
      </WizardStudioContext.Provider>
    </StudioProfileProvider>
  );
}
