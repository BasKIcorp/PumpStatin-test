import { useDraggable } from "@dnd-kit/core";
import { getBlockSchemas } from "@/routes/admin/studio/properties/blockSchema";
import { useState } from "react";
import { FIGMA } from "../figma/figmaTokens";

const CATEGORIES: Record<string, string> = {
  content: "Контент",
  media: "Медиа",
  data: "Данные",
  special: "Специальные",
  layout: "Разметка",
};

function DraggableBlockItem({
  type,
  icon,
  label,
  onAdd,
}: {
  type: string;
  icon: string;
  label: string;
  onAdd: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { blockType: type, source: "palette" },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.5 : 1 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-[#383838]"
    >
      <span
        {...listeners}
        {...attributes}
        className="cursor-grab text-[10px] text-[#555] active:cursor-grabbing"
        aria-label={`Перетащить ${label}`}
      >
        ⠿
      </span>
      <button
        type="button"
        onClick={onAdd}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span className="text-sm">{icon}</span>
        <span style={{ color: FIGMA.textMuted }}>{label}</span>
      </button>
    </div>
  );
}

export function Palette({
  onAddBlock,
  categoryFilter,
}: {
  onAddBlock: (type: string) => void;
  /** Только блоки этой категории (например wizard) */
  categoryFilter?: string;
}) {
  const schemas = getBlockSchemas().filter((s) =>
    categoryFilter ? s.category === categoryFilter : true,
  );
  const [filter, setFilter] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const filtered = schemas.filter((s) => {
    if (filter) return s.label.toLowerCase().includes(filter.toLowerCase());
    if (category) return s.category === category;
    return true;
  });

  const categories = [...new Set(schemas.map((s) => s.category))];

  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder="Поиск блоков..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full rounded border-0 px-2 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-[#0d99ff]"
        style={{ background: FIGMA.inputBg }}
      />

      {!filter && (
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className="rounded px-1.5 py-0.5 text-[10px]"
            style={
              category === null
                ? { background: FIGMA.accentSoft, color: FIGMA.accent }
                : { color: FIGMA.textDim }
            }
          >
            Все
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className="rounded px-1.5 py-0.5 text-[10px]"
              style={
                category === cat
                  ? { background: FIGMA.accentSoft, color: FIGMA.accent }
                  : { color: FIGMA.textDim }
              }
            >
              {CATEGORIES[cat] ?? cat}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-0.5">
        {filtered.map((s) => (
          <DraggableBlockItem
            key={s.type}
            type={s.type}
            icon={s.icon}
            label={s.label}
            onAdd={() => onAddBlock(s.type)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="py-2 text-center text-[11px] text-[#666]">Нет блоков</p>
        )}
      </div>
    </div>
  );
}
