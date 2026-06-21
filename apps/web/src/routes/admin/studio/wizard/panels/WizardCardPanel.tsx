import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { FIGMA } from "@/routes/admin/studio/figma/figmaTokens";
import type { CardItem } from "../wizardTypes";

function SortableRow({
  id,
  label,
  icon,
  isSelected,
  onSelect,
  onDelete,
}: {
  id: string;
  label: string;
  icon?: string;
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });
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
      className="group flex cursor-pointer items-center gap-1.5 rounded px-2 py-1.5 text-[11px]"
    >
      <span
        ref={setActivatorNodeRef}
        className="cursor-grab text-[10px] text-[#555] active:cursor-grabbing"
        title="Перетащить"
        onClick={(e) => e.stopPropagation()}
        {...attributes}
        {...listeners}
      >
        ⠿
      </span>
      {icon && <span>{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {onDelete && (
        <button
          type="button"
          title="Удалить"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="shrink-0 rounded px-1 text-[10px] text-red-400 opacity-60 hover:bg-red-900/30 hover:opacity-100"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export function WizardCardPanel({
  cards,
  childSortIds,
  selectedChildId,
  onSelectCard,
  onAddCard,
  onRemoveCard,
}: {
  cards: CardItem[];
  childSortIds: string[];
  selectedChildId: string | null;
  onSelectCard: (cardId: string) => void;
  onAddCard: () => void;
  onRemoveCard: (cardId: string) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-semibold uppercase text-[#666]">Карточки</span>
        <button
          type="button"
          onClick={onAddCard}
          className="rounded px-1.5 py-0.5 text-[10px] text-[#0d99ff] hover:bg-[#0d99ff]/10"
        >
          + Добавить
        </button>
      </div>
      <SortableContext items={childSortIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-0.5">
          {cards.map((card) => (
            <SortableRow
              key={card.id}
              id={`card:${card.id}`}
              label={card.title}
              icon="🃏"
              isSelected={selectedChildId === card.id}
              onSelect={() => onSelectCard(card.id)}
              onDelete={() => onRemoveCard(card.id)}
            />
          ))}
        </div>
      </SortableContext>
    </>
  );
}

export function WizardCardToolbar({
  selectedChildId,
  selectedCard,
  currentCards,
  onAddCard,
  onMoveCard,
  onRemoveCard,
}: {
  selectedChildId: string | null;
  selectedCard: CardItem | undefined;
  currentCards: CardItem[];
  onAddCard: () => void;
  onMoveCard: (cardId: string, direction: -1 | 1) => void;
  onRemoveCard: (cardId: string) => void;
}) {
  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2"
      style={{ borderColor: FIGMA.panelBorder, background: FIGMA.panel }}
    >
      <button
        type="button"
        onClick={onAddCard}
        className="rounded px-2.5 py-1 text-[11px] text-white"
        style={{ background: FIGMA.accent }}
      >
        + Карточка
      </button>
      {selectedChildId && selectedCard && (
        <>
          <button
            type="button"
            title="Выше"
            disabled={currentCards.findIndex((c) => c.id === selectedChildId) <= 0}
            onClick={() => onMoveCard(selectedChildId, -1)}
            className="rounded px-2 py-1 text-[11px] text-[#ccc] hover:bg-[#383838] disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            title="Ниже"
            disabled={
              currentCards.findIndex((c) => c.id === selectedChildId) >= currentCards.length - 1
            }
            onClick={() => onMoveCard(selectedChildId, 1)}
            className="rounded px-2 py-1 text-[11px] text-[#ccc] hover:bg-[#383838] disabled:opacity-30"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => onRemoveCard(selectedChildId)}
            className="rounded px-2 py-1 text-[11px] text-red-400 hover:bg-red-900/30"
          >
            Удалить
          </button>
        </>
      )}
      <span className="text-[10px] text-[#777]">
        {selectedCard
          ? `Редактируется: ${selectedCard.title}`
          : "Кликните карточку на превью или в списке «Слои»"}
      </span>
    </div>
  );
}
