import { FIGMA } from "./figmaTokens";

export function FloatingZoom({
  zoom,
  onZoomIn,
  onZoomOut,
  onFit,
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}) {
  return (
    <div
      className="absolute bottom-4 right-4 z-20 flex items-center overflow-hidden rounded-md shadow-lg"
      style={{ background: FIGMA.panel, border: `1px solid ${FIGMA.panelBorder}` }}
    >
      <button
        type="button"
        onClick={onZoomOut}
        className="px-2.5 py-1.5 text-sm text-white hover:bg-[#383838]"
        title="Уменьшить"
      >
        −
      </button>
      <button
        type="button"
        onClick={onFit}
        className="min-w-[3.25rem] border-x px-2 py-1.5 text-[11px] text-[#b3b3b3] hover:bg-[#383838]"
        style={{ borderColor: FIGMA.panelBorder }}
        title="Вписать в экран"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        onClick={onZoomIn}
        className="px-2.5 py-1.5 text-sm text-white hover:bg-[#383838]"
        title="Увеличить"
      >
        +
      </button>
    </div>
  );
}
