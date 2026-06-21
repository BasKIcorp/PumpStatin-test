import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { BlockConfig, BlockCropInset, BlockGridLayout, PageConfig, SiteConfig } from "@pumpstation/contracts";
import { ensurePageBlocksLayout } from "@pumpstation/contracts";
import { useProfile } from "@/providers/ProfileProvider";
import { getBlockComponent } from "@/engine/BlockRegistry";
import { blockProfileProps } from "@/engine/blockProfile";
import type { PageEditorOptions } from "@/engine/pageEditorTypes";
import {
  BlockShell,
  GRID_GAP_PX,
  canPlaceLayout,
  clampLayout,
  gridContentHeight,
  layoutFromPixelDrag,
  layoutFromResize,
  pageGridContainerClass,
  pageGridMetrics,
  pageGridStyle,
} from "@/lib/gridLayout";
import { BlockTransformWrap } from "@/components/studio/BlockTransformWrap";
import {
  angleFromCenter,
  cropFromEdgeDrag,
  emptyCrop,
  hasCrop,
  layoutRotation,
  snapRotation,
  type CropEdge,
} from "@/lib/blockTransform";
import { useStudioCanvasZoom, STUDIO_CANVAS_DROP_ZONE_ID } from "@/routes/admin/studio/canvas/studioCanvasContext";
import { FIGMA } from "@/routes/admin/studio/figma/figmaTokens";

interface GridPageContentProps {
  page: PageConfig;
  blocks: BlockConfig[];
  site?: SiteConfig;
  editor?: PageEditorOptions;
}

function gridBackgroundStyle(
  cols: number,
  rowHeight: number,
  innerWidth: number,
  padLeft: number,
  padTop: number,
): CSSProperties | undefined {
  if (innerWidth <= 0) return undefined;
  const colWidth = (innerWidth - GRID_GAP_PX * (cols - 1)) / cols;
  const cellStepX = colWidth + GRID_GAP_PX;
  const cellStepY = rowHeight + GRID_GAP_PX;
  return {
    backgroundImage: `
      linear-gradient(to right, #e5e7eb 1px, transparent 1px),
      linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
    `,
    backgroundSize: `${cellStepX}px ${cellStepY}px`,
    backgroundPosition: `${padLeft}px ${padTop}px`,
  };
}

