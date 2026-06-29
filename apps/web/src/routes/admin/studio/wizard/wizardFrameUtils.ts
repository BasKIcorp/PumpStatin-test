import type { BlockConfig, BlockGridLayout, PageConfig } from "@pumpstation/contracts";
import { defaultBlockLayout } from "@pumpstation/contracts";
import type { StrelaAppearance } from "@/lib/strela/appearance";
import type { WizardStepDef } from "@/types/wizard";

export const WIZARD_FUNNEL_SIDEBAR = "wizard/funnel-sidebar";
export const WIZARD_FUNNEL_HEADING = "wizard/funnel-heading";
export const WIZARD_FUNNEL_HEADER_ACTIONS = "wizard/funnel-header-actions";
export const WIZARD_SELECTION_CARD = "wizard/selection-card";
export const WIZARD_SELECTION_WORK_HEADER = "wizard/selection-work-header";
export const WIZARD_SELECTION_PARAMS = "wizard/selection-params-panel";
export const WIZARD_SELECTION_CURVES = "wizard/selection-curves-panel";
export const WIZARD_SELECTION_TECH_SPECS = "wizard/selection-tech-specs-panel";
export const WIZARD_SELECTION_OPTIONS = "wizard/selection-options-panel";
export const WIZARD_SELECTION_RESULTS = "wizard/selection-results-panel";
export const WIZARD_LEGACY_SELECTION = "wizard/legacy-selection";

const SELECTION_FORM_BLOCK_TYPES = new Set([
  WIZARD_SELECTION_WORK_HEADER,
  WIZARD_SELECTION_PARAMS,
  WIZARD_SELECTION_CURVES,
  WIZARD_SELECTION_TECH_SPECS,
  WIZARD_SELECTION_OPTIONS,
  WIZARD_SELECTION_RESULTS,
]);

const SIDEBAR_COLS = 2;
const CONTENT_X = 2;
/** Ширина заголовка funnel в колонках (видимая область) — reserved for future layout rules */
const _CONTENT_W = 10;
void _CONTENT_W;

/** Ширина одной карточки в колонках grid (~352px при базовой сетке 12 col / 1152px) */
export const SELECTION_CARD_COL_W = 4;

/** Минимальная высота grid-ячейки карточки (строки) */
export const SELECTION_CARD_BLOCK_H_MIN = 7;

/** Высота ячейки от ширины в колонках (~пропорция Strela: 5/4 медиа + подпись) */
export function heightForCardWidth(colW: number): number {
  return Math.max(SELECTION_CARD_BLOCK_H_MIN, Math.round(colW * 2 + 2));
}

/** Горизонтальная лента: карточки в один ряд, grid расширяется вправо */
export function layoutForCard(index: number, _total: number): BlockGridLayout {
  const w = SELECTION_CARD_COL_W;
  const h = heightForCardWidth(w);
  return {
    x: CONTENT_X + index * w,
    y: 2,
    w,
    h,
  };
}

export function cardBlockId(stepId: string, cardId: string): string {
  return `w-card-${stepId}-${cardId}`;
}

export function usesDecomposedSelectionFormFrames(blocks: BlockConfig[]): boolean {
  return blocks.some((b) => SELECTION_FORM_BLOCK_TYPES.has(b.type));
}

export function usesDecomposedStrelaFrames(blocks: BlockConfig[]): boolean {
  return blocks.some(
    (b) =>
      b.type === WIZARD_FUNNEL_SIDEBAR ||
      b.type === WIZARD_FUNNEL_HEADING ||
      b.type === WIZARD_FUNNEL_HEADER_ACTIONS ||
      b.type === WIZARD_SELECTION_CARD,
  );
}

export function usesDecomposedWizardFrames(blocks: BlockConfig[]): boolean {
  return usesDecomposedStrelaFrames(blocks) || usesDecomposedSelectionFormFrames(blocks);
}

function cardBlocksInOrder(blocks: BlockConfig[]): BlockConfig[] {
  return blocks.filter((b) => b.type === WIZARD_SELECTION_CARD);
}

