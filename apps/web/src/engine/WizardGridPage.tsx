import { useEffect } from "react";
import type { PageConfig, SiteConfig } from "@pumpstation/contracts";
import { useProfile } from "@/providers/ProfileProvider";
import { useWizardStore } from "@/stores/wizardStore";
import { AppShell } from "@/components/layout/AppShell";
import { StrelaWizardShell } from "@/components/strela/StrelaWizardShell";
import { WizardStepRenderer } from "@/engine/WizardStepRenderer";
import type { NavigationConfig } from "@/types/wizard";

/** Wizard page — shell + WizardStepRenderer (frames или WizardEngine) */
export function WizardGridPage({
  page,
  site,
  previewStepId,
  selectedCardId,
  onSelectCard,
}: {
  page: PageConfig;
  site?: SiteConfig;
  /** Studio site preview: не читать/не писать wizardStore */
  previewStepId?: string;
  /** Studio: выбор карточки на live-канвасе */
  selectedCardId?: string | null;
  onSelectCard?: (cardId: string) => void;
}) {
  const { branding, wizard } = useProfile();
  const storeStep = useWizardStore((s) => s.step);
  const step = previewStepId ?? storeStep;
  const initFromNavigation = useWizardStore((s) => s.initFromNavigation);
  const isStrela = branding.layoutVariant === "strela-funnel";
  const nav = wizard.navigation as NavigationConfig;
  const stepDef = nav.steps?.find((s) => s.id === step);

  useEffect(() => {
    if (previewStepId) return;
    const first = nav?.steps?.[0]?.id;
    if (first && storeStep === "product-class") {
      initFromNavigation(first);
    }
  }, [wizard.navigation, initFromNavigation, storeStep, nav?.steps, previewStepId]);

  const inner = (
    <WizardStepRenderer
      page={page}
      stepId={step}
      stepDef={stepDef}
      strela={isStrela}
      site={site}
      selectedCardId={selectedCardId}
      onSelectCard={onSelectCard}
    />
  );

  if (isStrela) {
    // Как в legacy WizardPage: форма подбора без funnel-оболочки
    if (step === "selection-form") {
      return inner;
    }
    return (
      <StrelaWizardShell previewStepId={previewStepId}>{inner}</StrelaWizardShell>
    );
  }

  return <AppShell>{inner}</AppShell>;
}
