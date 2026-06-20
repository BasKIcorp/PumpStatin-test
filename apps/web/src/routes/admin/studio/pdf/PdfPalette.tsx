import { useDraggable } from "@dnd-kit/core";
import { useState } from "react";
import { FIGMA } from "../figma/figmaTokens";

export const PDF_BLOCK_TYPES = [
  { type: "header", label: "Шапка", icon: "📋" },
  { type: "footer", label: "Подвал", icon: "📄" },
  { type: "text", label: "Текст", icon: "📝" },
  { type: "image", label: "Изображение", icon: "🖼️" },
  { type: "divider", label: "Разделитель", icon: "➖" },
  { type: "dn-info", label: "DN / диаметр", icon: "🔵" },
  { type: "equipment-table", label: "Таблица оборудования", icon: "📊" },
  { type: "bom-table", label: "Спецификация (BOM)", icon: "📦" },
  { type: "curves-chart", label: "График Q-H", icon: "📈" },
  { type: "spec-sheet", label: "Характеристики", icon: "📋" },
  { type: "customer-info", label: "Информация о клиенте", icon: "👤" },
  { type: "signature", label: "Подпись", icon: "✍️" },
];

function DraggablePdfBlock({
  type,
  label,
  icon,
  onAdd,
}: {
  type: string;
  label: string;
  icon: string;
  onAdd: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `pdf-palette-${type}`,
    data: { blockType: type, source: "palette" },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.5 : 1 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onAdd}
      className="flex w-full cursor-grab items-center gap-2 rounded px-2 py-1.5 text-left text-xs active:cursor-grabbing hover:bg-[#383838]"
      style={{ ...style, color: FIGMA.textMuted }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

export function PdfPalette({ onAddBlock }: { onAddBlock: (type: string) => void }) {
  const [filter, setFilter] = useState("");

  const filtered = PDF_BLOCK_TYPES.filter((b) =>
    filter ? b.label.toLowerCase().includes(filter.toLowerCase()) : true,
  );

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
          <DraggablePdfBlock
            key={b.type}
            type={b.type}
            label={b.label}
            icon={b.icon}
            onAdd={() => onAddBlock(b.type)}
          />
        ))}
      </div>
    </div>
  );
}