function cardLayoutNeedsReposition(
  existingCards: BlockConfig[],
  cards: { id: string }[],
): boolean {
  if (existingCards.length !== cards.length) return true;
  const navIds = new Set(cards.map((c) => c.id));
  for (const block of existingCards) {
    const cardId = String(block.props.cardId);
    if (!navIds.has(cardId)) return true;
  }
  for (const card of cards) {
    if (!existingCards.some((b) => String(b.props.cardId) === card.id)) return true;
  }
  return false;
}

/** Горизонтальная сетка карточек без Strela sidebar (3 колонки). */
export function layoutForSimpleCard(index: number): BlockGridLayout {
  const w = 4;
  const h = 8;
  const col = index % 3;
  const row = Math.floor(index / 3);
  return { x: col * w, y: 2 + row * h, w, h };
}

export function usesDecomposedCardGrid(blocks: BlockConfig[]): boolean {
  return blocks.some((b) => b.type === WIZARD_SELECTION_CARD);
}

/** Добавляет/удаляет card-блоки; layout существующих сохраняет (drag/resize). При add/remove — слот x/y/w, h сохраняет */
export function ensureDecomposedCardBlocks(
  blocks: BlockConfig[],
  step: WizardStepDef,
  cards: { id: string }[],
): BlockConfig[] {
  const strela = usesDecomposedStrelaFrames(blocks);
  const simple = usesDecomposedCardGrid(blocks) && !strela;
  if (!strela && !simple) return blocks;

  const shell = strela
    ? blocks.filter(
        (b) =>
          b.type === WIZARD_FUNNEL_SIDEBAR ||
          b.type === WIZARD_FUNNEL_HEADING ||
          b.type === WIZARD_FUNNEL_HEADER_ACTIONS,
      )
    : blocks.filter((b) => b.type === "wizard/step-heading");
  const other = blocks.filter(
    (b) =>
      b.type !== WIZARD_FUNNEL_SIDEBAR &&
      b.type !== WIZARD_FUNNEL_HEADING &&
      b.type !== WIZARD_FUNNEL_HEADER_ACTIONS &&
      b.type !== "wizard/step-heading" &&
      b.type !== WIZARD_SELECTION_CARD &&
      b.type !== "wizard/card-grid-strela" &&
      b.type !== "wizard/card-grid-simple",
  );
  const existingCards = cardBlocksInOrder(blocks);
  const existingByCardId = new Map(
    existingCards.map((b) => [String(b.props.cardId), b]),
  );
  const reposition = cardLayoutNeedsReposition(existingCards, cards);

  if (strela && !shell.some((b) => b.type === WIZARD_FUNNEL_HEADER_ACTIONS)) {
    const heading = shell.find((b) => b.type === WIZARD_FUNNEL_HEADING);
    shell.push({
      id: `w-factions-${step.id}`,
      type: WIZARD_FUNNEL_HEADER_ACTIONS,
      layout: {
        x: CONTENT_X + 8,
        y: heading?.layout?.y ?? 0,
        w: 2,
        h: heading?.layout?.h ?? 2,
      },
      props: { stepId: step.id },
    });
  }

  const cardBlocks = cards.map((card, index) => {
    const id = cardBlockId(step.id, card.id);
    const prev = existingByCardId.get(card.id);
    const slot = strela ? layoutForCard(index, cards.length) : layoutForSimpleCard(index);
    if (prev) {
      if (!reposition && prev.layout) return prev;
      const h = prev.layout?.h ?? slot.h;
      const nextLayout: BlockGridLayout = {
        x: slot.x,
        y: slot.y,
        w: slot.w,
        h,
        ...(prev.layout?.rotation !== undefined ? { rotation: prev.layout.rotation } : {}),
        ...(prev.layout?.crop !== undefined ? { crop: prev.layout.crop } : {}),
      };
      return { ...prev, layout: nextLayout };
    }
    return {
      id,
      type: WIZARD_SELECTION_CARD,
      layout: slot,
      props: { stepId: step.id, cardId: card.id },
    };
  });

  return [...shell, ...other, ...cardBlocks];
}

