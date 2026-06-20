import { FIGMA } from "../figma/figmaTokens";

export function UndoRedoButtons({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        title="Отменить (Ctrl+Z)"
        disabled={!canUndo}
        onClick={onUndo}
        className="rounded px-2 py-0.5 text-xs disabled:opacity-30"
        style={{ color: FIGMA.textMuted }}
      >
        ↶
      </button>
      <button
        type="button"
        title="Повторить (Ctrl+Y)"
        disabled={!canRedo}
        onClick={onRedo}
        className="rounded px-2 py-0.5 text-xs disabled:opacity-30"
        style={{ color: FIGMA.textMuted }}
      >
        ↷
      </button>
    </div>
  );
}
