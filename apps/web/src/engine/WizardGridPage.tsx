import { useEffect } from "react";
import type { PageConfig, SiteConfig } from "@pumpstation/contracts";
import { useProfile } from "@/providers/ProfileProvider";
import { useWizardStore } from "@/stores/wizardStore";
import { AppShell } from "@/components/layout/AppShell";
import { StrelaWizardShell } from "@/components/strela/StrelaWizardShell";
import { WizardStepRenderer } from "@/engine/WizardStepRenderer";
import {
  blocksForWizardStep,
  normalizeWizardPage,
} from "@/routes/admin/studio/wizard/wizardUnifiedBlocks";
import {
  frameBlocksForStep,
  usesDecomposedWizardFrames,
} from "@/routes/admin/studio/wizard/wizardFrameUtils";
import type { NavigationConfig } from "@/types/wizard";

/** Wizard page — shell + WizardStepRenderer (frames или WizardEngine) */
export function WizardGridPage({
  page,
  site,
  previewStepId,
  selectedCardId,
  onSelectCard,
  embedded = false,
}: {
  page: PageConfig;
  site?: SiteConfig;
  /** Studio site preview: не читать/не писать wizardStore */
  previewStepId?: string;
  /** Studio: выбор карточки на live-канвасе */
  selectedCardId?: string | null;
  onSelectCard?: (cardId: string) => void;
  /** Studio/preview: сайдбар absolute внутри контейнера, не fixed на viewport */
  embedded?: boolean;
}) {
  const { branding, wizard } = useProfile();
  const storeStep = useWizardStore((s) => s.step);
  const step = previewStepId ?? storeStep;
  const initFromNavigation = useWizardStore((s) => s.initFromNavigation);
  const isStrela = branding.layoutVariant === "strela-funnel";
  const nav = wizard.navigation as NavigationConfig;
  const stepDef = nav.steps?.find((s) => s.id === step);
  const cards = nav.cards?.[step] ?? [];
  const normalizedPage = normalizeWizardPage(page);
  const frameBlocks =
    (normalizedPage.blocks ?? []).some((b) => b.props?.stepId)
      ? blocksForWizardStep(normalizedPage, step)
      : frameBlocksForStep(
          page,
          step,
          stepDef,
          isStrela,
          cards,
          branding.appearance,
        );
  const decomposed = isStrela && usesDecomposedWizardFrames(frameBlocks);

  useEffect(() => {
    if (previewStepId) return;
    const first = nav?.steps?.[0]?.id;
    if (first && storeStep === "product-class") {
      initFromNavigation(first);
    }
  }, [wizard.navigation, initFromNavigation, storeStep, nav?.steps, previewStepId]);

  const inner = (
    <WizardStepRenderer
      page={normalizedPage}
      stepId={step}
      stepDef={stepDef}
      strela={isStrela}
      site={site}
      selectedCardId={selectedCardId}
      onSelectCard={onSelectCard}
    />
  );

  if (isStrela) {
    if (step === "selection-form") {
      return (
        <div className={embedded ? "h-full min-h-0 overflow-auto" : "min-h-[100dvh] overflow-auto"}>
          {inner}
        </div>
      );
    }
    if (decomposed) {
      return (
        <div
          className={
            embedded
              ? "h-full min-h-0 overflow-auto"
              : "min-h-[100dvh] overflow-auto"
          }
        >
          {inner}
        </div>
      );
    }
    return (
      <StrelaWizardShell embedded={embedded} previewStepId={previewStepId}>
        {inner}
      </StrelaWizardShell>
    );
  }

  return <AppShell>{inner}</AppShell>;
}