export function buildDecomposedStrelaFrameBlocks(
  step: WizardStepDef,
  cards: { id: string }[],
  appearance?: StrelaAppearance,
  preserve?: BlockConfig[],
): BlockConfig[] {
  const preserveBlocks = preserve ?? [];
  const byId = new Map(preserveBlocks.map((b) => [b.id, b]));
  const sidebarId = `w-sidebar-${step.id}`;
  const headingId = `w-fheading-${step.id}`;
  const actionsId = `w-factions-${step.id}`;

  const preservedSidebar =
    byId.get(sidebarId) ?? preserveBlocks.find((b) => b.type === WIZARD_FUNNEL_SIDEBAR);
  const sidebar: BlockConfig = preservedSidebar ?? {
    id: sidebarId,
    type: WIZARD_FUNNEL_SIDEBAR,
    layout: { x: 0, y: 0, w: SIDEBAR_COLS, h: 22, rotation: -90 },
    props: {
      sidebarText: appearance?.sidebar_text ?? "стрела",
      wordmarkUrl: appearance?.funnel_sidebar_wordmark_url,
      sidebarWidth: appearance?.funnel_sidebar_width,
    },
  };

  const heading =
    byId.get(headingId) ??
    ({
      id: headingId,
      type: WIZARD_FUNNEL_HEADING,
      layout: { x: CONTENT_X, y: 0, w: 8, h: 2 },
      props: {
        stepId: step.id,
        title: step.title,
        subtitle: step.subtitle,
      },
    } satisfies BlockConfig);

  const headerActions =
    byId.get(actionsId) ??
    ({
      id: actionsId,
      type: WIZARD_FUNNEL_HEADER_ACTIONS,
      layout: { x: CONTENT_X + 8, y: 0, w: 2, h: 2 },
      props: { stepId: step.id },
    } satisfies BlockConfig);

  const cardBlocks = cards.map((card, index) => {
    const id = cardBlockId(step.id, card.id);
    const existing = byId.get(id);
    if (existing) return existing;
    return {
      id,
      type: WIZARD_SELECTION_CARD,
      layout: layoutForCard(index, cards.length),
      props: { stepId: step.id, cardId: card.id },
    };
  });

  return [sidebar, heading, headerActions, ...cardBlocks];
}

/** Non-Strela card-grid: step heading + selection-card blocks (Option C). */
export function buildSimpleDecomposedCardGridBlocks(
  step: WizardStepDef,
  cards: Array<{ id: string; title?: string; image?: string; description?: string; enabled?: boolean; next?: string; flow?: string }>,
  preserve?: BlockConfig[],
): BlockConfig[] {
  const byId = new Map((preserve ?? []).map((b) => [b.id, b]));
  const headingId = `w-heading-${step.id}`;
  const heading =
    byId.get(headingId) ??
    ({
      id: headingId,
      type: "wizard/step-heading",
      layout: { x: 0, y: 0, w: 12, h: 2 },
      props: {
        stepId: step.id,
        title: step.title,
        subtitle: step.subtitle,
      },
    } satisfies BlockConfig);

  const cardBlocks = cards.map((card, index) => {
    const id = cardBlockId(step.id, card.id);
    const existing = byId.get(id);
    if (existing) return existing;
    return {
      id,
      type: WIZARD_SELECTION_CARD,
      layout: layoutForSimpleCard(index),
      props: {
        stepId: step.id,
        cardId: card.id,
        ...(card.title !== undefined ? { title: card.title } : {}),
        ...(card.image !== undefined ? { image: card.image } : {}),
        ...(card.description !== undefined ? { description: card.description } : {}),
        ...(card.enabled !== undefined ? { enabled: card.enabled } : {}),
        ...(card.next !== undefined ? { next: card.next } : {}),
        ...(card.flow !== undefined ? { flow: card.flow } : {}),
      },
    };
  });

  return [heading, ...cardBlocks];
}

