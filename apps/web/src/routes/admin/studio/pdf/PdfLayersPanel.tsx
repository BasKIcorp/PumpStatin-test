import type { PdfBlock } from "../pdf/PdfCanvas";
import { FIGMA } from "../figma/figmaTokens";

const PDF_BLOCK_LABELS: Record<string, string> = {
  header: "Шапка",
  footer: "Подвал",
  text: "Текст",
  image: "Изображение",
  divider: "Разделитель",
  "equipment-table": "Таблица оборудования",
  "spec-sheet": "Характеристики",
  "customer-info": "Клиент",
  signature: "Подпись",
};

const PDF_BLOCK_ICONS: Record<string, string> = {
  header: "📋",
  footer: "📄",
  text: "📝",
  image: "🖼️",
  divider: "➖",
  "equipment-table": "📊",
  "spec-sheet": "📋",
  "customer-info": "👤",
  signature: "✍️",
};

export function PdfLayersPanel({
  blocks,
  selectedId,
  onSelect,
  onDelete,
}: {
  blocks: PdfBlock[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (blocks.length === 0) {
    return <p className="px-1 py-4 text-center text-[11px] text-[#666]">Нет слоёв</p>;
  }

  return (
    <div className="space-y-0.5">
      {[...blocks].reverse().map((block) => {
        const isSelected = selectedId === block.id;
        return (
          <div
            key={block.id}
            onClick={() => onSelect(block.id)}
            className="group flex cursor-pointer items-center gap-1.5 rounded px-2 py-1.5 text-xs"
            style={
              isSelected
                ? { background: FIGMA.accentSoft, color: FIGMA.accent }
                : { color: FIGMA.textMuted }
            }
          >
            <span className="shrink-0 opacity-80">{PDF_BLOCK_ICONS[block.type] ?? "▢"}</span>
            <span className="min-w-0 flex-1 truncate">
              {PDF_BLOCK_LABELS[block.type] ?? block.type}
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

export { PDF_BLOCK_LABELS, PDF_BLOCK_ICONS };
