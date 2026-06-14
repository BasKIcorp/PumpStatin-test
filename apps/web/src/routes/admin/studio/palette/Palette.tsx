import { getBlockTypes } from "@/engine/BlockRegistry";
import { useState } from "react";

const BLOCK_LABELS: Record<string, string> = {
  hero: "Hero (заголовок + CTA)",
  "rich-text": "Rich Text (контент)",
  "card-grid": "Card Grid (сетка карточек)",
  wizard: "Визард подбора",
  "product-grid": "Каталог",
  "contact-form": "Форма связи",
  map: "Карта",
  gallery: "Галерея",
  accordion: "Аккордеон",
  tabs: "Табы",
  divider: "Разделитель",
  image: "Изображение",
  video: "Видео",
};

const BLOCK_ICONS: Record<string, string> = {
  hero: "🎯",
  "rich-text": "📝",
  "card-grid": "📊",
  wizard: "⚙️",
  "product-grid": "🏷️",
  "contact-form": "📧",
  map: "🗺️",
  gallery: "🖼️",
  accordion: "📑",
  tabs: "📌",
  divider: "➖",
  image: "🖼️",
  video: "🎬",
};

export function Palette({
  onAddBlock,
}: {
  onAddBlock: (type: string) => void;
}) {
  const types = getBlockTypes();
  const [filter, setFilter] = useState("");

  const filtered = types.filter((t) => {
    if (!filter) return true;
    const label = BLOCK_LABELS[t] ?? t;
    return label.toLowerCase().includes(filter.toLowerCase());
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Блоки
        </h3>
      </div>

      <input
        type="text"
        placeholder="Поиск блоков..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
      />

      <div className="space-y-1">
        {filtered.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onAddBlock(type)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100"
          >
            <span className="text-sm">{BLOCK_ICONS[type] ?? "🧩"}</span>
            <span>{BLOCK_LABELS[type] ?? type}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
