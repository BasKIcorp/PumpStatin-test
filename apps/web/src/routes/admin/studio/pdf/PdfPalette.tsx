import { useState } from "react";
import { FIGMA } from "../figma/figmaTokens";

export const PDF_BLOCK_TYPES = [
  { type: "header", label: "Шапка", icon: "📋" },
  { type: "footer", label: "Подвал", icon: "📄" },
  { type: "text", label: "Текст", icon: "📝" },
  { type: "image", label: "Изображение", icon: "🖼️" },
  { type: "divider", label: "Разделитель", icon: "➖" },
  { type: "equipment-table", label: "Таблица оборудования", icon: "📊" },
  { type: "spec-sheet", label: "Характеристики", icon: "📋" },
  { type: "customer-info", label: "Информация о клиенте", icon: "👤" },
  { type: "signature", label: "Подпись", icon: "✍️" },
];

export function PdfPalette({ onAddBlock }: { onAddBlock: (type: string) => void }) {
  const [filter, setFilter] = useState("");

  const filtered = PDF_BLOCK_TYPES.filter((b) =>
    filter ? b.label.toLowerCase().includes(filter.toLowerCase()) : true,
  );

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
      <div className="space-y-0.5">
        {filtered.map((b) => (
          <div
            key={b.type}
            draggable
            onDragStart={(e) => handleDragStart(e, b.type)}
            onClick={() => onAddBlock(b.type)}
            className="flex w-full cursor-grab items-center gap-2 rounded px-2 py-1.5 text-left text-xs active:cursor-grabbing hover:bg-[#383838]"
            style={{ color: FIGMA.textMuted }}
          >
            <span>{b.icon}</span>
            <span>{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
