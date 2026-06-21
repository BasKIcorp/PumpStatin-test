import type { BlockConfig, PageConfig } from "@pumpstation/contracts";
import type { WizardStepDef } from "@/types/wizard";
import type { CardItem, WizardNavState } from "./wizardTypes";
import {
  defaultFrameBlocks,
  syncDecomposedCardBlocks,
  usesDecomposedCardGrid,
  usesDecomposedStrelaFrames,
  WIZARD_SELECTION_CARD,
} from "./wizardFrameUtils";

/** Wizard block scope — same prop used across wizard/* blocks (Option C unified page.blocks). */
export const WIZARD_STEP_ID_PROP = "stepId";

export function readBlockStepId(block: BlockConfig): string | undefined {
  const value = block.props?.[WIZARD_STEP_ID_PROP];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function withBlockStepId(block: BlockConfig, stepId: string): BlockConfig {
  return {
    ...block,
    props: {
      ...(block.props ?? {}),
      [WIZARD_STEP_ID_PROP]: readBlockStepId(block) ?? stepId,
    },
  };
}

/** True when wizard layout lives in page.blocks (no frames). */
export function wizardUsesUnifiedBlocks(page: PageConfig | undefined): boolean {
  if (!page || page.type !== "wizard") return false;
  const blocks = page.blocks ?? [];
  if (blocks.length === 0) return false;
  if (!blocks.some((b) => readBlockStepId(b))) return false;
  const frames = page.frames;
  return !frames || Object.keys(frames).length === 0;
}

/** Merge legacy page.frames[stepId] into flat page.blocks (in-memory or persist). */
export function flattenWizardFramesToBlocks(page: PageConfig): BlockConfig[] {
  const base = [...(page.blocks ?? [])];
  const frames = page.frames ?? {};
  for (const [stepId, frame] of Object.entries(frames)) {
    for (const block of frame.blocks ?? []) {
      base.push(withBlockStepId(block, stepId));
    }
  }
  return base;
}

export function normalizeWizardPage(page: PageConfig): PageConfig {
  if (page.type !== "wizard") return page;
  if (wizardUsesUnifiedBlocks(page)) return page;
  if (!page.frames || Object.keys(page.frames).length === 0) return page;
  const blocks = flattenWizardFramesToBlocks(page);
  const { frames: _frames, ...rest } = page;
  return { ...rest, blocks };
}

export function blocksForWizardStep(page: PageConfig, stepId: string): BlockConfig[] {
  const normalized = normalizeWizardPage(page);
  return (normalized.blocks ?? []).filter((b) => readBlockStepId(b) === stepId);
}

/** Replace all blocks for one wizard step inside page.blocks. */
export function patchWizardStepBlocks(
  page: PageConfig,
  stepId: string,
  stepBlocks: BlockConfig[],
): PageConfig {
  const normalized = normalizeWizardPage(page);
  const tagged = stepBlocks.map((b) => withBlockStepId(b, stepId));
  const rest = (normalized.blocks ?? []).filter((b) => readBlockStepId(b) !== stepId);
  const { frames: _frames, ...restPage } = normalized;
  return { ...restPage, blocks: [...rest, ...tagged] };
}

export function wizardStepIdsFromBlocks(page: PageConfig): string[] {
  const normalized = normalizeWizardPage(page);
  const ids = new Set<string>();
  for (const block of normalized.blocks ?? []) {
    const stepId = readBlockStepId(block);
    if (stepId) ids.add(stepId);
  }
  return [...ids];
}

/** Persist Option C shape: flat blocks, no frames key. */
export function persistNormalizedWizardPage(page: PageConfig): PageConfig {
  if (page.type !== "wizard") return page;
  const normalized = normalizeWizardPage(page);
  const { frames: _frames, ...rest } = normalized;
  return { ...rest, blocks: normalized.blocks ?? [] };
}

export function removeStepBlocksFromPage(page: PageConfig, stepId: string): PageConfig {
  const normalized = persistNormalizedWizardPage(page);
  const blocks = (normalized.blocks ?? []).filter((b) => readBlockStepId(b) !== stepId);
  return { ...normalized, blocks };
}

/** Patch wizard/selection-card block props for one card (Studio dual-write with nav.cards). */
export function patchSelectionCardProps(
  page: PageConfig,
  stepId: string,
  cardId: string,
  patch: Record<string, unknown>,
): PageConfig {
  const normalized = persistNormalizedWizardPage(page);
  const blocks = (normalized.blocks ?? []).map((b) => {
    if (
      b.type !== WIZARD_SELECTION_CARD ||
      readBlockStepId(b) !== stepId ||
      String(b.props?.cardId) !== cardId
    ) {
      return b;
    }
    return { ...b, props: { ...(b.props ?? {}), ...patch } };
  });
  return { ...normalized, blocks };
}

/** Build nav.cards snapshot from wizard/selection-card block props (Option C source of truth). */
export function cardsFromWizardBlocks(page: PageConfig): Record<string, CardItem[]> {
  const normalized = persistNormalizedWizardPage(page);
  const grouped: Record<string, { block: BlockConfig; order: number }[]> = {};

  for (const block of normalized.blocks ?? []) {
    if (block.type !== WIZARD_SELECTION_CARD) continue;
    const stepId = readBlockStepId(block);
    const cardId = block.props?.cardId;
    if (!stepId || typeof cardId !== "string" || cardId.length === 0) continue;
    const order = block.layout?.x ?? 0;
    (grouped[stepId] ??= []).push({ block, order });
  }

  const cards: Record<string, CardItem[]> = {};
  for (const [stepId, entries] of Object.entries(grouped)) {
    entries.sort((a, b) => a.order - b.order);
    cards[stepId] = entries.map(({ block }) => {
      const props = block.props ?? {};
      const id = String(props.cardId);
      return {
        id,
        title: typeof props.title === "string" && props.title.length > 0 ? props.title : id,
        image: typeof props.image === "string" ? props.image : undefined,
        description: typeof props.description === "string" ? props.description : undefined,
        enabled:
          props.enabled !== undefined && props.enabled !== null ? Boolean(props.enabled) : true,
        next: typeof props.next === "string" ? props.next : undefined,
        flow: typeof props.flow === "string" ? props.flow : undefined,
      };
    });
  }
  return cards;
}

/** Merge block-derived cards into nav; steps without selection-card blocks keep existing nav.cards. */
export function navWithCardsFromBlocks(nav: WizardNavState, page: PageConfig | undefined): WizardNavState {
  if (!page || page.type !== "wizard") return nav;
  const fromBlocks = cardsFromWizardBlocks(page);
  if (Object.keys(fromBlocks).length === 0) return nav;
  return {
    ...nav,
    cards: { ...nav.cards, ...fromBlocks },
  };
}

export function syncWizardUnifiedPageBlocks(
  page: PageConfig,
  steps: WizardStepDef[],
  strela: boolean,
  cardsByStep: Record<string, { id: string }[]> = {},
): PageConfig {
  let next = persistNormalizedWizardPage(page);
  const stepIds = new Set(steps.map((s) => s.id));

  for (const step of steps) {
    const stepBlocks = blocksForWizardStep(next, step.id);
    if (stepBlocks.length === 0) {
      next = patchWizardStepBlocks(
        next,
        step.id,
        defaultFrameBlocks(step, strela, cardsByStep[step.id] ?? [], undefined),
      );
      continue;
    }
    if (
      step.type === "card-grid" &&
      (usesDecomposedStrelaFrames(stepBlocks) || usesDecomposedCardGrid(stepBlocks))
    ) {
      const synced = syncDecomposedCardBlocks(stepBlocks, step, cardsByStep[step.id] ?? []);
      if (JSON.stringify(synced) !== JSON.stringify(stepBlocks)) {
        next = patchWizardStepBlocks(next, step.id, synced);
      }
    }
  }

  const blocks = (next.blocks ?? []).filter((b) => {
    const sid = readBlockStepId(b);
    return !sid || stepIds.has(sid);
  });
  return { ...next, blocks };
}

export function addCardBlockToUnifiedStep(
  page: PageConfig,
  step: WizardStepDef,
  cards: { id: string }[],
): PageConfig {
  const stepBlocks = blocksForWizardStep(normalizeWizardPage(page), step.id);
  if (!usesDecomposedStrelaFrames(stepBlocks) && !usesDecomposedCardGrid(stepBlocks)) {
    return persistNormalizedWizardPage(page);
  }
  return patchWizardStepBlocks(
    persistNormalizedWizardPage(page),
    step.id,
    syncDecomposedCardBlocks(stepBlocks, step, cards),
  );
}

export function removeCardBlockFromUnifiedStep(
  page: PageConfig,
  stepId: string,
  step: WizardStepDef,
  cards: { id: string }[],
): PageConfig {
  const stepBlocks = blocksForWizardStep(normalizeWizardPage(page), stepId);
  if (!usesDecomposedStrelaFrames(stepBlocks) && !usesDecomposedCardGrid(stepBlocks)) {
    return persistNormalizedWizardPage(page);
  }
  return patchWizardStepBlocks(
    persistNormalizedWizardPage(page),
    stepId,
    syncDecomposedCardBlocks(stepBlocks, step, cards),
  );
}
