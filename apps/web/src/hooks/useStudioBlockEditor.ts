import { useCallback } from "react";
import type { BlockConfig, BlockGridLayout, PageConfig } from "@pumpstation/contracts";
import { defaultBlockLayout as blockDefaultLayout } from "@pumpstation/contracts";
import type { DragEndEvent } from "@dnd-kit/core";
import { getSchema } from "@/routes/admin/studio/properties/blockSchema";
import { setNested } from "@/routes/admin/studio/canvas/studioPropUtils";
import { createStudioBlock } from "@/routes/admin/studio/canvas/studioBlockFactory";
import { STUDIO_CANVAS_DROP_ZONE_ID } from "@/routes/admin/studio/canvas/studioCanvasContext";
import {
  authBlockColumn,
  clampLayout,
  canPlaceLayout,
  findFreeLayout,
  nextAvailableY,
  reorderBlocksInLayers,
} from "@/lib/gridLayout";
import { rotateLayoutBy } from "@/lib/blockTransform";

export type StudioPatchBlocks = (
  next: BlockConfig[] | ((prev: BlockConfig[]) => BlockConfig[]),
) => void;

export function useStudioBlockEditor({
  blocks,
  patchBlocks,
  page,
  gridCols,
  selectedBlockId,
  onSelectBlock,
  extraPropsForType,
}: {
  blocks: BlockConfig[];
  patchBlocks: StudioPatchBlocks;
  page: PageConfig;
  gridCols: number;
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  /** Wizard: inject stepId etc. when adding blocks from palette */
  extraPropsForType?: (type: string) => Record<string, unknown> | undefined;
}) {
  const defaultProps = useCallback((type: string): Record<string, unknown> => {
    const schema = getSchema(type);
    if (!schema) return {};
    let result: Record<string, unknown> = {};
    for (const field of schema.fields) {
      if (field.defaultValue !== undefined) {
        result = setNested(result, field.key, field.defaultValue);
      }
    }
    return result;
  }, []);

  const insertBlockAt = useCallback(
    (type: string, index: number) => {
      const block = createStudioBlock(type, {
        cols: gridCols,
        existing: blocks,
        extraProps: extraPropsForType?.(type),
      });
      patchBlocks((prev) => {
        const next = [...prev];
        next.splice(index, 0, block);
        return next;
      });
      onSelectBlock(block.id);
    },
    [blocks, gridCols, extraPropsForType, patchBlocks, onSelectBlock],
  );

  const addBlock = useCallback(
    (type: string) => {
      const extraProps = extraPropsForType?.(type);
      const block = createStudioBlock(type, {
        cols: gridCols,
        existing: blocks,
        extraProps,
      });
      patchBlocks((prev) => {
        if (page.type === "auth") {
          const column = type === "auth/brand-panel" ? "left" : "right";
          const x = column === "left" ? 0 : Math.floor(gridCols / 2);
          const w = column === "left" ? Math.floor(gridCols / 2) : Math.ceil(gridCols / 2);
          const colBlocks = prev.filter((b) => authBlockColumn(b, gridCols) === column);
          const y = nextAvailableY(colBlocks);
          const baseH = block.layout?.h ?? 4;
          const layout = clampLayout({ x, y, w, h: baseH }, gridCols);
          return [...prev, { ...block, layout }];
        }
        const baseLayout = block.layout ?? { x: 0, y: 0, w: 12, h: 4 };
        const layout = findFreeLayout(
          prev,
          baseLayout.w,
          baseLayout.h,
          gridCols,
          nextAvailableY(prev),
        );
        return [...prev, { ...block, layout }];
      });
      onSelectBlock(block.id);
    },
    [blocks, gridCols, extraPropsForType, page.type, patchBlocks, onSelectBlock],
  );

  const removeBlock = useCallback(
    (id: string) => {
      patchBlocks((prev) => prev.filter((b) => b.id !== id));
      if (selectedBlockId === id) onSelectBlock(null);
    },
    [patchBlocks, selectedBlockId, onSelectBlock],
  );

  const reorderBlock = useCallback(
    (from: number, to: number) => {
      patchBlocks((prev) =>
        reorderBlocksInLayers(prev, from, to, page.type ?? "page", gridCols),
      );
    },
    [patchBlocks, page.type, gridCols],
  );

  const updateBlockType = useCallback(
    (id: string, type: string) => {
      patchBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, type, props: defaultProps(type) } : b)),
      );
    },
    [patchBlocks, defaultProps],
  );


  const updateBinding = useCallback(
    (id: string, key: string, value: unknown) => {
      patchBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== id) return b;
          const bindings = setNested(
            (b.bindings ?? {}) as Record<string, unknown>,
            key,
            value,
          );
          return { ...b, bindings };
        }),
      );
    },
    [patchBlocks],
  );

  const updateProp = useCallback(
    (id: string, key: string, value: unknown) => {
      patchBlocks((prev) =>
        prev.map((b) =>
          b.id !== id ? b : { ...b, props: setNested(b.props ?? {}, key, value) },
        ),
      );
    },
    [patchBlocks],
  );

  const updateLayout = useCallback(
    (id: string, layout: BlockGridLayout) => {
      const next = clampLayout(layout, gridCols);
      patchBlocks((prev) => {
        if (!canPlaceLayout(next, prev, id, gridCols)) return prev;
        return prev.map((b) => (b.id === id ? { ...b, layout: next } : b));
      });
    },
    [patchBlocks, gridCols],
  );

  const rotateSelectedBlock = useCallback(
    (blockId: string) => {
      const block = blocks.find((b) => b.id === blockId);
      if (!block?.layout) return;
      updateLayout(blockId, rotateLayoutBy(block.layout, 90));
    },
    [blocks, updateLayout],
  );

  const handlePaletteDragEnd = useCallback(
    (event: DragEndEvent, paletteIdPrefix = "palette-") => {
      const { active, over } = event;
      if (!over) return false;

      const activeId = String(active.id);
      if (!activeId.startsWith(paletteIdPrefix)) return false;

      const type = (active.data.current as { blockType?: string })?.blockType;
      if (!type) return true;

      const overId = String(over.id);
      if (overId === STUDIO_CANVAS_DROP_ZONE_ID) {
        addBlock(type);
        return true;
      }
      const overIndex = blocks.findIndex((b) => b.id === overId);
      if (overIndex >= 0) insertBlockAt(type, overIndex);
      else addBlock(type);
      return true;
    },
    [addBlock, blocks, insertBlockAt],
  );

  const handleLayerReorderDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return false;
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      if (oldIndex >= 0 && newIndex >= 0) reorderBlock(oldIndex, newIndex);
      return true;
    },
    [blocks, reorderBlock],
  );

  const updateBlockTypeWithExtras = useCallback(
    (id: string, type: string, stepId?: string) => {
      patchBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== id) return b;
          const base = blockDefaultLayout(type, 0);
          const props: Record<string, unknown> = { ...defaultProps(type) };
          if (stepId && type.startsWith("wizard/") && type !== "wizard/legacy-selection") {
            props.stepId = stepId;
          }
          return { ...b, type, props, layout: b.layout ?? base };
        }),
      );
    },
    [patchBlocks, defaultProps],
  );

  return {
    addBlock,
    insertBlockAt,
    removeBlock,
    reorderBlock,
    updateBlockType,
    updateBlockTypeWithExtras,
    updateProp,
    updateBinding,
    updateLayout,
    rotateSelectedBlock,
    handlePaletteDragEnd,
    handleLayerReorderDragEnd,
  };
}
