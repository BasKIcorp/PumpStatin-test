import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { BlockConfig, BlockGridLayout, PageConfig, SiteConfig } from "@pumpstation/contracts";
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
  layoutFromPixelDrag,
  layoutFromResize,
  pageGridContainerClass,
  pageGridMetrics,
  pageGridStyle,
} from "@/lib/gridLayout";
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
  const previewRef = useRef<BlockGridLayout | null>(null);
  const effectiveLayout = previewLayout ?? layout;
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
        isWizardCardGridBlock(block.type)
          ? "relative flex min-h-0 flex-col overflow-visible"
          : "relative min-h-0 overflow-hidden"
      }
      style={selectionStyle}
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
        <div
          className={
            isWizardCardGridBlock(block.type)
              ? "flex h-full min-h-0 flex-1 flex-col"
              : editor.onLayoutChange
                ? "pointer-events-none h-full overflow-hidden"
                : "h-full overflow-hidden"
          }
        >
          {inner}
        </div>
      </div>
      {selected && editor.onLayoutChange ? (
        <div
          role="presentation"
          className="absolute bottom-0 right-0 z-20 h-3 w-3 cursor-se-resize rounded-sm border border-white bg-[#0d99ff]"
          onPointerDown={startResize}
        />
      ) : null}
    </BlockShell>
  );
}

function isWizardCardGridBlock(type: string): boolean {
  return type === "wizard/card-grid-strela" || type === "wizard/card-grid-simple";
}

/** CSS Grid — единый рендерер для live, preview и studio (с editor) */
export function GridPageContent({ page, blocks, site, editor }: GridPageContentProps) {
  const profile = useProfile();
  const { cols, rowHeight } = pageGridMetrics(page);
  const normalized = ensurePageBlocksLayout(blocks);
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

  return (
    <div
      ref={setSurfaceRef}
      id={editor ? STUDIO_CANVAS_DROP_ZONE_ID : undefined}
      data-canvas-drop={editor ? true : undefined}
      data-testid={editor ? "grid-canvas" : undefined}
      data-grid-surface
      className={pageGridContainerClass(page)}
      data-page-id={page.id}
      data-page-profile={page.pageProfile ?? ""}
      style={{
        ...pageGridStyle(cols, rowHeight),
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
              page.type === "wizard" && isWizardCardGridBlock(block.type)
                ? "flex min-h-0 flex-col overflow-visible"
                : "min-h-0 overflow-hidden"
            }
          >
            <Component block={block} profile={blockProfileProps(profile, { site })} />
          </BlockShell>
        );
      })}
    </div>
  );
}
