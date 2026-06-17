import type { BlockConfig } from "@pumpstation/contracts";
import { BLOCK_ICONS, BLOCK_LABELS } from "@/routes/admin/studio/properties/blockSchema";
import { FIGMA } from "../figma/figmaTokens";

export function LayersPanel({
  blocks,
  selectedId,
  onSelect,
  onReorder,
  onDelete,
}: {
  blocks: BlockConfig[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onDelete: (id: string) => void;
}) {
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("application/x-layer-index", String(index));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("application/x-layer-index")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const from = Number(e.dataTransfer.getData("application/x-layer-index"));
    if (Number.isNaN(from) || from === toIndex) return;
    onReorder(from, toIndex);
  };

  if (blocks.length === 0) {
    return <p className="px-1 py-4 text-center text-[11px] text-[#666]">Нет слоёв</p>;
  }

  return (
    <div className="space-y-0.5">
      {[...blocks].reverse().map((block, revIndex) => {
        const index = blocks.length - 1 - revIndex;
        const isSelected = selectedId === block.id;
        return (
          <div
            key={block.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            onClick={() => onSelect(block.id)}
            className="group flex cursor-grab items-center gap-1.5 rounded px-2 py-1.5 text-xs active:cursor-grabbing"
            style={
              isSelected
                ? { background: FIGMA.accentSoft, color: FIGMA.accent }
                : { color: FIGMA.textMuted }
            }
          >
            <span className="shrink-0 text-[10px] text-[#555]">⠿</span>
            <span className="shrink-0 opacity-80">{BLOCK_ICONS[block.type] ?? "▢"}</span>
            <span className="min-w-0 flex-1 truncate">
              {BLOCK_LABELS[block.type] ?? block.type}
            </span>
            <button
              type="button"
              title="Удалить"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(block.id);
              }}
              className="invisible shrink-0 rounded px-1 text-[10px] text-red-400 group-hover:visible hover:bg-red-900/30"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
