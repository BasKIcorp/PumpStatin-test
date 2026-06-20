import { useCallback, useEffect, useRef, useState } from "react";
import type { BlockConfig, PageConfig, SiteConfig } from "@pumpstation/contracts";
import { defaultBlockLayout as blockDefaultLayout } from "@pumpstation/contracts";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Palette } from "@/routes/admin/studio/palette/Palette";
import { LayersPanel } from "@/routes/admin/studio/palette/LayersPanel";
import { StudioCanvas } from "./StudioCanvas";
import { StudioPageCanvas } from "./StudioPageCanvas";
import { PropertiesPanel } from "@/routes/admin/studio/properties/PropertiesPanel";
import { PagePropertiesPanel } from "@/routes/admin/studio/properties/PagePropertiesPanel";
import { getSchema } from "@/routes/admin/studio/properties/blockSchema";
import { DraftPagePreview } from "@/routes/admin/studio/preview/DraftPagePreview";
import { setNested } from "./studioPropUtils";
import { StudioLeftSidebar } from "@/routes/admin/studio/figma/StudioLeftSidebar";
import { StudioRightSidebar } from "@/routes/admin/studio/figma/StudioRightSidebar";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { UndoRedoButtons } from "@/routes/admin/studio/components/UndoRedoButtons";
import { AuthLoginProvider } from "@/blocks/auth/AuthLoginProvider";
import { findFreeLayout, nextAvailableY, pageGridMetrics, gridContentHeight, clampLayout, canPlaceLayout, reorderBlocksInLayers, authBlockColumn } from "@/lib/gridLayout";
import type { BlockGridLayout } from "@pumpstation/contracts";
import { STUDIO_CANVAS_DROP_ZONE_ID } from "./studioCanvasContext";

function defaultProps(type: string): Record<string, unknown> {
  const schema = getSchema(type);
  if (!schema) return {};
  let result: Record<string, unknown> = {};
  for (const field of schema.fields) {
    if (field.defaultValue !== undefined) {
      result = setNested(result, field.key, field.defaultValue);
    }
  }
  return result;
}

