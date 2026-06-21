import type { ReactNode } from "react";
import type { BlockProps } from "@pumpstation/contracts";
import { useProfile } from "@/providers/ProfileProvider";
import { useWizardStore } from "@/stores/wizardStore";
import type { WizardStepId } from "@/stores/wizardStore";
import { StrelaCardGridStep } from "@/components/strela/StrelaCardGridStep";
import { CardGridStep } from "@/components/wizard/CardGridStep";
import { StrelaSelectionFormStep } from "@/components/strela/StrelaSelectionFormStep";
import { SelectionFormStep } from "@/components/wizard/SelectionFormStep";
import { SelectionFormProvider } from "@/components/strela/selectionForm/SelectionFormContext";
import {
  SelectionCurvesPanel,
  SelectionOptionsPanel,
  SelectionParamsPanel,
  SelectionResultsPanel,
  SelectionTechSpecsPanel,
  SelectionWorkHeaderBlock,
} from "@/components/strela/selectionForm/selectionFormPanels";
import { SidebarWordmark } from "@/components/strela/SidebarWordmark";
import { FunnelHeading } from "@/components/strela/FunnelHeading";
import { FunnelHeaderRight } from "@/components/strela/FunnelHeaderRight";
import { MockupCard } from "@/components/strela/MockupCard";
import { CARD_HOVER_VARIANTS } from "@/lib/strela/cardUi";
import {
  CARD_CAPTION_MARK_DEFAULT_SRC,
  FUNNEL_SIDEBAR_WORDMARK_DEFAULT,
  selectionSlidePng,
} from "@/lib/strela/selectionAssets";
import { resolveStrelaStageHeading } from "@/lib/strela/stageHeadings";
import type { NavigationConfig, WizardCard, WizardStepDef } from "@/types/wizard";
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

function selectionPanelTitle(block: BlockProps["block"], key = "title"): string | undefined {
  const v = block.props[key];
  return typeof v === "string" && v.trim() ? v : undefined;
}

export function WizardSelectionWorkHeaderBlock({ block }: BlockProps) {
  return (
    <SelectionWorkHeaderBlock
      title={selectionPanelTitle(block)}
      logoUrl={block.props.logoUrl as string | undefined}
    />
  );
}

export function WizardSelectionParamsPanelBlock({ block }: BlockProps) {
  return <SelectionParamsPanel title={selectionPanelTitle(block)} />;
}

export function WizardSelectionCurvesPanelBlock({ block }: BlockProps) {
  return <SelectionCurvesPanel title={selectionPanelTitle(block)} className="h-full" />;
}

export function WizardSelectionTechSpecsPanelBlock({ block }: BlockProps) {
  return <SelectionTechSpecsPanel title={selectionPanelTitle(block)} className="h-full" />;
}

export function WizardSelectionOptionsPanelBlock({ block }: BlockProps) {
  return <SelectionOptionsPanel title={selectionPanelTitle(block)} />;
}

export function WizardSelectionResultsPanelBlock({ block }: BlockProps) {
  return <SelectionResultsPanel title={selectionPanelTitle(block)} />;
}

/** Обёртка для decomposed selection-form blocks — общий контекст */
export function SelectionFormBlocksProvider({ children }: { children: ReactNode }) {
  return <SelectionFormProvider>{children}</SelectionFormProvider>;
}

function cardImageSrc(card: WizardCard, index: number): string {
  if (card.image) return card.image;
  const slide = (Math.min(index, 3) + 1) as 1 | 2 | 3 | 4;
  return selectionSlidePng(slide);
}

function resolveHeading(
  block: BlockProps["block"],
  stepDef: WizardStepDef | undefined,
  branding: ReturnType<typeof useProfile>["branding"],
  stepId: string,
) {
  const fallback = resolveStrelaStageHeading(stepId, branding);
  const title =
    (block.props.title as string | undefined) ??
    stepDef?.title ??
    (stepDef?.titleKey
      ? String(branding[stepDef.titleKey as keyof typeof branding] ?? fallback.title)
      : fallback.title);
  const subtitle =
    (block.props.subtitle as string | undefined) ??
    stepDef?.subtitle ??
    (stepDef?.subtitleKey ? branding.copy?.[stepDef.subtitleKey] : fallback.subtitle);
  return { title: String(title), subtitle: subtitle ? String(subtitle) : undefined };
}

