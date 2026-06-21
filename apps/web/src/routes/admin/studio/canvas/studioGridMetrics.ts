import type { BlockConfig, PageConfig } from "@pumpstation/contracts";
import { gridContentHeight, pageGridMetrics } from "@/lib/gridLayout";

/** Shared artboard min-height for CMS and wizard grid editors */
export function studioArtboardMinHeight(
  page: PageConfig,
  blocks: BlockConfig[],
  options?: { strelaFunnel?: boolean; usesFrames?: boolean },
): number {
  const gridMetrics = pageGridMetrics(page, blocks);
  if (page.type === "auth") return 900;
  if (page.type === "cabinet") return 700;

  const base =
    options?.usesFrames === false
      ? 700
      : Math.max(700, gridContentHeight(blocks, gridMetrics.rowHeight));

  if (options?.strelaFunnel) return Math.max(820, base);
  return base;
}

export { pageGridMetrics, gridContentHeight };
