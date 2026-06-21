import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BlockConfig, PageConfig, SiteConfig } from "@pumpstation/contracts";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { WizardStepRenderer, wizardStepUsesFrames } from "@/engine/WizardStepRenderer";
import { StudioGridEditorShell } from "@/routes/admin/studio/canvas/StudioGridEditorShell";
import { studioArtboardMinHeight } from "@/routes/admin/studio/canvas/studioGridMetrics";
import { pageGridMetrics } from "@/lib/gridLayout";
import { Palette } from "@/routes/admin/studio/palette/Palette";
import { LayersPanel } from "@/routes/admin/studio/palette/LayersPanel";
import { PropertiesPanel } from "@/routes/admin/studio/properties/PropertiesPanel";
import { PagePropertiesPanel } from "@/routes/admin/studio/properties/PagePropertiesPanel";
import { DraftPagePreview } from "@/routes/admin/studio/preview/DraftPagePreview";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { useStudioBlockEditor } from "@/hooks/useStudioBlockEditor";
import { StudioProfileProvider } from "@/providers/StudioProfileProvider";
import type { ProfileBundle } from "@/api/config";
import type { WizardNavState } from "./wizardTypes";
import { WizardNavPanel } from "./panels/WizardNavPanel";
import {
  normalizeWizardPage,
  readBlockStepId,
  withBlockStepId,
} from "./wizardUnifiedBlocks";

/**
 * Option C: wizard page edited like CMS — one page.blocks[], scoped by props.stepId.
 */