/** Сайдбар Strela — grid-блок */
export function WizardFunnelSidebarBlock({ block }: BlockProps) {
  const { branding } = useProfile();
  const appearance = branding.appearance;
  const wordmarkSrc =
    (block.props.wordmarkUrl as string | undefined) ??
    appearance?.funnel_sidebar_wordmark_url ??
    FUNNEL_SIDEBAR_WORDMARK_DEFAULT;
  const sidebarText =
    (block.props.sidebarText as string | undefined) ?? appearance?.sidebar_text ?? "стрела";
  const sidebarWidth =
    (block.props.sidebarWidth as string | undefined) ?? appearance?.funnel_sidebar_width;

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden border-r border-neutral-200 bg-white"
      style={sidebarWidth ? { width: sidebarWidth, maxWidth: sidebarWidth } : undefined}
    >
      <SidebarWordmark wordmarkSrc={wordmarkSrc} sidebarText={sidebarText} embedded />
    </div>
  );
}

/** Заголовок funnel — grid-блок */
export function WizardFunnelHeadingBlock({ block }: BlockProps) {
  const { wizard, branding } = useProfile();
  const nav = wizard.navigation as NavigationConfig;
  const stepId = String(block.props.stepId ?? "");
  const stepDef = nav.steps?.find((s) => s.id === stepId);
  const { title, subtitle } = resolveHeading(block, stepDef, branding, stepId);

  return (
    <div className="flex h-full min-h-0 flex-col justify-center bg-[var(--funnel-page-bg)] px-2 sm:px-4">
      <div className="flex min-h-[44px] items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <FunnelHeading title={title} subtitle={subtitle} />
        </div>
        <div className="shrink-0">
          <FunnelHeaderRight loginLabel={branding.copy?.loginLabel} />
        </div>
      </div>
    </div>
  );
}

type ResolvedSelectionCard = {
  id: string;
  title: string;
  description: string;
  image?: string;
  enabled?: boolean;
  next?: string;
  flow?: string;
};

/** Props-first card content; nav.cards is deprecated fallback (Option C5). */
function resolveSelectionCardFromBlock(
  block: BlockProps["block"],
  stepId: string,
  cardId: string,
  nav: NavigationConfig,
): ResolvedSelectionCard | null {
  const props = block.props ?? {};
  const navCard = (nav.cards[stepId] ?? []).find((c) => c.id === cardId);
  const title = (props.title as string | undefined) ?? navCard?.title;
  if (!title && !navCard) return null;
  return {
    id: cardId,
    title: title ?? cardId,
    description: (props.description as string | undefined) ?? navCard?.description ?? "",
    image: (props.image as string | undefined) ?? navCard?.image,
    enabled:
      props.enabled !== undefined && props.enabled !== null
        ? Boolean(props.enabled)
        : navCard?.enabled,
    next: (props.next as string | undefined) ?? navCard?.next,
    flow: (props.flow as string | undefined) ?? navCard?.flow,
  };
}

/** Одна карточка подбора — grid-блок */
export function WizardSelectionCardBlock({ block }: BlockProps) {
  const { wizard, branding } = useProfile();
  const studio = useWizardStudio();
  const selectCard = useWizardStore((s) => s.selectCard);
  const stepId = String(block.props.stepId ?? "product-class") as WizardStepId;
  const cardId = String(block.props.cardId ?? "");
  const nav = wizard.navigation as NavigationConfig;
  const cards = nav.cards[stepId] ?? [];
  const card = resolveSelectionCardFromBlock(block, stepId, cardId, nav);
  const index = Math.max(
    0,
    cards.findIndex((c) => c.id === cardId),
    card ? 0 : -1,
  );
  const appearance = branding.appearance;
  const captionLogo =
    appearance?.selection_card_caption_logo_url ?? CARD_CAPTION_MARK_DEFAULT_SRC;

  if (!card) {
    return (
      <div className="flex h-full items-center justify-center rounded border border-dashed border-neutral-300 bg-neutral-50 text-xs text-neutral-500">
        Карточка «{cardId}» не найдена (props или navigation)
      </div>
    );
  }

  const bullets = card.description
    ? card.description
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
    : ["—"];
  const disabled = card.enabled === false;
  const studioMode = Boolean(studio);

  return (
    <div className="wizard-selection-card-grid flex h-full w-full min-h-0 items-stretch justify-stretch overflow-hidden p-0.5">
      <MockupCard
        layoutMode="grid"
        identifier={card.title}
        boxTitle={null}
        bullets={bullets.length ? bullets : ["—"]}
        image={
          <img
            src={cardImageSrc(card, index >= 0 ? index : 0)}
            alt=""
            className="max-h-full max-w-full object-contain"
            loading="lazy"
            decoding="async"
          />
        }
        captionLogoSrc={captionLogo}
        imageHoverVariant={CARD_HOVER_VARIANTS[(index >= 0 ? index : 0) % CARD_HOVER_VARIANTS.length]}
        disabled={!studioMode && disabled}
        selected={studioMode && studio?.selectedCardId === card.id}
        onClick={
          studioMode
            ? () => studio?.onSelectCard?.(card.id)
            : disabled
              ? undefined
              : () =>
                  selectCard(stepId, card.id, {
                    next: card.next,
                    flow: card.flow,
                  })
        }
      />
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
