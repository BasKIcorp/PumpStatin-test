import { useEffect } from "react";
import type { PageConfig, SiteConfig } from "@pumpstation/contracts";
import { useProfile } from "@/providers/ProfileProvider";
import { useWizardStore } from "@/stores/wizardStore";
import { readPersistedWizardStep } from "@/lib/wizardPersistence";
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
  const { branding, wizard, profile } = useProfile();
  const storeStep = useWizardStore((s) => s.step);
  const step = previewStepId ?? storeStep;
  const initFromNavigation = useWizardStore((s) => s.initFromNavigation);
  const isStrela = branding.layoutVariant === "strela-funnel";
  const nav = wizard.navigation as NavigationConfig;
  const stepDef = nav.steps?.find((s) => s.id === step);
  const cards = nav.cards?.[step] ?? [];
  const profileId = profile.id;
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
    const stepIds = nav?.steps?.map((s) => s.id) ?? [];
    const restored = readPersistedWizardStep(profileId, stepIds);
    if (restored && restored !== storeStep && stepIds.includes(restored)) {
      useWizardStore.setState({ step: restored });
      return;
    }
    const first = stepIds[0];
    if (first && !stepIds.includes(storeStep)) {
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
