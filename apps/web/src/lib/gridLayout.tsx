import type { BlockConfig, BlockGridLayout, PageConfig } from "@pumpstation/contracts";
import { DEFAULT_GRID_COLS, DEFAULT_ROW_HEIGHT } from "@pumpstation/contracts";
import type { CSSProperties, ReactNode } from "react";

/** Must match gap in pageGridStyle — shared by live and Studio canvas */
export const GRID_GAP_PX = 8;

export const CMS_GRID_MAX_WIDTH_PX = 1152;
export const AUTH_GRID_WIDTH_PX = 1440;

export function pageGridMetrics(page: PageConfig) {
  const cols = page.grid?.cols ?? DEFAULT_GRID_COLS;
  const rowHeight = page.grid?.rowHeight ?? DEFAULT_ROW_HEIGHT;
  const fullBleed = page.type === "auth";
  return {
    cols,
    rowHeight,
    gap: GRID_GAP_PX,
    fullBleed,
    artboardWidth: fullBleed ? AUTH_GRID_WIDTH_PX : CMS_GRID_MAX_WIDTH_PX,
  };
}

export function pageGridContainerClass(page: PageConfig): string {
  return page.type === "auth"
    ? "page-grid w-full min-h-[100dvh] p-0"
    : "page-grid mx-auto w-full max-w-6xl p-4";
}

export function gridContentHeight(blocks: BlockConfig[], rowHeight = DEFAULT_ROW_HEIGHT): number {
  if (blocks.length === 0) return rowHeight * 4;
  const maxRow = blocks.reduce((max, b) => {
    const l = b.layout ?? { x: 0, y: 0, w: 12, h: 4 };
    return Math.max(max, l.y + l.h);
  }, 0);
  return maxRow * rowHeight + Math.max(0, maxRow - 1) * GRID_GAP_PX + rowHeight * 2;
}

export function gridItemPixelRect(
  layout: BlockGridLayout,
  containerWidth: number,
  cols: number,
  rowHeight: number,
  gap = GRID_GAP_PX,
) {
  const colWidth = (containerWidth - gap * (cols - 1)) / cols;
  return {
    x: layout.x * (colWidth + gap),
    y: layout.y * (rowHeight + gap),
    width: layout.w * colWidth + (layout.w - 1) * gap,
    height: layout.h * rowHeight + (layout.h - 1) * gap,
    colWidth,
  };
}

export function pixelRectToLayout(
  x: number,
  y: number,
  width: number,
  height: number,
  containerWidth: number,
  cols: number,
  rowHeight: number,
  gap = GRID_GAP_PX,
): BlockGridLayout {
  const colWidth = (containerWidth - gap * (cols - 1)) / cols;
  const cellStepX = colWidth + gap;
  const cellStepY = rowHeight + gap;
  return clampLayout({
    x: Math.round(x / cellStepX),
    y: Math.round(y / cellStepY),
    w: Math.max(1, Math.round((width + gap) / cellStepX)),
    h: Math.max(1, Math.round((height + gap) / cellStepY)),
  }, cols);
}

export function gridItemStyle(layout: BlockGridLayout, rowHeight = DEFAULT_ROW_HEIGHT): CSSProperties {
  return {
    gridColumn: `${layout.x + 1} / span ${layout.w}`,
    gridRow: `${layout.y + 1} / span ${layout.h}`,
    minHeight: layout.h * rowHeight,
    minWidth: 0,
  };
}

export function pageGridStyle(cols = DEFAULT_GRID_COLS, rowHeight = DEFAULT_ROW_HEIGHT): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    gridAutoRows: `${rowHeight}px`,
    gap: `${GRID_GAP_PX}px`,
    width: "100%",
  };
}

export interface BlockShellProps {
  block: BlockConfig;
  rowHeight?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  onClick?: (e: React.MouseEvent | React.KeyboardEvent) => void;
}

