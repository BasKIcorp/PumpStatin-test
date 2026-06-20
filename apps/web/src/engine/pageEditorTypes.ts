import type { BlockGridLayout } from "@pumpstation/contracts";

export interface PageEditorOptions {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onLayoutChange?: (id: string, layout: BlockGridLayout) => void;
  profileId?: string;
  /** All blocks — for collision checks during drag */
  blocks?: import("@pumpstation/contracts").BlockConfig[];
}
