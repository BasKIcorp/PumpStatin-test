import type { BlockConfig, PageConfig } from "@pumpstation/contracts";
import { DEFAULT_GRID_COLS } from "@pumpstation/contracts";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
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
import type { ReactNode } from "react";
import { authBlockColumn, sortBlocksByGridY } from "@/lib/gridLayout";
import type { PageEditorOptions } from "@/engine/pageEditorTypes";
import { FIGMA } from "@/routes/admin/studio/figma/figmaTokens";

function SortableAuthBlock({
  block,
  editor,
  renderBlock,
  className,
}: {
  block: BlockConfig;
  editor: PageEditorOptions;
  renderBlock: (block: BlockConfig) => ReactNode;
  className?: string;
}) {
  const selected = editor.selectedId === block.id;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    boxShadow: selected ? `inset 0 0 0 2px ${FIGMA.accent}` : undefined,
    cursor: "grab",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={className}
      data-block-id={block.id}
      data-testid={`block-${block.id}`}
      onClick={(e) => {
        e.stopPropagation();
        editor.onSelect(block.id);
      }}
    >
      <div className="flex items-start gap-1">
        <span
          className="mt-1 shrink-0 cursor-grab select-none text-[10px] text-[#bbb] active:cursor-grabbing"
          title="Перетащить"
          {...attributes}
          {...listeners}
        >
          ⠿
        </span>
        <div className="min-w-0 flex-1 pointer-events-none">{renderBlock(block)}</div>
      </div>
    </div>
  );
}

/** Sortable auth column (studio) — drag reorder updates layout.y via onColumnReorder */
export function AuthEditorColumn({
  page,
  blocks,
  column,
  renderBlock,
  editor,
  onColumnReorder,
}: {
  page: PageConfig;
  blocks: BlockConfig[];
  column: "left" | "right";
  renderBlock: (block: BlockConfig) => ReactNode;
  editor: PageEditorOptions;
  onColumnReorder: (column: "left" | "right", orderedIds: string[]) => void;
}) {
  const cols = page.grid?.cols ?? DEFAULT_GRID_COLS;
  const columnBlocks = blocks
    .filter((b) => authBlockColumn(b, cols) === column)
    .sort(sortBlocksByGridY);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = columnBlocks.map((b) => b.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const next = [...ids];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onColumnReorder(column, next);
  };

  if (columnBlocks.length === 0) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={columnBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <div className={column === "left" ? "flex h-full min-h-0 flex-col" : "space-y-0"}>
          {columnBlocks.map((block) => (
            <SortableAuthBlock
              key={block.id}
              block={block}
              editor={editor}
              renderBlock={renderBlock}
              className={
                column === "left" ? "min-h-0 min-w-0 flex-1 overflow-hidden" : "w-full shrink-0"
              }
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