/** При сохранении: block props сайдбара/шапки → appearance (fallback для runtime без block override). */
export function appearancePatchFromWizardBlocks(
  page: PageConfig,
  appearance: StrelaAppearance,
): StrelaAppearance {
  const blocks = page.blocks ?? [];
  let next: StrelaAppearance = { ...appearance };

  const sidebar = blocks.find((b) => b.type === WIZARD_FUNNEL_SIDEBAR);
  if (sidebar) {
    const sidebarText = sidebar.props.sidebarText as string | undefined;
    const wordmarkUrl = sidebar.props.wordmarkUrl as string | undefined;
    const sidebarWidth = sidebar.props.sidebarWidth as string | undefined;
    if (sidebarText !== undefined) next = { ...next, sidebar_text: sidebarText || undefined };
    if (wordmarkUrl !== undefined) {
      next = { ...next, funnel_sidebar_wordmark_url: wordmarkUrl || undefined };
    }
    if (sidebarWidth !== undefined) {
      next = { ...next, funnel_sidebar_width: sidebarWidth || undefined };
    }
  }

  const header = blocks.find((b) => b.type === WIZARD_SELECTION_WORK_HEADER);
  if (header) {
    const logoUrl = header.props.logoUrl as string | undefined;
    if (logoUrl !== undefined) {
      next = { ...next, selection_flow_header_logo_url: logoUrl || undefined };
    }
  }

  return next;
}

export function buildDecomposedSelectionFormFrameBlocks(
  step: WizardStepDef,
  preserve?: BlockConfig[],
): BlockConfig[] {
  const byId = new Map((preserve ?? []).map((b) => [b.id, b]));
  const defaults: Array<{
    id: string;
    type: string;
    layout: BlockGridLayout;
    props?: Record<string, unknown>;
  }> = [
    {
      id: `w-sel-header-${step.id}`,
      type: WIZARD_SELECTION_WORK_HEADER,
      layout: { x: 0, y: 0, w: 12, h: 2 },
      props: {},
    },
    {
      id: `w-sel-params-${step.id}`,
      type: WIZARD_SELECTION_PARAMS,
      layout: { x: 0, y: 2, w: 5, h: 9 },
      props: {},
    },
    {
      id: `w-sel-curves-${step.id}`,
      type: WIZARD_SELECTION_CURVES,
      layout: { x: 5, y: 2, w: 4, h: 9 },
      props: {},
    },
    {
      id: `w-sel-tech-${step.id}`,
      type: WIZARD_SELECTION_TECH_SPECS,
      layout: { x: 9, y: 2, w: 3, h: 9 },
      props: {},
    },
    {
      id: `w-sel-options-${step.id}`,
      type: WIZARD_SELECTION_OPTIONS,
      layout: { x: 0, y: 11, w: 5, h: 9 },
      props: {},
    },
    {
      id: `w-sel-results-${step.id}`,
      type: WIZARD_SELECTION_RESULTS,
      layout: { x: 5, y: 11, w: 7, h: 9 },
      props: {},
    },
  ];

  return defaults.map((def) => {
    const existing = byId.get(def.id);
    if (existing) return existing;
    return {
      id: def.id,
      type: def.type,
      layout: def.layout,
      props: def.props ?? {},
    } satisfies BlockConfig;
  });
}

function migrateSelectionFormFrameBlocks(
  blocks: BlockConfig[],
  step: WizardStepDef,
): BlockConfig[] {
  if (usesDecomposedSelectionFormFrames(blocks)) return blocks;
  if (blocks.some((b) => b.type === WIZARD_LEGACY_SELECTION)) {
    return buildDecomposedSelectionFormFrameBlocks(step, blocks);
  }
  return blocks;
}

export function syncDecomposedCardBlocks(
  blocks: BlockConfig[],
  step: WizardStepDef,
  cards: { id: string }[],
): BlockConfig[] {
  return ensureDecomposedCardBlocks(blocks, step, cards);
}

