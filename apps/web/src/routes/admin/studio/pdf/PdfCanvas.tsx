import { useState, useCallback, type ReactNode } from "react";

const A4 = { width: 595, height: 842 }; // pt

const SNAP = 8;

export interface PdfBlock {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  props: Record<string, unknown>;
}

export function PdfCanvas({
  blocks,
  selectedId,
  onSelect,
  onMove,
  onResize,
  children,
}: {
  blocks: PdfBlock[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, w: number, h: number) => void;
  children?: ReactNode;
}) {
  const [zoom, setZoom] = useState(0.7);
  const [mode, setMode] = useState<"auto" | "free">("auto");

  const handleBlockMouseDown = useCallback(
    (e: React.MouseEvent, block: PdfBlock) => {
      if (mode !== "free") return;
      e.stopPropagation();
      onSelect(block.id);
      const startX = e.clientX;
      const startY = e.clientY;
      const origX = block.x;
      const origY = block.y;

      const handleMouseMove = (me: MouseEvent) => {
        const dx = (me.clientX - startX) / zoom;
        const dy = (me.clientY - startY) / zoom;
        const newX = Math.round((origX + dx) / SNAP) * SNAP;
        const newY = Math.round((origY + dy) / SNAP) * SNAP;
        onMove(block.id, Math.max(0, newX), Math.max(0, newY));
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [mode, zoom, onSelect, onMove],
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, block: PdfBlock) => {
      if (mode !== "free") return;
      e.stopPropagation();
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const origW = block.w;
      const origH = block.h;

      const handleMouseMove = (me: MouseEvent) => {
        const dw = (me.clientX - startX) / zoom;
        const dh = (me.clientY - startY) / zoom;
        const newW = Math.round(Math.max(40, origW + dw) / SNAP) * SNAP;
        const newH = Math.round(Math.max(20, origH + dh) / SNAP) * SNAP;
        onResize(block.id, newW, newH);
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [mode, zoom, onSelect, onResize],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border bg-neutral-200">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b bg-white px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-neutral-500">PDF</span>
          <span className="text-xs text-neutral-400">|</span>
          <button
            type="button"
            onClick={() => setMode("auto")}
            className={`rounded px-2 py-0.5 text-xs ${mode === "auto" ? "bg-[#13347f] text-white" : "bg-neutral-100 text-neutral-600"}`}
          >
            Auto-flow
          </button>
          <button
            type="button"
            onClick={() => setMode("free")}
            className={`rounded px-2 py-0.5 text-xs ${mode === "free" ? "bg-[#13347f] text-white" : "bg-neutral-100 text-neutral-600"}`}
          >
            Free-form
          </button>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-neutral-500">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))} className="rounded px-1.5 text-xs hover:bg-neutral-100">−</button>
          <button type="button" onClick={() => setZoom(0.7)} className="rounded px-1.5 text-xs hover:bg-neutral-100">⊞</button>
          <button type="button" onClick={() => setZoom((z) => Math.min(2, z + 0.1))} className="rounded px-1.5 text-xs hover:bg-neutral-100">+</button>
        </div>
      </div>

      {/* Canvas */}
      <div
        className="relative flex-1 overflow-auto"
        onClick={() => onSelect(null)}
      >
        <div
          className="absolute left-1/2 top-8 overflow-hidden rounded-lg bg-white shadow-xl"
          style={{
            width: A4.width,
            height: A4.height,
            transform: `translateX(-50%) scale(${zoom})`,
            transformOrigin: "top center",
          }}
        >
          {/* Grid overlay */}
          <svg className="pointer-events-none absolute inset-0" width={A4.width} height={A4.height}>
            {mode === "free" && Array.from({ length: Math.ceil(A4.width / SNAP) }).map((_, i) => (
              <line key={`v${i}`} x1={i * SNAP} y1={0} x2={i * SNAP} y2={A4.height} stroke="#f0f0f0" strokeWidth={0.5} />
            ))}
            {mode === "free" && Array.from({ length: Math.ceil(A4.height / SNAP) }).map((_, i) => (
              <line key={`h${i}`} x1={0} y1={i * SNAP} x2={A4.width} y2={i * SNAP} stroke="#f0f0f0" strokeWidth={0.5} />
            ))}
          </svg>

          {/* Blocks */}
          {blocks.map((block) => {
            const isSelected = selectedId === block.id;
            const style: React.CSSProperties = mode === "free"
              ? { position: "absolute", left: block.x, top: block.y, width: block.w, minHeight: block.h }
              : { width: "100%" };

            return (
              <div
                key={block.id}
                className={`relative cursor-pointer border text-xs ${
                  isSelected
                    ? "border-blue-500 bg-blue-50 shadow-md"
                    : "border-transparent hover:border-blue-300"
                }`}
                style={style}
                onMouseDown={(e) => handleBlockMouseDown(e, block)}
              >
                {/* Block type label */}
                <div
                  className={`absolute -top-5 left-0 z-10 rounded-t bg-neutral-700 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity ${isSelected ? "opacity-100" : ""}`}
                >
                  {block.type}
                </div>

                {/* Block preview content */}
                <PdfBlockPreview block={block} />

                {/* Resize handle (free-form only) */}
                {isSelected && mode === "free" && (
                  <div
                    className="absolute bottom-0 right-0 z-10 h-3 w-3 cursor-se-resize bg-blue-500"
                    onMouseDown={(e) => handleResizeMouseDown(e, block)}
                  />
                )}
              </div>
            );
          })}

          {/* Children (e.g. drop zone) */}
          {children}
        </div>
      </div>
    </div>
  );
}

function PdfBlockPreview({ block }: { block: PdfBlock }) {
  switch (block.type) {
    case "header":
      return (
        <div className="flex items-center gap-3 border-b bg-neutral-50 p-3">
          <div className="h-8 w-20 rounded bg-neutral-300" />
          <div>
            <div className="text-xs font-bold text-neutral-700">{block.props.title as string ?? "Заголовок"}</div>
            <div className="text-[10px] text-neutral-500">{block.props.subtitle as string ?? "Подзаголовок"}</div>
          </div>
        </div>
      );
    case "footer":
      return (
        <div className="border-t bg-neutral-50 p-2 text-center text-[9px] text-neutral-500">
          {block.props.text as string ?? "Подвал документа"}
        </div>
      );
    case "text":
      return (
        <div className="p-3 text-[10px] leading-relaxed text-neutral-700">
          {block.props.content as string ?? "Текстовый блок"}
        </div>
      );
    case "image":
      return (
        <div className="flex items-center justify-center bg-neutral-100 p-3">
          <div className="text-center text-[10px] text-neutral-400">
            🖼️ {block.props.caption as string ?? "Изображение"}
          </div>
        </div>
      );
    case "divider":
      return <hr className="my-2 border-neutral-300" />;
    case "equipment-table":
      return (
        <div className="p-2">
          <div className="mb-1 text-[9px] font-bold text-neutral-600">Таблица оборудования</div>
          <div className="grid grid-cols-4 gap-px bg-neutral-300 text-[8px]">
            <div className="bg-neutral-100 p-1 font-medium">Модель</div>
            <div className="bg-neutral-100 p-1 font-medium">Q, м³/ч</div>
            <div className="bg-neutral-100 p-1 font-medium">H, м</div>
            <div className="bg-neutral-100 p-1 font-medium">N, кВт</div>
            {[1, 2, 3].map((i) => (
              <>
                <div key={`m${i}`} className="bg-white p-1">BPS-W {i}</div>
                <div key={`q${i}`} className="bg-white p-1">{15 + i * 10}</div>
                <div key={`h${i}`} className="bg-white p-1">{30 + i * 5}</div>
                <div key={`n${i}`} className="bg-white p-1">{(2.2 + i * 0.5).toFixed(1)}</div>
              </>
            ))}
          </div>
        </div>
      );
    case "spec-sheet":
      return (
        <div className="p-2 text-[9px]">
          <div className="mb-1 font-bold text-neutral-600">Характеристики</div>
          {["Макс. расход", "Напор", "Мощность", "Напряжение"].map((spec) => (
            <div key={spec} className="flex justify-between border-b py-0.5">
              <span className="text-neutral-500">{spec}</span>
              <span>—</span>
            </div>
          ))}
        </div>
      );
    case "customer-info":
      return (
        <div className="p-2 text-[9px]">
          <div className="font-medium text-neutral-700">{block.props.organization as string ?? "Организация"}</div>
          <div className="text-neutral-500">{block.props.date as string ?? "Дата"}</div>
        </div>
      );
    case "signature":
      return (
        <div className="border-t pt-6 text-center text-[9px] text-neutral-400">
          ___________ / {block.props.name as string ?? "Подпись"} /
        </div>
      );
    default:
      return <div className="p-2 text-[9px] text-neutral-400">{block.type}</div>;
  }
}
