import { useCallback } from "react";
import type { BlockConfig, BlockGridLayout, PageConfig, SiteConfig } from "@pumpstation/contracts";
import { GridPageContent } from "@/engine/GridPageContent";
import { WizardEngine } from "@/engines/WizardEngine";
import type { PageEditorOptions } from "@/engine/pageEditorTypes";
import { clampLayout, canPlaceLayout, pageGridMetrics } from "@/lib/gridLayout";
import { frameBlocksForStep } from "@/routes/admin/studio/wizard/wizardFrameUtils";
import type { WizardStepDef } from "@/types/wizard";

export interface WizardStepRendererProps {
  page: PageConfig;
  stepId: string;
  site?: SiteConfig;
  stepDef?: WizardStepDef;
  strela?: boolean;
  /** Studio: редактирование frame-блоков (grid) */
  editor?: PageEditorOptions & {
    onFrameBlocksChange?: (blocks: BlockConfig[] | ((prev: BlockConfig[]) => BlockConfig[])) => void;
  };
  selectedCardId?: string | null;
  onSelectCard?: (cardId: string) => void;
}

/**
 * Единый рендер шага визарда.
 * Live / read-only preview → WizardEngine (оригинальная вёрстка Strela).
 * Studio с editor → frames + GridPageContent для drag/resize.
 */
export function WizardStepRenderer({
  page,
  stepId,
  site,
  stepDef,
  strela = true,
  editor,
  selectedCardId,
  onSelectCard,
}: WizardStepRendererProps) {
  if (!editor) {
    return (
      <WizardEngine
        previewStep={stepId}
        selectedCardId={selectedCardId}
        onSelectCard={onSelectCard}
      />
    );
  }

  const frameBlocks = frameBlocksForStep(page, stepId, stepDef, strela);
  const useFrames = frameBlocks.length > 0;
  const { cols } = pageGridMetrics(page);

  const onLayoutChange = useCallback(
    (id: string, layout: BlockGridLayout) => {
      if (!editor?.onFrameBlocksChange) return;
      editor.onFrameBlocksChange((prev) => {
        const next = clampLayout(layout, cols);
        if (!canPlaceLayout(next, prev, id, cols)) return prev;
        return prev.map((b) => (b.id === id ? { ...b, layout: next } : b));
      });
    },
    [cols, editor],
  );

  if (useFrames) {
    const stepPage: PageConfig = { ...page, blocks: frameBlocks };
    const editorOpts: PageEditorOptions | undefined = editor
      ? {
          selectedId: editor.selectedId,
          onSelect: editor.onSelect,
          onLayoutChange: editor.onFrameBlocksChange ? onLayoutChange : undefined,
          profileId: editor.profileId,
          blocks: frameBlocks,
        }
      : undefined;

    return (
      <GridPageContent page={stepPage} blocks={frameBlocks} site={site} editor={editorOpts} />
    );
  }

  return (
    <WizardEngine
      previewStep={stepId}
      selectedCardId={selectedCardId}
      onSelectCard={onSelectCard}
    />
  );
}

/** Есть ли сохранённые или дефолтные frame-блоки для шага */
export function wizardStepUsesFrames(
  page: PageConfig,
  stepId: string,
  stepDef?: WizardStepDef,
  strela = true,
): boolean {
  const blocks = frameBlocksForStep(page, stepId, stepDef, strela);
  return blocks.length > 0;
}
