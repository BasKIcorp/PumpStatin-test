import { useCallback, useRef, useState } from "react";
import { FloatingZoom } from "../figma/FloatingZoom";
import { FIGMA } from "../figma/figmaTokens";
import { useCanvasNavigation } from "../figma/useCanvasNavigation";

const A4 = { width: 595, height: 842 };
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
  onMove: onMoveBlock,
  onResize,
  onDropBlock,
  mode,
}: {
  blocks: PdfBlock[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, w: number, h: number) => void;
  onDropBlock?: (type: string) => void;
  mode: "auto" | "free";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const { zoom, pan, handActive, startPan, handleWheel, zoomIn, zoomOut, resetView, spaceHeld } =
    useCanvasNavigation(0.7);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const onBg =
        e.target === containerRef.current ||
        (e.target as HTMLElement).closest("[data-canvas-bg]");
      if (spaceHeld || e.button === 1) {
        e.preventDefault();
        startPan(e.clientX, e.clientY);
        return;
      }
      if (onBg && e.button === 0) onSelect(null);
    },
    [onSelect, spaceHeld, startPan],
  );

  const handleBlockMouseDown = useCallback(
    (e: React.MouseEvent, block: PdfBlock) => {
      if (mode !== "free" || spaceHeld) return;
      e.stopPropagation();
      onSelect(block.id);
      const startX = e.clientX;
      const startY = e.clientY;
      const origX = block.x;
      const origY = block.y;

      const handleMouseMove = (me: MouseEvent) => {
        const dx = (me.clientX - startX) / zoom;
        const dy = (me.clientY - startY) / zoom;
        onMoveBlock(
          block.id,
          Math.max(0, Math.round((origX + dx) / SNAP) * SNAP),
          Math.max(0, Math.round((origY + dy) / SNAP) * SNAP),
        );
      };
      const onUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", onUp);
    },
    [mode, zoom, onSelect, onMoveBlock, spaceHeld],
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

      const onMove = (me: MouseEvent) => {
        const dw = (me.clientX - startX) / zoom;
        const dh = (me.clientY - startY) / zoom;
        onResize(
          block.id,
          Math.round(Math.max(40, origW + dw) / SNAP) * SNAP,
          Math.round(Math.max(20, origH + dh) / SNAP) * SNAP,
        );
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [mode, zoom, onResize],
  );

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className="flex shrink-0 items-center gap-2 px-3 py-1.5"
        style={{ background: FIGMA.panel, borderBottom: `1px solid ${FIGMA.panelBorder}` }}
      >
        <span className="text-[11px] text-[#888]">Режим:</span>
        <span className="text-[11px] text-[#b3b3b3]">
          {mode === "auto" ? "Поток (сверху вниз)" : "Свободное размещение"}
        </span>
      </div>

      <div
        ref={containerRef}
        className={`relative flex-1 overflow-hidden ${handActive ? "cursor-grab active:cursor-grabbing" : ""}`}
        style={{
          backgroundColor: FIGMA.appBg,
          backgroundImage: `radial-gradient(circle, ${FIGMA.canvasDot} 1px, transparent 1px)`,
          backgroundSize: `${16 / zoom}px ${16 / zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("text/plain")) {
            e.preventDefault();
            setIsDragOver(true);
          }
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const type = e.dataTransfer.getData("text/plain");
          if (type && onDropBlock) onDropBlock(type);
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div
          className="absolute left-1/2 top-0"
          style={{
            transform: `translate(calc(-50% + ${pan.x}px), ${48 + pan.y}px) scale(${zoom})`,
            transformOrigin: "top center",
          }}
        >
          <div className="mb-1.5 flex items-center gap-2 pl-0.5">
            <span className="text-[11px] font-medium text-[#b3b3b3]">A4</span>
            <span className="font-mono text-[10px] text-[#666]">595 × 842 pt</span>
          </div>
          <div
            data-canvas-bg
            className="relative overflow-hidden bg-white"
            style={{
              width: A4.width,
              height: A4.height,
              boxShadow: FIGMA.artboardShadow,
              outline: isDragOver ? `2px solid ${FIGMA.accent}` : undefined,
            }}
          >
            {mode === "free" && (
              <svg className="pointer-events-none absolute inset-0" width={A4.width} height={A4.height}>
                {Array.from({ length: Math.ceil(A4.width / SNAP) }).map((_, i) => (
                  <line
                    key={`v${i}`}
                    x1={i * SNAP}
                    y1={0}
                    x2={i * SNAP}
                    y2={A4.height}
                    stroke="#f0f0f0"
                    strokeWidth={0.5}
                  />
                ))}
                {Array.from({ length: Math.ceil(A4.height / SNAP) }).map((_, i) => (
                  <line
                    key={`h${i}`}
                    x1={0}
                    y1={i * SNAP}
                    x2={A4.width}
                    y2={i * SNAP}
                    stroke="#f0f0f0"
                    strokeWidth={0.5}
                  />
                ))}
              </svg>
            )}

            {blocks.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-neutral-400">
                <span>Перетащите PDF-блок слева</span>
                <span className="text-xs">или кликните по типу</span>
              </div>
            )}

            {blocks.map((block) => {
              const isSelected = selectedId === block.id;
              const style: React.CSSProperties =
                mode === "free"
                  ? { position: "absolute", left: block.x, top: block.y, width: block.w, minHeight: block.h }
                  : { width: "100%" };

              return (
                <div
                  key={block.id}
                  className="relative"
                  style={style}
                  onMouseDown={(e) => handleBlockMouseDown(e, block)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(block.id);
                  }}
                >
                  {isSelected && (
                    <div
                      className="pointer-events-none absolute inset-0 z-10"
                      style={{ boxShadow: `inset 0 0 0 2px ${FIGMA.accent}` }}
                    />
                  )}
                  <PdfBlockPreview block={block} />
                  {isSelected && mode === "free" && (
                    <div
                      className="absolute bottom-0 right-0 z-20 h-2.5 w-2.5 cursor-se-resize border border-[#0d99ff] bg-white"
                      onMouseDown={(e) => handleResizeMouseDown(e, block)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <FloatingZoom zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onFit={resetView} />
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
            <div className="text-xs font-bold text-neutral-700">
              {(block.props.title as string) ?? "Заголовок"}
            </div>
            <div className="text-[10px] text-neutral-500">
              {(block.props.subtitle as string) ?? "Подзаголовок"}
            </div>
          </div>
        </div>
      );
    case "footer":
      return (
        <div className="border-t bg-neutral-50 p-2 text-center text-[9px] text-neutral-500">
          {(block.props.text as string) ?? "Подвал документа"}
        </div>
      );
    case "text":
      return (
        <div className="p-3 text-[10px] leading-relaxed text-neutral-700">
          {(block.props.content as string) ?? "Текстовый блок"}
        </div>
      );
    case "image":
      return (
        <div className="flex items-center justify-center bg-neutral-100 p-3">
          <div className="text-center text-[10px] text-neutral-400">
            🖼️ {(block.props.caption as string) ?? "Изображение"}
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
            {["Модель", "Q, м³/ч", "H, м", "N, кВт"].map((h) => (
              <div key={h} className="bg-neutral-100 p-1 font-medium">
                {h}
              </div>
            ))}
            {[1, 2, 3].map((i) => (
              <div key={i} className="contents">
                <div className="bg-white p-1">BPS-W {i}</div>
                <div className="bg-white p-1">{15 + i * 10}</div>
                <div className="bg-white p-1">{30 + i * 5}</div>
                <div className="bg-white p-1">{(2.2 + i * 0.5).toFixed(1)}</div>
              </div>
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
          <div className="font-medium text-neutral-700">
            {(block.props.organization as string) ?? "Организация"}
          </div>
          <div className="text-neutral-500">{(block.props.date as string) ?? "Дата"}</div>
        </div>
      );
    case "signature":
      return (
        <div className="border-t pt-6 text-center text-[9px] text-neutral-400">
          ___________ / {(block.props.name as string) ?? "Подпись"} /
        </div>
      );
    default:
      return <div className="p-2 text-[9px] text-neutral-400">{block.type}</div>;
  }
}
