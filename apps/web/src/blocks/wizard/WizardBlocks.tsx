import type { BlockProps } from "@pumpstation/contracts";
import { useProfile } from "@/providers/ProfileProvider";
import { useWizardStore } from "@/stores/wizardStore";
import type { WizardStepId } from "@/stores/wizardStore";
import { StrelaCardGridStep } from "@/components/strela/StrelaCardGridStep";
import { CardGridStep } from "@/components/wizard/CardGridStep";
import { StrelaSelectionFormStep } from "@/components/strela/StrelaSelectionFormStep";
import { SelectionFormStep } from "@/components/wizard/SelectionFormStep";
import type { NavigationConfig, WizardStepDef } from "@/types/wizard";
import { useWizardStudio } from "@/routes/admin/studio/wizard/WizardStudioContext";

function stepMeta(def?: WizardStepDef) {
  return {
    title: def?.title,
    subtitle: def?.subtitle,
    titleKey: def?.titleKey,
    subtitleKey: def?.subtitleKey,
  };
}

export function WizardStepHeadingBlock({ block }: BlockProps) {
  const { wizard, branding } = useProfile();
  const studio = useWizardStudio();
  const stepId = String(block.props.stepId ?? "");
  if (branding.layoutVariant === "strela-funnel" && !studio) {
    return null;
  }
  if (branding.layoutVariant === "strela-funnel" && studio) {
    return (
      <div className="flex h-full flex-col justify-center border border-dashed border-neutral-300 bg-neutral-50 px-3 py-2 text-neutral-500">
        <span className="text-[10px] uppercase tracking-wide">Заголовок Strela</span>
        <span className="text-xs leading-snug">
          На сайте — в шапке оболочки. Текст редактируется в панели «Шаг» справа.
        </span>
      </div>
    );
  }
  const nav = wizard.navigation as NavigationConfig;
  const def = nav.steps?.find((s) => s.id === stepId);
  const title =
    block.props.title ??
    def?.title ??
    (def?.titleKey ? String(branding[def.titleKey as keyof typeof branding] ?? "") : stepId);
  const subtitle =
    block.props.subtitle ??
    def?.subtitle ??
    (def?.subtitleKey ? branding.copy?.[def.subtitleKey] : undefined);

  return (
    <div>
      <h1 className="px-2 py-3 text-xl font-semibold">{String(title)}</h1>
      {subtitle ? <p className="px-2 pb-2 text-sm text-neutral-600">{String(subtitle)}</p> : null}
    </div>
  );
}

export function WizardCardGridStrelaBlock({ block }: BlockProps) {
  const { wizard } = useProfile();
  const studio = useWizardStudio();
  const stepId = String(block.props.stepId ?? "product-class") as WizardStepId;
  const nav = wizard.navigation as NavigationConfig;
  const def = nav.steps?.find((s) => s.id === stepId);
  const cards = nav.cards[stepId] ?? [];
  const meta = stepMeta(def);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <StrelaCardGridStep
        stepId={stepId}
        {...meta}
        cards={cards}
        selectedCardId={studio?.selectedCardId}
        onSelectCard={studio?.onSelectCard}
      />
    </div>
  );
}

export function WizardCardGridSimpleBlock({ block }: BlockProps) {
  const { wizard } = useProfile();
  const studio = useWizardStudio();
  const stepId = String(block.props.stepId ?? "product-class") as WizardStepId;
  const nav = wizard.navigation as NavigationConfig;
  const def = nav.steps?.find((s) => s.id === stepId);
  const cards = nav.cards[stepId] ?? [];
  const meta = stepMeta(def);

  return (
    <div>
      <CardGridStep
        stepId={stepId}
        {...meta}
        cards={cards}
        selectedCardId={studio?.selectedCardId}
        onSelectCard={studio?.onSelectCard}
      />
    </div>
  );
}

export function WizardLegacySelectionBlock({ block: _block }: BlockProps) {
  const { branding } = useProfile();
  const isStrela = branding.layoutVariant === "strela-funnel";

  return (
    <div className="min-h-0">
      {isStrela ? <StrelaSelectionFormStep /> : <SelectionFormStep />}
    </div>
  );
}

/** @deprecated use wizard/card-grid-strela or wizard/card-grid-simple */
export function WizardEmbedBlock({ block, profile }: BlockProps) {
  const step = useWizardStore((s) => s.step);
  const { branding } = useProfile();
  const isStrela = branding.layoutVariant === "strela-funnel";

  if (step === "selection-form") {
    return <WizardLegacySelectionBlock block={block} profile={profile} />;
  }

  const stepId = String(block.props.stepId ?? step) as WizardStepId;
  const patched = { ...block, props: { ...block.props, stepId } };
  if (isStrela) {
    return <WizardCardGridStrelaBlock block={patched} profile={profile} />;
  }
  return <WizardCardGridSimpleBlock block={patched} profile={profile} />;
}