/** Обёртка блока с data-* для E2E и grid positioning на live */
export function BlockShell({
  block,
  rowHeight = DEFAULT_ROW_HEIGHT,
  className,
  style,
  children,
  onClick,
}: BlockShellProps) {
  const layout = block.layout ?? { x: 0, y: 0, w: DEFAULT_GRID_COLS, h: 4 };
  return (
    <div
      data-block-id={block.id}
      data-block-type={block.type}
      data-grid-x={layout.x}
      data-grid-y={layout.y}
      data-grid-w={layout.w}
      data-grid-h={layout.h}
      data-testid={`block-${block.id}`}
      className={className}
      style={{ ...gridItemStyle(layout, rowHeight), ...style }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}

export function clampLayout(
  layout: BlockGridLayout,
  cols = DEFAULT_GRID_COLS,
): BlockGridLayout {
  const w = Math.max(1, Math.min(layout.w, cols));
  const x = Math.max(0, Math.min(layout.x, cols - w));
  const y = Math.max(0, layout.y);
  const h = Math.max(1, layout.h);
  return { x, y, w, h };
}

/** True when two blocks occupy the same grid cells */
export function layoutsCollide(a: BlockGridLayout, b: BlockGridLayout): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export function canPlaceLayout(
  layout: BlockGridLayout,
  blocks: BlockConfig[],
  blockId: string,
  cols = DEFAULT_GRID_COLS,
): boolean {
  const candidate = clampLayout(layout, cols);
  return !blocks.some(
    (b) =>
      b.id !== blockId &&
      b.layout &&
      layoutsCollide(candidate, clampLayout(b.layout, cols)),
  );
}

/** First non-overlapping slot for a new block */
export function findFreeLayout(
  blocks: BlockConfig[],
  w: number,
  h: number,
  cols = DEFAULT_GRID_COLS,
  startY = 0,
): BlockGridLayout {
  const width = Math.max(1, Math.min(w, cols));
  for (let y = startY; y < startY + 200; y++) {
    for (let x = 0; x <= cols - width; x++) {
      const layout = clampLayout({ x, y, w: width, h }, cols);
      if (canPlaceLayout(layout, blocks, "", cols)) return layout;
    }
  }
  return clampLayout({ x: 0, y: startY, w: width, h }, cols);
}

export function nextAvailableY(blocks: BlockConfig[]): number {
  if (blocks.length === 0) return 0;
  return blocks.reduce((max, b) => {
    const l = b.layout ?? { x: 0, y: 0, w: 12, h: 4 };
    return Math.max(max, l.y + l.h);
  }, 0);
}

export function layoutFromPixelDrag(
  start: BlockGridLayout,
  deltaCols: number,
  deltaRows: number,
  cols = DEFAULT_GRID_COLS,
): BlockGridLayout {
  return clampLayout(
    {
      x: start.x + deltaCols,
      y: start.y + deltaRows,
      w: start.w,
      h: start.h,
    },
    cols,
  );
}

export function layoutFromResize(
  start: BlockGridLayout,
  deltaW: number,
  deltaH: number,
  cols = DEFAULT_GRID_COLS,
): BlockGridLayout {
  return clampLayout(
    {
      x: start.x,
      y: start.y,
      w: start.w + deltaW,
      h: start.h + deltaH,
    },
    cols,
  );
}

/** Auth: left column if block center is in first half of grid */
export function authBlockColumn(block: BlockConfig, cols: number): "left" | "right" {
  const layout = block.layout ?? { x: 0, y: 0, w: cols, h: 4 };
  const center = layout.x + layout.w / 2;
  return center < cols / 2 ? "left" : "right";
}

export function sortBlocksByGridY(a: BlockConfig, b: BlockConfig): number {
  const ay = a.layout?.y ?? 0;
  const by = b.layout?.y ?? 0;
  if (ay !== by) return ay - by;
  return (a.layout?.x ?? 0) - (b.layout?.x ?? 0);
}

/** Auth studio: vertical reorder within one column — updates layout.y */
export function reorderAuthColumnByIds(
  blocks: BlockConfig[],
  column: "left" | "right",
  orderedIds: string[],
  cols = DEFAULT_GRID_COLS,
): BlockConfig[] {
  const byId = new Map(blocks.map((b) => [b.id, { ...b }]));
  const colBlocks = orderedIds
    .map((id) => byId.get(id))
    .filter((b): b is BlockConfig => {
      if (!b) return false;
      return authBlockColumn(b, cols) === column;
    });

  let y = 0;
  for (const b of colBlocks) {
    const l = b.layout ?? {
      x: column === "left" ? 0 : Math.floor(cols / 2),
      y: 0,
      w: column === "left" ? Math.floor(cols / 2) : Math.ceil(cols / 2),
      h: 4,
    };
    byId.set(b.id, {
      ...b,
      layout: clampLayout({ ...l, y }, cols),
    });
    y += l.h;
  }

  return blocks.map((b) => byId.get(b.id)!);
}

/** Layers panel reorder — syncs layout.y (auth: within column) */
export function reorderBlocksInLayers(
  blocks: BlockConfig[],
  fromIndex: number,
  toIndex: number,
  pageType: PageConfig["type"] | undefined,
  cols = DEFAULT_GRID_COLS,
): BlockConfig[] {
  const sorted = [...blocks].sort(sortBlocksByGridY);
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= sorted.length ||
    toIndex >= sorted.length
  ) {
    return blocks;
  }

  if (pageType === "auth") {
    const moved = sorted[fromIndex];
    const column = authBlockColumn(moved, cols);
    const colBlocks = sorted.filter((b) => authBlockColumn(b, cols) === column);
    const fromCol = colBlocks.findIndex((b) => b.id === moved.id);
    const target = sorted[toIndex];
    if (authBlockColumn(target, cols) !== column) return blocks;
    const toCol = colBlocks.findIndex((b) => b.id === target.id);
    if (fromCol < 0 || toCol < 0) return blocks;
    const ids = colBlocks.map((b) => b.id);
    const [item] = ids.splice(fromCol, 1);
    ids.splice(toCol, 0, item);
    return reorderAuthColumnByIds(blocks, column, ids, cols);
  }

  const reordered = [...sorted];
  const [item] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, item);

  const byId = new Map(blocks.map((b) => [b.id, { ...b }]));
  const columnGroups = new Map<string, BlockConfig[]>();

  for (const b of reordered) {
    const l = b.layout ?? { x: 0, y: 0, w: 12, h: 4 };
    const key = `${l.x}:${l.w}`;
    if (!columnGroups.has(key)) columnGroups.set(key, []);
    columnGroups.get(key)!.push(b);
  }

  for (const group of columnGroups.values()) {
    let y = 0;
    for (const b of group) {
      const l = b.layout ?? { x: 0, y: 0, w: 12, h: 4 };
      byId.set(b.id, { ...b, layout: clampLayout({ ...l, y }, cols) });
      y += l.h;
    }
  }

  return blocks.map((b) => byId.get(b.id)!);
}
