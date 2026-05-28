import { useProfile } from "@/providers/ProfileProvider";
import { useWizardStore } from "@/stores/wizardStore";
import type { WizardStepId } from "@/stores/wizardStore";
import type { WizardCard } from "@/types/wizard";

interface Props {
  stepId: WizardStepId;
  title?: string;
  subtitle?: string;
  titleKey?: string;
  subtitleKey?: string;
  cards: WizardCard[];
  backLabel?: string;
}

export function CardGridStep({
  stepId,
  title,
  subtitle,
  titleKey,
  subtitleKey,
  cards,
  backLabel,
}: Props) {
  const { branding } = useProfile();
  const selectCard = useWizardStore((s) => s.selectCard);
  const goBack = useWizardStore((s) => s.goBack);

  const resolvedTitle =
    title ?? (titleKey ? String(branding[titleKey as keyof typeof branding] ?? branding.appTitle) : "");
  const resolvedSubtitle =
    subtitle ??
    (subtitleKey ? branding.copy[subtitleKey] : undefined);

  return (
    <div>
      {backLabel && (
        <button
          type="button"
          onClick={goBack}
          className="mb-4 text-sm text-neutral-600 hover:text-[var(--color-primary)]"
        >
          {backLabel}
        </button>
      )}
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-bold md:text-3xl">{resolvedTitle}</h1>
        {resolvedSubtitle && (
          <p className="mt-2 text-neutral-600">{resolvedSubtitle}</p>
        )}
      </header>
      <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            disabled={card.enabled === false}
            onClick={() =>
              selectCard(stepId, card.id, {
                next: card.next,
                flow: card.flow,
              })
            }
            className="group overflow-hidden rounded-xl border border-neutral-200 bg-[var(--color-surface,white)] text-left shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="aspect-[4/3] bg-neutral-100 dark:bg-neutral-800" />
            <div className="bg-[var(--color-card-footer)] p-4 text-white">
              <h3 className="text-lg font-semibold">{card.title}</h3>
              <p className="mt-1 text-sm opacity-90">{card.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