function migrateStrelaFrameBlocks(
  blocks: BlockConfig[],
  step: WizardStepDef,
  cards: { id: string }[],
  appearance?: StrelaAppearance,
): BlockConfig[] {
  if (usesDecomposedStrelaFrames(blocks)) {
    return ensureDecomposedCardBlocks(blocks, step, cards);
  }
  if (blocks.some((b) => b.type === "wizard/card-grid-strela")) {
    return buildDecomposedStrelaFrameBlocks(step, cards, appearance, blocks);
  }
  return blocks;
}

/** Appearance applies only when creating missing shell blocks — never overwrites saved props. */
function appearanceForExistingFrames(
  saved: BlockConfig[],
  appearance?: StrelaAppearance,
): StrelaAppearance | undefined {
  return usesDecomposedStrelaFrames(saved) ? undefined : appearance;
}

export function defaultFrameBlocks(
  step: WizardStepDef,
  strela = true,
  cards: { id: string }[] = [],
  appearance?: StrelaAppearance,
): BlockConfig[] {
  if (step.type === "card-grid" && strela) {
    return buildDecomposedStrelaFrameBlocks(step, cards, appearance);
  }
  if (step.type === "card-grid") {
    return buildSimpleDecomposedCardGridBlocks(step, cards);
  }
  if (step.type === "selection-form" && strela) {
    return buildDecomposedSelectionFormFrameBlocks(step);
  }
  if (step.type === "selection-form") {
    return [
      {
        id: `w-form-${step.id}`,
        type: WIZARD_LEGACY_SELECTION,
        layout: { x: 0, y: 0, w: 12, h: 24 },
        props: { stepId: step.id },
      },
    ];
  }
  return [];
}

export function frameBlocksForPatch(
  saved: BlockConfig[],
  step: WizardStepDef | undefined,
  cards: { id: string }[],
  appearance?: StrelaAppearance,
  strela = true,
): BlockConfig[] {
  if (!step || !strela || saved.length === 0) {
    return saved;
  }
  if (step.type === "selection-form") {
    if (saved.some((b) => b.type === WIZARD_LEGACY_SELECTION)) {
      return buildDecomposedSelectionFormFrameBlocks(step, saved);
    }
    return saved;
  }
  if (step.type !== "card-grid") {
    return saved;
  }
  if (usesDecomposedStrelaFrames(saved)) {
    return ensureDecomposedCardBlocks(saved, step, cards);
  }
  if (saved.some((b) => b.type === "wizard/card-grid-strela")) {
    return buildDecomposedStrelaFrameBlocks(
      step,
      cards,
      appearanceForExistingFrames(saved, appearance),
      saved,
    );
  }
  return saved;
}

/** Studio editor: saved frame props/layout are authoritative — appearance only seeds missing frames. */
export function frameBlocksForEditorDisplay(
  page: PageConfig,
  stepId: string,
  stepDef?: WizardStepDef,
  strela = true,
  cards: { id: string }[] = [],
): BlockConfig[] {
  const saved = page.frames?.[stepId]?.blocks;
  if (!saved?.length) {
    return frameBlocksForStep(page, stepId, stepDef, strela, cards, undefined);
  }
  if (strela && stepDef?.type === "card-grid") {
    if (usesDecomposedStrelaFrames(saved)) {
      return ensureDecomposedCardBlocks(saved, stepDef, cards);
    }
    return saved;
  }
  if (strela && stepDef?.type === "selection-form") {
    return migrateSelectionFormFrameBlocks(saved, stepDef);
  }
  return saved;
}

export function frameBlocksForStep(
  page: PageConfig,
  stepId: string,
  stepDef?: WizardStepDef,
  strela = true,
  cards: { id: string }[] = [],
  appearance?: StrelaAppearance,
): BlockConfig[] {
  const saved = page.frames?.[stepId]?.blocks;
  const raw =
    saved && saved.length > 0
      ? saved
      : stepDef
        ? defaultFrameBlocks(stepDef, strela, cards, appearance)
        : [];

  if (strela && stepDef?.type === "card-grid") {
    return migrateStrelaFrameBlocks(
      raw,
      stepDef,
      cards,
      usesDecomposedStrelaFrames(raw) ? undefined : appearance,
    );
  }
  if (strela && stepDef?.type === "selection-form") {
    return migrateSelectionFormFrameBlocks(raw, stepDef);
  }
  return raw;
}