export function WizardUnifiedPageEditor({
  page,
  site,
  profileBundle,
  initialNav,
  onPageChange,
  onBlocksChange,
  selectedBlockId,
  onSelectBlock,
  previewMode = false,
  onPreviewClose,
  previewStepId,
  onPreviewStepChange,
  layersExtra,
  hideNavPanel = false,
  canvasToolbar,
  rightSidebarExtra,
}: {
  page: PageConfig;
  site: SiteConfig;
  profileBundle: ProfileBundle;
  initialNav: WizardNavState;
  onPageChange: (patch: Partial<PageConfig>) => void;
  onBlocksChange: (page: PageConfig) => void;
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  previewMode?: boolean;
  onPreviewClose?: () => void;
  previewStepId?: string;
  onPreviewStepChange?: (stepId: string) => void;
  layersExtra?: ReactNode;
  hideNavPanel?: boolean;
  canvasToolbar?: ReactNode;
  rightSidebarExtra?: ReactNode;
}) {
  const normalizedPage = useMemo(() => normalizeWizardPage(page), [page]);
  const [stepId, setStepId] = useState(
    previewStepId ?? initialNav.steps[0]?.id ?? "product-class",
  );
  const { state: allBlocks, setState: setAllBlocks, undo, redo, reset, canUndo, canRedo } =
    useUndoRedo(normalizedPage.blocks ?? []);
  const pageIdRef = useRef(page.id);
  const onBlocksChangeRef = useRef(onBlocksChange);
  onBlocksChangeRef.current = onBlocksChange;

  useEffect(() => {
    if (previewStepId && previewStepId !== stepId) setStepId(previewStepId);
  }, [previewStepId, stepId]);

  const selectStep = useCallback(
    (id: string) => {
      setStepId(id);
      onSelectBlock(null);
      onPreviewStepChange?.(id);
    },
    [onSelectBlock, onPreviewStepChange],
  );

  useEffect(() => {
    if (page.id !== pageIdRef.current) {
      pageIdRef.current = page.id;
      reset(normalizeWizardPage(page).blocks ?? []);
    }
  }, [page, reset]);

  const stepDef = initialNav.steps.find((s) => s.id === stepId);
  const stepCards = initialNav.cards[stepId] ?? [];
  const isStrelaFunnel =
    (profileBundle.branding as { layoutVariant?: string }).layoutVariant === "strela-funnel";

  const stepBlocks = useMemo(
    () => allBlocks.filter((b) => readBlockStepId(b) === stepId),
    [allBlocks, stepId],
  );

  const draftPage = useMemo(
    () => ({ ...normalizedPage, blocks: allBlocks, frames: undefined }),
    [normalizedPage, allBlocks],
  );

  useEffect(() => {
    onBlocksChangeRef.current({ ...draftPage, blocks: allBlocks, frames: undefined });
  }, [allBlocks, draftPage]);

  const patchStepBlocks = useCallback(
    (next: BlockConfig[] | ((prev: BlockConfig[]) => BlockConfig[])) => {
      setAllBlocks((prev) => {
        const currentStep = prev.filter((b) => readBlockStepId(b) === stepId);
        const resolved = typeof next === "function" ? next(currentStep) : next;
        const tagged = resolved.map((b) => withBlockStepId(b, stepId));
        const rest = prev.filter((b) => readBlockStepId(b) !== stepId);
        return [...rest, ...tagged];
      });
    },
    [setAllBlocks, stepId],
  );

  const gridMetrics = useMemo(
    () => pageGridMetrics(page, stepBlocks),
    [page, stepBlocks],
  );

  const {
    addBlock,
    removeBlock,
    reorderBlock,
    updateBlockType,
    updateProp,
    updateBinding,
    updateLayout,
    rotateSelectedBlock,
    handlePaletteDragEnd,
    handleLayerReorderDragEnd,
  } = useStudioBlockEditor({
    blocks: stepBlocks,
    patchBlocks: patchStepBlocks,
    page,
    gridCols: gridMetrics.cols,
    selectedBlockId,
    onSelectBlock,
    extraPropsForType: (type) =>
      type.startsWith("wizard/") && type !== "wizard/legacy-selection" ? { stepId } : undefined,
  });

  const selectedBlock = stepBlocks.find((b) => b.id === selectedBlockId) ?? null;
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const previewUsesFrames = wizardStepUsesFrames(
    draftPage,
    stepId,
    stepDef,
    isStrelaFunnel,
    stepCards,
  );

  const artboardMinHeight = studioArtboardMinHeight(page, stepBlocks, {
    strelaFunnel: isStrelaFunnel,
    usesFrames: previewUsesFrames,
  });

  const draftBundle = useMemo(
    (): ProfileBundle => ({
      ...profileBundle,
      wizard: {
        navigation: { steps: initialNav.steps, cards: initialNav.cards },
        flows: initialNav.flows ?? {},
      },
    }),
    [profileBundle, initialNav],
  );

  const draftSite: SiteConfig = useMemo(
    () => ({
      layout: site.layout,
      pages: site.pages.map((p) => (p.id === page.id ? draftPage : p)),
      routing: site.routing,
    }),
    [site, page.id, draftPage],
  );

  if (previewMode) {
    return (
      <DraftPagePreview
        page={draftPage}
        site={draftSite}
        bundle={draftBundle}
        previewWizardStepId={stepId}
        onClose={() => onPreviewClose?.()}
      />
    );
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    if (handlePaletteDragEnd(event)) return;
    handleLayerReorderDragEnd(event);
  };

  const stepTitle = stepDef?.title ?? stepDef?.titleKey ?? stepId;

  return (
    <StudioGridEditorShell
      layers={
        <div className="space-y-3">
          {layersExtra}
          {!hideNavPanel && (
            <WizardNavPanel
              nav={initialNav}
              selectedStepId={stepId}
              onSelectStep={selectStep}
              onRemoveStep={() => {}}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
            />
          )}
          <div className="border-t border-[#333] pt-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[10px] font-semibold uppercase text-[#666]">Слои</span>
            </div>
            <LayersPanel
              blocks={stepBlocks}
              selectedId={selectedBlockId}
              onSelect={onSelectBlock}
              onReorder={reorderBlock}
              onDelete={removeBlock}
            />
          </div>
        </div>
      }
      assets={<Palette categoryFilter="wizard" onAddBlock={addBlock} />}
      artboardLabel={`${page.title} — ${stepTitle}`}
      artboardWidth={gridMetrics.artboardWidth}
      artboardMinHeight={artboardMinHeight}
      canvasToolbar={canvasToolbar}
      onCanvasSelect={onSelectBlock}
      onDropBlock={addBlock}
      canvas={
        <div className="relative w-full" style={{ minHeight: artboardMinHeight }}>
          <StudioProfileProvider bundle={draftBundle}>
            <WizardStepRenderer
              page={draftPage}
              stepId={stepId}
              stepDef={stepDef}
              strela={isStrelaFunnel}
              site={site}
              editor={{
                selectedId: selectedBlockId,
                onSelect: onSelectBlock,
                profileId: profileBundle.profile.id,
                onFrameBlocksChange: (updater) => {
                  patchStepBlocks(updater);
                },
              }}
            />
          </StudioProfileProvider>
        </div>
      }
      dragOverlay={
        activeDragId?.startsWith("palette-") ? (
          <div className="rounded bg-[#333] px-3 py-2 text-xs text-white shadow-lg">
            {activeDragId.replace("palette-", "")}
          </div>
        ) : null
      }
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      selectedBlockId={selectedBlockId}
      onClearSelection={() => onSelectBlock(null)}
      onDeleteSelected={() => selectedBlockId && removeBlock(selectedBlockId)}
      onRotateSelected={() => selectedBlockId && rotateSelectedBlock(selectedBlockId)}
      onUndo={undo}
      onRedo={redo}
      canUndo={canUndo}
      canRedo={canRedo}
      rightSidebar={
        <>
          {rightSidebarExtra}
          {selectedBlock ? (
            <PropertiesPanel
              block={selectedBlock}
              gridCols={gridMetrics.cols}
              profileId={profileBundle.profile.id}
              onChangeType={(type) => updateBlockType(selectedBlock.id, type)}
              onChangeProp={(key, value) => updateProp(selectedBlock.id, key, value)}
              onChangeBinding={(key, value) => updateBinding(selectedBlock.id, key, value)}
              onChangeLayout={(layout) => updateLayout(selectedBlock.id, layout)}
            />
          ) : (
            <PagePropertiesPanel page={draftPage} site={site} onChange={onPageChange} />
          )}
        </>
      }
    />
  );
}
