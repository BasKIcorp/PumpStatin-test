import { useProfile } from "@/providers/ProfileProvider";
import { useWizardStore } from "@/stores/wizardStore";
import type { WizardStepId } from "@/stores/wizardStore";
import type { WizardCard } from "@/types/wizard";
import { CARD_HOVER_VARIANTS } from "@/lib/strela/cardUi";
import { CARD_CAPTION_MARK_DEFAULT_SRC } from "@/lib/strela/selectionAssets";
import { MockupCard } from "./MockupCard";
import { MockupCardStrip } from "./MockupCardStrip";

interface Props {
  stepId: WizardStepId;
  title?: string;
  subtitle?: string;
  titleKey?: string;
  subtitleKey?: string;
  cards: WizardCard[];
}

function cardMediaPlaceholder() {
  return <div className="h-full w-full bg-[var(--funnel-card-media-bg)]" aria-hidden />;
}

export function StrelaCardGridStep({
  stepId,
  title,
  subtitle,
  titleKey,
  subtitleKey,
  cards,
}: Props) {
  const { branding } = useProfile();
  const selectCard = useWizardStore((s) => s.selectCard);
  const appearance = branding.appearance;
  const captionLogo =
    appearance?.selection_card_caption_logo_url ?? CARD_CAPTION_MARK_DEFAULT_SRC;

  const resolvedTitle =
    title ?? (titleKey ? String(branding[titleKey as keyof typeof branding] ?? branding.appTitle) : "");
  const resolvedSubtitle =
    subtitle ?? (subtitleKey ? branding.copy[subtitleKey] : undefined);

  return (
    <div className="selection-funnel-stage-top flex min-h-0 flex-1 flex-col">
      <MockupCardStrip>
        {cards.map((card, index) => {
          const bullets = card.description
            ? card.description
                .split(/\n+/)
                .map((line) => line.trim())
                .filter(Boolean)
            : ["—"];
          const disabled = card.enabled === false;

          return (
            <MockupCard
              key={card.id}
              identifier={card.title}
              boxTitle={null}
              bullets={bullets.length ? bullets : ["—"]}
              image={cardMediaPlaceholder()}
              captionLogoSrc={captionLogo}
              imageHoverVariant={CARD_HOVER_VARIANTS[index % CARD_HOVER_VARIANTS.length]}
              disabled={disabled}
              onClick={
                disabled
                  ? undefined
                  : () =>
                      selectCard(stepId, card.id, {
                        next: card.next,
                        flow: card.flow,
                      })
              }
            />
          );
        })}
      </MockupCardStrip>
      {/* title/subtitle rendered by funnel header — keep for a11y if header hidden on mobile */}
      <span className="sr-only">
        {resolvedTitle}
        {resolvedSubtitle ? ` — ${resolvedSubtitle}` : ""}
      </span>
    </div>
  );
}