function GridEditableBlock({
  block,
  rowHeight,
  cols,
  gridWidth,
  editor,
  site,
  profileId,
}: {
  block: BlockConfig;
  rowHeight: number;
  cols: number;
  gridWidth: number;
  editor: PageEditorOptions;
  site?: SiteConfig;
  profileId?: string;
}) {
  const profile = useProfile();
  const zoom = useStudioCanvasZoom();
  const layout = block.layout ?? { x: 0, y: 0, w: cols, h: 4 };
  const selected = editor.selectedId === block.id;
  const [previewLayout, setPreviewLayout] = useState<BlockGridLayout | null>(null);
  const [previewRotation, setPreviewRotation] = useState<number | null>(null);
  const [previewCrop, setPreviewCrop] = useState<BlockCropInset | null>(null);
  const previewRef = useRef<BlockGridLayout | null>(null);
  const previewCropRef = useRef<BlockCropInset | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const geomLayout = previewLayout ?? layout;
  const effectiveLayout: BlockGridLayout = {
    ...geomLayout,
    rotation: previewRotation ?? layoutRotation(geomLayout),
    crop: previewCrop ?? geomLayout.crop ?? null,
  };
  const displayBlock = { ...block, layout: effectiveLayout };

  const colWidth = gridWidth > 0 ? (gridWidth - GRID_GAP_PX * (cols - 1)) / cols : 1;
  const cellStepX = colWidth + GRID_GAP_PX;
  const cellStepY = rowHeight + GRID_GAP_PX;

  const commitLayout = useCallback(
    (next: BlockGridLayout) => {
      const clamped = clampLayout(next, cols);
      const allBlocks = editor.blocks ?? [];
      if (!canPlaceLayout(clamped, allBlocks, block.id, cols)) return;
      editor.onLayoutChange?.(block.id, clamped);
    },
    [block.id, cols, editor],
  );

  const startDrag = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      editor.onSelect(block.id);
      if (!editor.onLayoutChange) return;

      const start = { ...layout };
      const ox = e.clientX;
      const oy = e.clientY;
      let dragging = false;

      const onMove = (me: PointerEvent) => {
        const px = me.clientX - ox;
        const py = me.clientY - oy;
        if (!dragging) {
          if (Math.hypot(px, py) < 4) return;
          dragging = true;
        }
        const dx = px / zoom;
        const dy = py / zoom;
        const dc = Math.round(dx / cellStepX);
        const dr = Math.round(dy / cellStepY);
        if (dc === 0 && dr === 0) return;
        const next = clampLayout(layoutFromPixelDrag(start, dc, dr, cols), cols);
        previewRef.current = next;
        setPreviewLayout(next);
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        if (previewRef.current) commitLayout(previewRef.current);
        previewRef.current = null;
        setPreviewLayout(null);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [block.id, cellStepX, cellStepY, cols, commitLayout, editor, layout, zoom],
  );

  const startRotate = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (!editor.onLayoutChange) return;

      const rect = shellRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const startRot = layoutRotation(layout);
      const startAngle = angleFromCenter(cx, cy, e.clientX, e.clientY);
      let lastRot = startRot;

      const onMove = (me: PointerEvent) => {
        const currentAngle = angleFromCenter(cx, cy, me.clientX, me.clientY);
        const delta = currentAngle - startAngle;
        lastRot = snapRotation(startRot + delta, me.shiftKey);
        setPreviewRotation(lastRot);
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        commitLayout({ ...layout, rotation: lastRot });
        setPreviewRotation(null);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [commitLayout, editor.onLayoutChange, layout],
  );

  const startResize = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (!editor.onLayoutChange) return;

      const start = { ...layout };
      const ox = e.clientX;
      const oy = e.clientY;

      const onMove = (me: PointerEvent) => {
        const dx = (me.clientX - ox) / zoom;
        const dy = (me.clientY - oy) / zoom;
        const dw = Math.round(dx / cellStepX);
        const dh = Math.round(dy / cellStepY);
        if (dw === 0 && dh === 0) return;
        const next = clampLayout(layoutFromResize(start, dw, dh, cols), cols);
        previewRef.current = next;
        setPreviewLayout(next);
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        if (previewRef.current) commitLayout(previewRef.current);
        previewRef.current = null;
        setPreviewLayout(null);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [cellStepX, cellStepY, cols, commitLayout, editor.onLayoutChange, layout, zoom],
  );

  const startCropEdge = useCallback(
    (edge: CropEdge, e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (!editor.onLayoutChange) return;

      const rect = shellRef.current?.getBoundingClientRect();
      if (!rect) return;

      const startCrop = { ...(layout.crop ?? emptyCrop()) };
      const ox = e.clientX;
      const oy = e.clientY;

      const onMove = (me: PointerEvent) => {
        const dx = (me.clientX - ox) / zoom;
        const dy = (me.clientY - oy) / zoom;
        const next = cropFromEdgeDrag(startCrop, edge, dx, dy, rect.width, rect.height);
        previewCropRef.current = next;
        setPreviewCrop(next);
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        const finalCrop = previewCropRef.current;
        previewCropRef.current = null;
        setPreviewCrop(null);
        if (!finalCrop) return;
        editor.onLayoutChange?.(block.id, {
          ...layout,
          crop: hasCrop(finalCrop) ? finalCrop : null,
        });
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [block.id, editor, layout, zoom],
  );

  const Component = getBlockComponent(block.type);
  const selectionStyle: CSSProperties = selected
    ? { boxShadow: `inset 0 0 0 2px ${FIGMA.accent}`, cursor: editor.onLayoutChange ? "move" : "pointer" }
    : { cursor: "pointer" };

  const inner = !Component ? (
    <div className="rounded border border-dashed p-4 text-sm text-muted-foreground">
      Неизвестный блок: {block.type}
    </div>
  ) : (
    <Component
      block={displayBlock}
      profile={blockProfileProps(profile, { site, profileId: profileId ?? editor.profileId })}
    />
  );

  return (
    <BlockShell
      block={displayBlock}
      rowHeight={rowHeight}
      className={
        isWizardInteractiveBlock(block.type)
          ? "relative flex min-h-0 flex-col overflow-visible"
          : "relative min-h-0 overflow-hidden"
      }
      style={selectionStyle}
      shellRef={shellRef}
      onClick={(e) => {
        e.stopPropagation();
        editor.onSelect(block.id);
      }}
    >
      <div
        className="h-full w-full"
        onPointerDown={startDrag}
        style={{ pointerEvents: editor.onLayoutChange ? "auto" : undefined }}
      >
        <BlockTransformWrap layout={effectiveLayout}>
          <div
            className={
              isWizardInteractiveBlock(block.type)
                ? "flex h-full min-h-0 flex-1 flex-col"
                : editor.onLayoutChange
                  ? "pointer-events-none h-full overflow-hidden"
                  : "h-full overflow-hidden"
            }
          >
            {inner}
          </div>
        </BlockTransformWrap>
      </div>
      {selected && editor.onLayoutChange ? (
        <>
          <div
            className="pointer-events-none absolute left-1/2 top-0 z-30 flex -translate-x-1/2 -translate-y-full flex-col items-center pb-0.5"
            aria-hidden
          >
            <div className="h-3 w-px bg-[#0d99ff]/70" />
          </div>
          <button
            type="button"
            aria-label="Повернуть блок"
            title="Повернуть (Shift — шаг 1°)"
            className="absolute left-1/2 top-0 z-30 flex h-5 w-5 -translate-x-1/2 -translate-y-[calc(100%+14px)] cursor-grab items-center justify-center rounded-full border border-white bg-[#0d99ff] text-[10px] leading-none text-white shadow active:cursor-grabbing"
            onPointerDown={startRotate}
          >
            ↻
          </button>
          <div
            role="presentation"
            title="Обрезка: верх"
            className="pointer-events-auto absolute left-3 right-3 top-0 z-20 h-2.5 -translate-y-1/2 cursor-ns-resize rounded-sm border border-[#0d99ff]/30 bg-[#0d99ff]/50 hover:bg-[#0d99ff]/80"
            onPointerDown={(e) => startCropEdge("top", e)}
          />
          <div
            role="presentation"
            title="Обрезка: низ"
            className="pointer-events-auto absolute bottom-0 left-3 right-3 z-20 h-2.5 translate-y-1/2 cursor-ns-resize rounded-sm border border-[#0d99ff]/30 bg-[#0d99ff]/50 hover:bg-[#0d99ff]/80"
            onPointerDown={(e) => startCropEdge("bottom", e)}
          />
          <div
            role="presentation"
            title="Обрезка: лево"
            className="pointer-events-auto absolute bottom-3 left-0 top-3 z-20 w-2.5 -translate-x-1/2 cursor-ew-resize rounded-sm border border-[#0d99ff]/30 bg-[#0d99ff]/50 hover:bg-[#0d99ff]/80"
            onPointerDown={(e) => startCropEdge("left", e)}
          />
          <div
            role="presentation"
            title="Обрезка: право"
            className="pointer-events-auto absolute bottom-3 right-0 top-3 z-20 w-2.5 translate-x-1/2 cursor-ew-resize rounded-sm border border-[#0d99ff]/30 bg-[#0d99ff]/50 hover:bg-[#0d99ff]/80"
            onPointerDown={(e) => startCropEdge("right", e)}
          />
          <div
            role="presentation"
            title="Размер: правый нижний угол"
            className="absolute bottom-0 right-0 z-20 h-3 w-3 cursor-se-resize rounded-sm border border-white bg-[#0d99ff]"
            onPointerDown={startResize}
          />
        </>
      ) : null}
    </BlockShell>
  );
}

function isWizardInteractiveBlock(type: string): boolean {
  return (
    type === "wizard/card-grid-strela" ||
    type === "wizard/card-grid-simple" ||
    type === "wizard/selection-card"
  );
}

/** CSS Grid — единый рендерер для live, preview и studio (с editor) */
export function GridPageContent({ page, blocks, site, editor }: GridPageContentProps) {
  const profile = useProfile();
  const normalized = ensurePageBlocksLayout(blocks);
  const gridMetrics = pageGridMetrics(page, page.type === "wizard" ? normalized : undefined);
  const { cols, rowHeight, artboardWidth } = gridMetrics;
  const [surfaceEl, setSurfaceEl] = useState<HTMLDivElement | null>(null);
  const [innerWidth, setInnerWidth] = useState(0);

  const { setNodeRef: setDropRef, isOver: isDropOver } = useDroppable({
    id: STUDIO_CANVAS_DROP_ZONE_ID,
    disabled: !editor,
  });

  const setSurfaceRef = useCallback(
    (node: HTMLDivElement | null) => {
      setSurfaceEl(node);
      setDropRef(node);
    },
    [setDropRef],
  );

  useEffect(() => {
    const el = surfaceEl;
    if (!el) return;
    const measure = () => setInnerWidth(el.clientWidth);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [page.id, surfaceEl]);

  const padLeft = page.type === "auth" ? 0 : 16;
  const padTop = page.type === "auth" ? 0 : 16;
  const editorMinHeight = editor ? gridContentHeight(normalized, rowHeight) : undefined;
  const wizardSurface = page.type === "wizard";
  const wizardEditorSurface = Boolean(editor && wizardSurface);
  const wizardExpandedGrid = wizardSurface && cols > (gridMetrics.minCols ?? cols);

  return (
    <div
      ref={setSurfaceRef}
      id={editor ? STUDIO_CANVAS_DROP_ZONE_ID : undefined}
      data-canvas-drop={editor ? true : undefined}
      data-testid={editor ? "grid-canvas" : undefined}
      data-grid-surface
      className={
        wizardEditorSurface || wizardExpandedGrid
          ? "page-grid relative min-h-0 flex-none p-0"
          : pageGridContainerClass(page)
      }
      data-page-id={page.id}
      data-page-profile={page.pageProfile ?? ""}
      style={{
        ...pageGridStyle(cols, rowHeight),
        ...(wizardSurface ? { width: artboardWidth, minWidth: artboardWidth } : { width: "100%" }),
        ...(editorMinHeight ? { minHeight: editorMinHeight } : {}),
        ...(editor ? gridBackgroundStyle(cols, rowHeight, innerWidth, padLeft, padTop) : {}),
        ...(editor && isDropOver
          ? { outline: `2px dashed ${FIGMA.accent}`, outlineOffset: -2 }
          : {}),
      }}
      onMouseDown={
        editor
          ? (e) => {
              if (e.target === e.currentTarget) editor.onSelect(null);
            }
          : undefined
      }
    >
      {normalized.map((block) => {
        if (editor) {
          return (
            <GridEditableBlock
              key={block.id}
              block={block}
              rowHeight={rowHeight}
              cols={cols}
              gridWidth={innerWidth}
              editor={{ ...editor, blocks: normalized, profileId: editor.profileId }}
              site={site}
            />
          );
        }

        const Component = getBlockComponent(block.type);
        if (!Component) {
          return (
            <BlockShell key={block.id} block={block} rowHeight={rowHeight}>
              <div className="rounded border border-dashed p-4 text-sm text-muted-foreground">
                Неизвестный блок: {block.type}
              </div>
            </BlockShell>
          );
        }
        return (
          <BlockShell
            key={block.id}
            block={block}
            rowHeight={rowHeight}
            className={
              page.type === "wizard" && isWizardInteractiveBlock(block.type)
                ? "flex min-h-0 flex-col overflow-visible"
                : "min-h-0 overflow-hidden"
            }
          >
            <BlockTransformWrap layout={block.layout ?? { x: 0, y: 0, w: cols, h: 4 }}>
              <Component block={block} profile={blockProfileProps(profile, { site })} />
            </BlockTransformWrap>
          </BlockShell>
        );
      })}
    </div>
  );
}
