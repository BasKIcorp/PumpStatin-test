import { useCallback, useEffect, useRef, useState } from "react";
import type { BlockConfig, PageConfig, SiteConfig } from "@pumpstation/contracts";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { Palette } from "@/routes/admin/studio/palette/Palette";
import { LayersPanel } from "@/routes/admin/studio/palette/LayersPanel";
import { StudioPageCanvas } from "./StudioPageCanvas";
import { PropertiesPanel } from "@/routes/admin/studio/properties/PropertiesPanel";
import { PagePropertiesPanel } from "@/routes/admin/studio/properties/PagePropertiesPanel";
import { DraftPagePreview } from "@/routes/admin/studio/preview/DraftPagePreview";
import { StudioGridEditorShell } from "./StudioGridEditorShell";
import { pageGridMetrics, studioArtboardMinHeight } from "./studioGridMetrics";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { useStudioBlockEditor } from "@/hooks/useStudioBlockEditor";
import { UndoRedoButtons } from "@/routes/admin/studio/components/UndoRedoButtons";
import { AuthLoginProvider } from "@/blocks/auth/AuthLoginProvider";

export function VisualPageEditor({
  blocks,
  page,
  onPageChange,
  onBlocksChange,
  selectedBlockId,
  onSelectBlock,
  profileId,
  site,
  previewMode = false,
  onPreviewClose,
}: {
  blocks: BlockConfig[];
  page: PageConfig;
  site: SiteConfig;
  onPageChange: (patch: Partial<PageConfig>) => void;
  onBlocksChange: (blocks: BlockConfig[]) => void;
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  profileId?: string;
  previewMode?: boolean;
  onPreviewClose?: () => void;
}) {
  const { state: editBlocks, setState: setEditBlocks, undo, redo, reset, canUndo, canRedo } =
    useUndoRedo(blocks);
  const selectedBlock = editBlocks.find((b) => b.id === selectedBlockId) ?? null;
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const gridMetrics = pageGridMetrics(page);
  const pageIdRef = useRef(page.id);
  const onBlocksChangeRef = useRef(onBlocksChange);
  onBlocksChangeRef.current = onBlocksChange;

  const patchBlocks = useCallback(
    (next: BlockConfig[] | ((prev: BlockConfig[]) => BlockConfig[])) => {
      setEditBlocks(next);
    },
    [setEditBlocks],
  );

  const {
    addBlock,
    removeBlock,
    reorderBlock,
    updateBlockType,
    updateProp,
    updateLayout,
    rotateSelectedBlock,
    handlePaletteDragEnd,
    handleLayerReorderDragEnd,
  } = useStudioBlockEditor({
    blocks: editBlocks,
    patchBlocks,
    page,
    gridCols: gridMetrics.cols,
    selectedBlockId,
    onSelectBlock,
  });

  useEffect(() => {
    onBlocksChangeRef.current(editBlocks);
  }, [editBlocks]);

  useEffect(() => {
    if (page.id === pageIdRef.current) return;
    pageIdRef.current = page.id;
    reset(blocks);
  }, [page.id, blocks, reset]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    if (handlePaletteDragEnd(event)) return;
    handleLayerReorderDragEnd(event);
  };

  const draftPage: PageConfig = { ...page, blocks: editBlocks };
  const draftSite: SiteConfig = {
    layout: site.layout,
    pages: site.pages.map((p) => (p.id === page.id ? draftPage : p)),
  };

  if (previewMode) {
    return (
      <div className="relative h-full min-h-0 flex-1">
        <DraftPagePreview page={draftPage} site={draftSite} onClose={() => onPreviewClose?.()} />
      </div>
    );
  }

  const activePaletteType = activeDragId?.startsWith("palette-")
    ? activeDragId.replace("palette-", "")
    : null;

  const artboardMinHeight = studioArtboardMinHeight(page, editBlocks);
  const isAuthPage = page.type === "auth";

  const canvas = (
    <StudioPageCanvas
      page={page}
      blocks={editBlocks}
      site={site}
      selectedId={selectedBlockId}
      onSelect={onSelectBlock}
      onBlocksChange={patchBlocks}
      profileId={profileId}
    />
  );

  return (
    <StudioGridEditorShell
      layers={
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-semibold uppercase text-[#666]">Слои</span>
            <UndoRedoButtons canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} />
          </div>
          <LayersPanel
            blocks={editBlocks}
            selectedId={selectedBlockId}
            onSelect={onSelectBlock}
            onReorder={reorderBlock}
            onDelete={removeBlock}
          />
        </div>
      }
      assets={<Palette onAddBlock={addBlock} />}
      rightSidebar={
        selectedBlock ? (
          <PropertiesPanel
            block={selectedBlock}
            gridCols={gridMetrics.cols}
            onChangeType={(type) => updateBlockType(selectedBlock.id, type)}
            onChangeProp={(key, value) => updateProp(selectedBlock.id, key, value)}
            onChangeLayout={(layout) => updateLayout(selectedBlock.id, layout)}
          />
        ) : (
          <PagePropertiesPanel page={page} site={site} onChange={onPageChange} />
        )
      }
      artboardLabel={page.title}
      artboardWidth={gridMetrics.artboardWidth}
      artboardMinHeight={artboardMinHeight}
      onCanvasSelect={onSelectBlock}
      onDropBlock={addBlock}
      canvas={isAuthPage ? <AuthLoginProvider>{canvas}</AuthLoginProvider> : canvas}
      dragOverlay={
        activePaletteType ? (
          <div className="rounded bg-[#383838] px-3 py-2 text-xs text-white shadow-lg">
            + {activePaletteType}
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
    />
  );
}
