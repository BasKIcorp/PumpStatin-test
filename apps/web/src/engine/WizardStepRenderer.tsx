import { useCallback, useRef } from "react";
import type { BlockConfig, BlockGridLayout, PageConfig, SiteConfig } from "@pumpstation/contracts";
import { GridPageContent } from "@/engine/GridPageContent";
import { WizardEngine } from "@/engines/WizardEngine";
import type { PageEditorOptions } from "@/engine/pageEditorTypes";
import { clampLayout, canPlaceLayout, pageGridMetrics } from "@/lib/gridLayout";
import { useProfile } from "@/providers/ProfileProvider";
import {
  frameBlocksForStep,
  usesDecomposedSelectionFormFrames,
  usesDecomposedStrelaFrames,
  usesDecomposedWizardFrames,
} from "@/routes/admin/studio/wizard/wizardFrameUtils";
import {
  blocksForWizardStep,
  normalizeWizardPage,
  wizardUsesUnifiedBlocks,
} from "@/routes/admin/studio/wizard/wizardUnifiedBlocks";
import { SelectionFormBlocksProvider } from "@/blocks/wizard/WizardBlocks";
import { SelectionFormDecomposedLayout } from "@/engine/SelectionFormDecomposedLayout";
import type { NavigationConfig } from "@/types/wizard";
import type { WizardStepDef } from "@/types/wizard";
import { useHorizontalWheelScroll } from "@/hooks/useHorizontalWheelScroll";

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
  /** Studio mobile/tablet viewport — stack selection-form panels vertically */
  stackPanels?: boolean;
}

/**
 * Единый рендер шага визарда.
 * Декомпозированные Strela-frames → GridPageContent (sidebar, heading, cards как блоки).
 * Legacy monolithic frames / без editor → WizardEngine.
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
  stackPanels = false,
}: WizardStepRendererProps) {
  const { wizard, branding } = useProfile();
  const nav = wizard.navigation as NavigationConfig;
  const cards = nav.cards?.[stepId] ?? [];
  const appearance = branding.appearance;
  const unifiedPage = normalizeWizardPage(page);
  const unified = wizardUsesUnifiedBlocks(unifiedPage);
  const frameBlocks = unified
    ? blocksForWizardStep(unifiedPage, stepId)
    : frameBlocksForStep(
        page,
        stepId,
        stepDef,
        strela,
        cards,
        editor ? undefined : appearance,
      );
  const gridDecomposed = usesDecomposedWizardFrames(frameBlocks);
  const strelaDecomposed = strela && usesDecomposedStrelaFrames(frameBlocks);
  const selectionFormDecomposed =
    strela && stepDef?.type === "selection-form" && usesDecomposedSelectionFormFrames(frameBlocks);
  const useFrames = frameBlocks.length > 0 && (Boolean(editor) || gridDecomposed);
  const gridMetrics = pageGridMetrics(page, page.type === "wizard" ? frameBlocks : undefined);
  const { cols } = gridMetrics;
  const scrollRef = useRef<HTMLDivElement>(null);
  useHorizontalWheelScroll(scrollRef, Boolean(strelaDecomposed && !editor));

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
    const stepPage: PageConfig = { ...page, type: "wizard", blocks: frameBlocks };
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
      <div
        ref={scrollRef}
        className={
          strelaDecomposed && editor
            ? "flex w-full min-h-0 flex-col overflow-x-auto overflow-y-auto bg-[var(--funnel-page-bg)]"
            : strelaDecomposed
              ? selectionFormDecomposed
                ? "flex min-h-[100dvh] w-full flex-col overflow-hidden bg-[var(--funnel-page-bg)]"
                : "flex min-h-0 w-full flex-col overflow-x-auto overflow-y-auto bg-[var(--funnel-page-bg)]"
              : "h-full w-full"
        }
      >
        {selectionFormDecomposed ? (
          <SelectionFormBlocksProvider>
            <SelectionFormDecomposedLayout
              page={stepPage}
              blocks={frameBlocks}
              site={site}
              editor={editorOpts}
              stackPanels={stackPanels}
            />
          </SelectionFormBlocksProvider>
        ) : (
          <GridPageContent page={stepPage} blocks={frameBlocks} site={site} editor={editorOpts} />
        )}
      </div>
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
  cards: { id: string }[] = [],
): boolean {
  const unified = normalizeWizardPage(page);
  if (wizardUsesUnifiedBlocks(unified)) {
    return blocksForWizardStep(unified, stepId).length > 0;
  }
  const blocks = frameBlocksForStep(page, stepId, stepDef, strela, cards);
  return blocks.length > 0;
}
