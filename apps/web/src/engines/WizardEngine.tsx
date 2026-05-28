import { useProfile } from "@/providers/ProfileProvider";
import { useWizardStore } from "@/stores/wizardStore";
import { CardGridStep } from "@/components/wizard/CardGridStep";
import { SelectionFormStep } from "@/components/wizard/SelectionFormStep";
import { StrelaCardGridStep } from "@/components/strela/StrelaCardGridStep";
import { StrelaSelectionFormStep } from "@/components/strela/StrelaSelectionFormStep";
import type { NavigationConfig } from "@/types/wizard";
import type { WizardStepId } from "@/stores/wizardStore";

function stepMeta(nav: NavigationConfig, stepId: WizardStepId) {
  const def = nav.steps?.find((s) => s.id === stepId);
  return {
    title: def?.title,
    subtitle: def?.subtitle,
    titleKey: def?.titleKey,
    subtitleKey: def?.subtitleKey,
  };
}

export function WizardEngine() {
  const { wizard, branding } = useProfile();
  const step = useWizardStore((s) => s.step);
  const nav = wizard.navigation as NavigationConfig;
  const isStrela = branding.layoutVariant === "strela-funnel";

  if (isStrela && step === "selection-form") {
    return <StrelaSelectionFormStep />;
  }

  const cardSteps: WizardStepId[] = [
    "product-class",
    "hm-line",
    "pu-line",
    "simpel-line",
    "installation-type",
  ];

  if (cardSteps.includes(step)) {
    const cards = nav.cards[step] ?? [];
    const meta = stepMeta(nav, step);
    if (isStrela) {
      return (
        <StrelaCardGridStep
          stepId={step}
          title={meta.title}
          subtitle={meta.subtitle}
          titleKey={meta.titleKey}
          subtitleKey={meta.subtitleKey}
          cards={cards}
        />
      );
    }
    return (
      <CardGridStep
        stepId={step}
        title={meta.title}
        subtitle={meta.subtitle}
        titleKey={meta.titleKey}
        subtitleKey={meta.subtitleKey}
        cards={cards}
      />
    );
  }

  if (step === "selection-form") {
    return <SelectionFormStep />;
  }

  return null;
}