export function patchWizardPageFrames(
  page: PageConfig,
  stepId: string,
  blocks: BlockConfig[],
): PageConfig {
  return {
    ...page,
    frames: {
      ...(page.frames ?? {}),
      [stepId]: { blocks },
    },
  };
}

export function ensureStepFrame(
  page: PageConfig,
  step: WizardStepDef,
  strela = true,
  cards: { id: string }[] = [],
  appearance?: StrelaAppearance,
): PageConfig {
  const saved = page.frames?.[step.id]?.blocks;
  if (saved && saved.length > 0) {
    if (strela && step.type === "card-grid") {
      const migrated = migrateStrelaFrameBlocks(
        saved,
        step,
        cards,
        appearanceForExistingFrames(saved, appearance),
      );
      const same = JSON.stringify(migrated) === JSON.stringify(saved);
      return same ? page : patchWizardPageFrames(page, step.id, migrated);
    }
    if (strela && step.type === "selection-form") {
      const migrated = migrateSelectionFormFrameBlocks(saved, step);
      const same = JSON.stringify(migrated) === JSON.stringify(saved);
      return same ? page : patchWizardPageFrames(page, step.id, migrated);
    }
    return page;
  }
  return patchWizardPageFrames(
    page,
    step.id,
    defaultFrameBlocks(step, strela, cards, appearance),
  );
}

export function syncWizardPageFrames(
  page: PageConfig,
  steps: WizardStepDef[],
  strela = true,
  cardsByStep: Record<string, { id: string }[]> = {},
  appearance?: StrelaAppearance,
): PageConfig {
  let next = page;
  for (const step of steps) {
    next = ensureStepFrame(next, step, strela, cardsByStep[step.id] ?? [], appearance);
  }
  const stepIds = new Set(steps.map((s) => s.id));
  const frames = { ...(next.frames ?? {}) };
  for (const key of Object.keys(frames)) {
    if (!stepIds.has(key)) delete frames[key];
  }
  return { ...next, frames };
}

export function removeStepFrame(page: PageConfig, stepId: string): PageConfig {
  if (!page.frames?.[stepId]) return page;
  const frames = { ...page.frames };
  delete frames[stepId];
  return { ...page, frames };
}

export function replaceStepFrame(
  page: PageConfig,
  step: WizardStepDef,
  strela = true,
  cards: { id: string }[] = [],
  appearance?: StrelaAppearance,
): PageConfig {
  return patchWizardPageFrames(
    page,
    step.id,
    defaultFrameBlocks(step, strela, cards, appearance),
  );
}

export function addCardBlockToStep(
  page: PageConfig,
  step: WizardStepDef,
  _cardId: string,
  cards: { id: string }[],
): PageConfig {
  const blocks = frameBlocksForStep(page, step.id, step, true, cards);
  if (!usesDecomposedStrelaFrames(blocks)) {
    return page;
  }
  return patchWizardPageFrames(page, step.id, syncDecomposedCardBlocks(blocks, step, cards));
}

export function removeCardBlockFromStep(
  page: PageConfig,
  stepId: string,
  step: WizardStepDef,
  _cardId: string,
  cards: { id: string }[],
): PageConfig {
  const blocks = frameBlocksForStep(page, stepId, step, true, cards);
  if (!usesDecomposedStrelaFrames(blocks)) {
    return page;
  }
  return patchWizardPageFrames(page, stepId, syncDecomposedCardBlocks(blocks, step, cards));
}

export function newWizardFrameBlock(type: string, stepId: string, y = 0): BlockConfig {
  const base = defaultBlockLayout(type, 0);
  const props: Record<string, unknown> = {};
  if (type.startsWith("wizard/") && type !== WIZARD_LEGACY_SELECTION) {
    props.stepId = stepId;
  }
  return {
    id: `block-${Date.now()}`,
    type,
    props,
    layout: { ...base, y },
  };
}
