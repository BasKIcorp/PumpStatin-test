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
import type { PdfBlock } from "./PdfCanvas";
import { FIGMA } from "../figma/figmaTokens";

export const PDF_BLOCK_LABELS: Record<string, string> = {
  header: "Шапка",
  footer: "Подвал",
  text: "Текст",
  image: "Изображение",
  divider: "Разделитель",
  "equipment-table": "Таблица оборудования",
  "spec-sheet": "Характеристики",
  "customer-info": "Клиент",
  signature: "Подпись",
  "bom-table": "Спецификация (BOM)",
  "dn-info": "DN / диаметр",
  "curves-chart": "График Q-H",
};

export const PDF_BLOCK_ICONS: Record<string, string> = {
  header: "📋",
  footer: "📄",
  text: "📝",
  image: "🖼️",
  divider: "➖",
  "equipment-table": "📊",
  "spec-sheet": "📋",
  "customer-info": "👤",
  signature: "✍️",
  "bom-table": "📦",
  "dn-info": "🔵",
  "curves-chart": "📈",
};

function SortablePdfLayerRow({
  block,
  isSelected,
  onSelect,
  onDelete,
}: {
  block: PdfBlock;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

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
      className="group flex cursor-grab items-center gap-1.5 rounded px-2 py-1.5 text-xs active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <span className="shrink-0 text-[10px] text-[#555]">⠿</span>
      <span className="shrink-0 opacity-80">{PDF_BLOCK_ICONS[block.type] ?? "▢"}</span>
      <span className="min-w-0 flex-1 truncate">{PDF_BLOCK_LABELS[block.type] ?? block.type}</span>
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

export function PdfLayersPanel({
  blocks,
  selectedId,
  onSelect,
  onReorder,
  onDelete,
}: {
  blocks: PdfBlock[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onDelete: (id: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const displayBlocks = useMemo(() => [...blocks].reverse(), [blocks]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const fromDisplay = displayBlocks.findIndex((b) => b.id === active.id);
    const toDisplay = displayBlocks.findIndex((b) => b.id === over.id);
    if (fromDisplay < 0 || toDisplay < 0) return;

    const from = blocks.length - 1 - fromDisplay;
    const to = blocks.length - 1 - toDisplay;
    onReorder(from, to);
  };

  if (blocks.length === 0) {
    return <p className="px-1 py-4 text-center text-[11px] text-[#666]">Нет слоёв</p>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={displayBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-0.5">
          {displayBlocks.map((block) => (
            <SortablePdfLayerRow
              key={block.id}
              block={block}
              isSelected={selectedId === block.id}
              onSelect={() => onSelect(block.id)}
              onDelete={() => onDelete(block.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
