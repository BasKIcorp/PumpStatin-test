import type { BlockConfig, PageConfig } from "@pumpstation/contracts";
import { defaultBlockLayout } from "@pumpstation/contracts";
import type { WizardStepDef } from "@/types/wizard";

export function defaultFrameBlocks(step: WizardStepDef, strela = true): BlockConfig[] {
  if (step.type === "card-grid") {
    const cardType = strela ? "wizard/card-grid-strela" : "wizard/card-grid-simple";
    if (strela) {
      return [
        {
          id: `w-cards-${step.id}`,
          type: cardType,
          layout: { x: 0, y: 0, w: 12, h: 12 },
          props: { stepId: step.id },
        },
      ];
    }
    return [
      {
        id: `w-heading-${step.id}`,
        type: "wizard/step-heading",
        layout: { x: 0, y: 0, w: 12, h: 2 },
        props: { stepId: step.id },
      },
      {
        id: `w-cards-${step.id}`,
        type: cardType,
        layout: { x: 0, y: 2, w: 12, h: 12 },
        props: { stepId: step.id },
      },
    ];
  }
  if (step.type === "selection-form") {
    return [
      {
        id: `w-form-${step.id}`,
        type: "wizard/legacy-selection",
        layout: { x: 0, y: 0, w: 12, h: 24 },
        props: {},
      },
    ];
  }
  return [];
}

function normalizeStrelaFrameBlocks(blocks: BlockConfig[], stepDef?: WizardStepDef): BlockConfig[] {
  if (stepDef?.type !== "card-grid") return blocks;
  return blocks
    .filter((b) => b.type !== "wizard/step-heading")
    .map((b) =>
      b.type === "wizard/card-grid-strela" && (b.layout?.y ?? 0) > 0
        ? { ...b, layout: { ...b.layout!, y: 0 } }
        : b,
    );
}

export function frameBlocksForStep(
  page: PageConfig,
  stepId: string,
  stepDef?: WizardStepDef,
  strela = true,
): BlockConfig[] {
  const saved = page.frames?.[stepId]?.blocks;
  const raw =
    saved && saved.length > 0
      ? saved
      : stepDef
        ? defaultFrameBlocks(stepDef, strela)
        : [];
  return strela ? normalizeStrelaFrameBlocks(raw, stepDef) : raw;
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

/** Добавляет frame-блоки для шага, если их ещё нет в site.yaml */
export function ensureStepFrame(
  page: PageConfig,
  step: WizardStepDef,
  strela = true,
): PageConfig {
  const saved = page.frames?.[step.id]?.blocks;
  if (saved && saved.length > 0) return page;
  return patchWizardPageFrames(page, step.id, defaultFrameBlocks(step, strela));
}

/** Синхронизирует frames со списком шагов: добавляет недостающие, удаляет лишние */
export function syncWizardPageFrames(
  page: PageConfig,
  steps: WizardStepDef[],
  strela = true,
): PageConfig {
  let next = page;
  for (const step of steps) {
    next = ensureStepFrame(next, step, strela);
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
): PageConfig {
  return patchWizardPageFrames(page, step.id, defaultFrameBlocks(step, strela));
}

export function newWizardFrameBlock(type: string, stepId: string, y = 0): BlockConfig {
  const base = defaultBlockLayout(type, 0);
  const props: Record<string, unknown> = {};
  if (type.startsWith("wizard/") && type !== "wizard/legacy-selection") {
    props.stepId = stepId;
  }
  return {
    id: `block-${Date.now()}`,
    type,
    props,
    layout: { ...base, y },
  };
}
