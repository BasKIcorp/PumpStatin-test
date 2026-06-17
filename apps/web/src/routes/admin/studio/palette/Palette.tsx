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

export function Palette({ onAddBlock }: { onAddBlock: (type: string) => void }) {
  const schemas = getBlockSchemas();
  const [filter, setFilter] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const filtered = schemas.filter((s) => {
    if (filter) return s.label.toLowerCase().includes(filter.toLowerCase());
    if (category) return s.category === category;
    return true;
  });

  const categories = [...new Set(schemas.map((s) => s.category))];

  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData("text/plain", type);
    e.dataTransfer.effectAllowed = "copy";
  };

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
          <div
            key={s.type}
            draggable
            onDragStart={(e) => handleDragStart(e, s.type)}
            onClick={() => onAddBlock(s.type)}
            className="flex w-full cursor-grab items-center gap-2 rounded px-2 py-1.5 text-left text-xs active:cursor-grabbing hover:bg-[#383838]"
            style={{ color: FIGMA.textMuted }}
          >
            <span className="text-sm">{s.icon}</span>
            <span>{s.label}</span>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-2 text-center text-[11px] text-[#666]">Нет блоков</p>
        )}
      </div>
    </div>
  );
}
