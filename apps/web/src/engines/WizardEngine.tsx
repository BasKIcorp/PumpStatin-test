import { useEffect, useMemo } from "react";
import { useProfile } from "@/providers/ProfileProvider";
import { useWizardStore } from "@/stores/wizardStore";
import { evaluateWhen } from "@/lib/evaluateWhen";
import { CardGridStep } from "@/components/wizard/CardGridStep";
import { SelectionFormStep } from "@/components/wizard/SelectionFormStep";
import { StrelaCardGridStep } from "@/components/strela/StrelaCardGridStep";
import { StrelaSelectionFormStep } from "@/components/strela/StrelaSelectionFormStep";
import type { NavigationConfig, WizardStepDef } from "@/types/wizard";

function stepMeta(def?: WizardStepDef) {
  return {
    title: def?.title,
    subtitle: def?.subtitle,
    titleKey: def?.titleKey,
    subtitleKey: def?.subtitleKey,
  };
}

function wizardContext() {
  const s = useWizardStore.getState();
  return {
    productClass: s.productClass,
    puLine: s.puLine,
    hmLine: s.hmLine,
    simpelLine: s.simpelLine,
    installationType: s.installationType,
    ...s.formValues,
  };
}

function isStepVisible(def: WizardStepDef): boolean {
  if (!def.when) return true;
  return evaluateWhen(wizardContext(), def.when as Record<string, unknown>);
}

export function WizardEngine({
  previewStep,
  selectedCardId,
  onSelectCard,
}: {
  previewStep?: string;
  selectedCardId?: string | null;
  onSelectCard?: (cardId: string) => void;
}) {
  const { wizard, branding } = useProfile();
  const step = useWizardStore((s) => s.step);
  const initFromNavigation = useWizardStore((s) => s.initFromNavigation);
  const nav = wizard.navigation as NavigationConfig;
  const isStrela = branding.layoutVariant === "strela-funnel";

  const activeStepId = previewStep ?? step;
  const stepDef = useMemo(
    () => nav.steps?.find((s) => s.id === activeStepId),
    [nav.steps, activeStepId]
  );

  useEffect(() => {
    const first = nav.steps?.[0]?.id;
    if (first && step === "product-class") {
      initFromNavigation(first);
    }
  }, [nav.steps, initFromNavigation, step]);

  if (!stepDef || !isStepVisible(stepDef)) {
    return null;
  }

  if (isStrela && stepDef.type === "selection-form") {
    return <StrelaSelectionFormStep />;
  }

  if (stepDef.type === "card-grid") {
    const cards = nav.cards[activeStepId] ?? [];
    const meta = stepMeta(stepDef);
    if (isStrela) {
      return (
        <StrelaCardGridStep
          stepId={activeStepId}
          title={meta.title}
          subtitle={meta.subtitle}
          titleKey={meta.titleKey}
          subtitleKey={meta.subtitleKey}
          cards={cards}
          selectedCardId={onSelectCard ? selectedCardId : undefined}
          onSelectCard={onSelectCard}
        />
      );
    }
    return (
      <CardGridStep
        stepId={activeStepId}
        title={meta.title}
        subtitle={meta.subtitle}
        titleKey={meta.titleKey}
        subtitleKey={meta.subtitleKey}
        cards={cards}
        selectedCardId={onSelectCard ? selectedCardId : undefined}
        onSelectCard={onSelectCard}
      />
    );
  }

  if (stepDef.type === "selection-form") {
    return <SelectionFormStep />;
  }

  return null;
}
