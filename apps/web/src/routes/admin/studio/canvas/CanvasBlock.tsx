import type { BlockConfig } from "@pumpstation/contracts";
import { BLOCK_REGISTRY } from "@/engine/BlockRegistry";

/**
 * Рендерит блок внутри canvas с возможностью выделения/перетаскивания.
 */
export function CanvasBlock({
  block,
  isSelected,
  onSelect,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onDelete,
}: {
  block: BlockConfig;
  isSelected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onDelete: () => void;
}) {
  const Component = BLOCK_REGISTRY[block.type];

  return (
    <div
      className={`group relative cursor-pointer border-2 transition-shadow ${
        isSelected
          ? "border-blue-500 shadow-lg ring-2 ring-blue-200"
          : "border-transparent hover:border-blue-300 hover:shadow-md"
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Тулинг (появляется при наведении/выделении) */}
      <div
        className={`absolute -top-8 left-0 z-20 flex items-center gap-0.5 rounded-t-md bg-neutral-800 px-1 py-0.5 text-white opacity-0 transition-opacity ${
          isSelected ? "opacity-100" : "group-hover:opacity-100"
        }`}
      >
        <span className="mr-1 text-[10px] text-neutral-400">{block.type}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp();
          }}
          disabled={!canMoveUp}
          className="rounded px-1 text-[11px] hover:bg-neutral-600 disabled:opacity-30"
          title="Переместить вверх"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown();
          }}
          disabled={!canMoveDown}
          className="rounded px-1 text-[11px] hover:bg-neutral-600 disabled:opacity-30"
          title="Переместить вниз"
        >
          ↓
        </button>
        <span className="mx-1 text-neutral-500">|</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="rounded px-1 text-[11px] text-red-400 hover:bg-red-600 hover:text-white"
          title="Удалить блок"
        >
          ✕
        </button>
      </div>

      {/* Рендер блока в режиме preview */}
      <div className={isSelected ? "pointer-events-none" : "pointer-events-none"}>
        {Component ? (
          <Component block={block} profile={{}} />
        ) : (
          <div className="flex items-center justify-center bg-yellow-50 p-4 text-sm text-yellow-700">
            Неизвестный блок: {block.type}
          </div>
        )}
      </div>
    </div>
  );
}
