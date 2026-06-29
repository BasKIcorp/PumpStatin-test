import type { BlockConfig } from "@pumpstation/contracts";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo } from "react";
import { BLOCK_ICONS, BLOCK_LABELS } from "@/routes/admin/studio/properties/blockSchema";
import { sortBlocksByGridY } from "@/lib/gridLayout";
import { FIGMA } from "../figma/figmaTokens";

function SortableLayerRow({
  block,
  isSelected,
  onSelect,
  onDelete,
}: {
  block: BlockConfig;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const layout = block.layout;
  const gridHint =
    layout != null ? ` (${layout.x},${layout.y})` : "";

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isSelected ? FIGMA.accentSoft : undefined,
    color: isSelected ? FIGMA.accent : FIGMA.textMuted,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      data-block-id={block.id}
      data-layer-block-type={block.type}
      className="group flex cursor-grab items-center gap-1.5 rounded px-2 py-1.5 text-xs active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <span className="shrink-0 text-[10px] text-[#555]">⠿</span>
      <span className="shrink-0 opacity-80">{BLOCK_ICONS[block.type] ?? "▢"}</span>
      <span className="min-w-0 flex-1 truncate">
        {BLOCK_LABELS[block.type] ?? block.type}
        <span className="text-[9px] opacity-50">{gridHint}</span>
      </span>
      <button
        type="button"
        title="Удалить"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="invisible shrink-0 rounded px-1 text-[10px] text-red-400 group-hover:visible hover:bg-red-900/30"
      >
        ✕
      </button>
    </div>
  );
}

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
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sorted = useMemo(() => [...blocks].sort(sortBlocksByGridY), [blocks]);
  const displayBlocks = useMemo(() => [...sorted].reverse(), [sorted]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const fromSorted = sorted.findIndex((b) => b.id === active.id);
    const toSorted = sorted.findIndex((b) => b.id === over.id);
    if (fromSorted < 0 || toSorted < 0) return;

    onReorder(fromSorted, toSorted);
  };

  if (blocks.length === 0) {
    return <p className="px-1 py-4 text-center text-[11px] text-[#666]">Нет слоёв</p>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={displayBlocks.map((b) => b.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-0.5">
          {displayBlocks.map((block) => (
            <div key={block.id} className="relative">
              <SortableLayerRow
                block={block}
                isSelected={selectedId === block.id}
                onSelect={() => onSelect(block.id)}
                onDelete={() => onDelete(block.id)}
              />
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
