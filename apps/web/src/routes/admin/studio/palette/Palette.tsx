import { getBlockSchemas } from "@/routes/admin/studio/properties/blockSchema";
import { useState } from "react";

const CATEGORIES: Record<string, string> = {
  content: "Контент",
  media: "Медиа",
  data: "Данные",
  special: "Специальные",
  layout: "Разметка",
};

export function Palette({
  onAddBlock,
}: {
  onAddBlock: (type: string) => void;
}) {
  const schemas = getBlockSchemas();
  const [filter, setFilter] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const filtered = schemas.filter((s) => {
    if (filter) {
      return s.label.toLowerCase().includes(filter.toLowerCase());
    }
    if (category) return s.category === category;
    return true;
  });

  const categories = [...new Set(schemas.map((s) => s.category))];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Блоки
        </h3>
      </div>

      <input
        type="text"
        placeholder="Поиск..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
      />

      {!filter && (
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={`rounded px-1.5 py-0.5 text-[10px] ${
              category === null
                ? "bg-[#13347f] text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            Все
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded px-1.5 py-0.5 text-[10px] ${
                category === cat
                  ? "bg-[#13347f] text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {CATEGORIES[cat] ?? cat}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-1">
        {filtered.map((s) => (
          <button
            key={s.type}
            type="button"
            onClick={() => onAddBlock(s.type)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100"
          >
            <span className="text-sm">{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="py-2 text-center text-[11px] text-neutral-400">Нет блоков</p>
        )}
      </div>
    </div>
  );
}