function newBlock(type: string, y = 0): BlockConfig {
  const base = blockDefaultLayout(type, 0);
  return {
    id: `block-${Date.now()}`,
    type,
    props: defaultProps(type),
    layout: { ...base, y },
  };
}

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

  const patchBlocks = useCallback(
    (next: BlockConfig[] | ((prev: BlockConfig[]) => BlockConfig[])) => {
      if (typeof next === "function") {
        setEditBlocks((prev) => {
          const resolved = next(prev);
          onBlocksChange(resolved);
          return resolved;
        });
        return;
      }
      setEditBlocks(next);
      onBlocksChange(next);
    },
    [setEditBlocks, onBlocksChange],
  );

  useEffect(() => {
    onBlocksChange(editBlocks);
  }, [editBlocks, onBlocksChange]);

  useEffect(() => {
    if (page.id === pageIdRef.current) return;
    pageIdRef.current = page.id;
    reset(blocks);
  }, [page.id, blocks, reset]);

  const insertBlockAt = useCallback(
    (type: string, index: number) => {
      const block = newBlock(type);
      patchBlocks((prev) => {
        const nb = [...prev];
        nb.splice(index, 0, block);
        return nb;
      });
      onSelectBlock(block.id);
    },
    [patchBlocks, onSelectBlock],
  );

  const addBlock = useCallback(
    (type: string) => {
      const block = newBlock(type);
      patchBlocks((prev) => {
        if (page.type === "auth") {
          const cols = gridMetrics.cols;
          const column = type === "auth/brand-panel" ? "left" : "right";
          const x = column === "left" ? 0 : Math.floor(cols / 2);
          const w = column === "left" ? Math.floor(cols / 2) : Math.ceil(cols / 2);
          const colBlocks = prev.filter((b) => authBlockColumn(b, cols) === column);
          const y = nextAvailableY(colBlocks);
          const baseH = block.layout?.h ?? 4;
          const layout = clampLayout({ x, y, w, h: baseH }, cols);
          return [...prev, { ...block, layout }];
        }
        const baseLayout = block.layout ?? { x: 0, y: 0, w: 12, h: 4 };
        const layout = findFreeLayout(
          prev,
          baseLayout.w,
          baseLayout.h,
          gridMetrics.cols,
          nextAvailableY(prev),
        );
        return [...prev, { ...block, layout }];
      });
      onSelectBlock(block.id);
    },
    [patchBlocks, onSelectBlock, gridMetrics.cols, page.type],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const removeBlock = (id: string) => {
    patchBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedBlockId === id) onSelectBlock(null);
  };

  const reorderBlock = (from: number, to: number) => {
    patchBlocks((prev) =>
      reorderBlocksInLayers(prev, from, to, page.type ?? "page", gridMetrics.cols),
    );
  };

  const updateBlockType = (id: string, type: string) => {
    patchBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, type, props: defaultProps(type) } : b)),
    );
  };

  const updateProp = (id: string, key: string, value: unknown) => {
    patchBlocks((prev) =>
      prev.map((b) =>
        b.id !== id ? b : { ...b, props: setNested(b.props ?? {}, key, value) },
      ),
    );
  };

  const updateLayout = (id: string, layout: BlockGridLayout) => {
    const next = clampLayout(layout, gridMetrics.cols);
    patchBlocks((prev) => {
      if (!canPlaceLayout(next, prev, id, gridMetrics.cols)) return prev;
      return prev.map((b) => (b.id === id ? { ...b, layout: next } : b));
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    if (activeId.startsWith("palette-")) {
      const type = (active.data.current as { blockType?: string })?.blockType;
      if (!type) return;
      const overId = String(over.id);
      if (overId === STUDIO_CANVAS_DROP_ZONE_ID) {
        addBlock(type);
        return;
      }
      const overIndex = editBlocks.findIndex((b) => b.id === overId);
      if (overIndex >= 0) insertBlockAt(type, overIndex);
      else addBlock(type);
      return;
    }

    if (active.id !== over.id) {
      const oldIndex = editBlocks.findIndex((b) => b.id === active.id);
      const newIndex = editBlocks.findIndex((b) => b.id === over.id);
      if (oldIndex >= 0 && newIndex >= 0) reorderBlock(oldIndex, newIndex);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === "Escape") onSelectBlock(null);
      if ((e.key === "Delete" || e.key === "Backspace") && selectedBlockId) {
        e.preventDefault();
        patchBlocks((prev) => prev.filter((b) => b.id !== selectedBlockId));
        onSelectBlock(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedBlockId, patchBlocks, onSelectBlock, undo, redo]);

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

  const isAuthPage = page.type === "auth";
  const artboardMinHeight =
    page.type === "auth"
      ? 900
      : page.type === "cabinet"
        ? 700
        : Math.max(700, gridContentHeight(editBlocks, gridMetrics.rowHeight));

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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full min-h-0 flex-1 overflow-hidden">
        <StudioLeftSidebar
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
        />

        <StudioCanvas
          artboardLabel={page.title}
          artboardWidth={gridMetrics.artboardWidth}
          artboardMinHeight={artboardMinHeight}
          onSelect={onSelectBlock}
          onDropBlock={addBlock}
        >
          {isAuthPage ? <AuthLoginProvider>{canvas}</AuthLoginProvider> : canvas}
        </StudioCanvas>

        <StudioRightSidebar>
          {selectedBlock ? (
            <PropertiesPanel
              block={selectedBlock}
              gridCols={gridMetrics.cols}
              onChangeType={(type) => updateBlockType(selectedBlock.id, type)}
              onChangeProp={(key, value) => updateProp(selectedBlock.id, key, value)}
              onChangeLayout={(layout) => updateLayout(selectedBlock.id, layout)}
            />
          ) : (
            <PagePropertiesPanel page={page} site={site} onChange={onPageChange} />
          )}
        </StudioRightSidebar>
      </div>

      <DragOverlay>
        {activePaletteType ? (
          <div className="rounded bg-[#383838] px-3 py-2 text-xs text-white shadow-lg">
            + {activePaletteType}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
