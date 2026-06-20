import { FIGMA } from "../figma/figmaTokens";
import { PREVIEW_VIEWPORTS, type PreviewViewportId } from "./previewViewport";

export function PreviewToolbar({
  title,
  hint,
  viewportId,
  onViewportChange,
  onClose,
}: {
  title: string;
  hint?: string;
  viewportId: PreviewViewportId;
  onViewportChange: (id: PreviewViewportId) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-between gap-3 px-3 py-2"
      style={{ background: FIGMA.panel, borderBottom: `1px solid ${FIGMA.panelBorder}` }}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-[#b3b3b3]">{title}</span>
        {PREVIEW_VIEWPORTS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => onViewportChange(v.id)}
            className="rounded px-2 py-0.5 text-xs"
            style={
              viewportId === v.id
                ? { background: FIGMA.accentSoft, color: FIGMA.accent }
                : { color: FIGMA.textMuted }
            }
          >
            {v.label}
          </button>
        ))}
        {hint ? <span className="text-[10px] text-[#666]">{hint}</span> : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 rounded px-2 py-0.5 text-xs text-red-400 hover:bg-red-900/30"
      >
        ✕ Закрыть
      </button>
    </div>
  );
}
