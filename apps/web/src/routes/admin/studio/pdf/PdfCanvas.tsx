import { useCallback, useRef } from "react";
import { Rnd } from "react-rnd";
import { useDroppable } from "@dnd-kit/core";
import { FloatingZoom } from "../figma/FloatingZoom";
import { FIGMA } from "../figma/figmaTokens";
import { useCanvasNavigation } from "../figma/useCanvasNavigation";

const A4 = { width: 595, height: 842 };
const SNAP = 8;

const snap = (v: number) => Math.max(0, Math.round(v / SNAP) * SNAP);

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
  dropZoneId = "pdf-canvas-drop",
  mode,
}: {
  blocks: PdfBlock[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, w: number, h: number) => void;
  dropZoneId?: string;
  mode: "auto" | "free";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { setNodeRef: setDropRef, isOver: dndOver } = useDroppable({
    id: dropZoneId,
  });
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

  const freeMode = mode === "free" && !spaceHeld;

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className="flex shrink-0 items-center gap-2 px-3 py-1.5"
        style={{ background: FIGMA.panel, borderBottom: `1px solid ${FIGMA.panelBorder}` }}
      >
        <span className="text-[11px] text-[#888]">Режим:</span>
        <span className="text-[11px] text-[#b3b3b3]">
          {mode === "auto"
            ? "Поток (сверху вниз) — порядок слоёв = порядок в PDF"
            : "Свободное размещение — drag/resize на холсте; в PDF порядок по Y"}
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
            ref={setDropRef}
            data-canvas-bg
            className="relative overflow-hidden bg-white"
            style={{
              width: A4.width,
              height: A4.height,
              boxShadow: FIGMA.artboardShadow,
              outline: dndOver ? `2px solid ${FIGMA.accent}` : undefined,
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

              if (!freeMode) {
                return (
                  <div
                    key={block.id}
                    className="relative w-full"
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
                  </div>
                );
              }

              return (
                <Rnd
                  key={block.id}
                  size={{ width: block.w, height: block.h }}
                  position={{ x: block.x, y: block.y }}
                  bounds="parent"
                  dragGrid={[SNAP, SNAP]}
                  resizeGrid={[SNAP, SNAP]}
                  disableDragging={!freeMode}
                  enableResizing={freeMode}
                  onDragStart={(e) => {
                    e.stopPropagation();
                    onSelect(block.id);
                  }}
                  onResizeStart={(e) => {
                    e.stopPropagation();
                    onSelect(block.id);
                  }}
                  onDragStop={(_e, d) => {
                    onMoveBlock(block.id, snap(d.x), snap(d.y));
                  }}
                  onResizeStop={(_e, _dir, ref, _delta, position) => {
                    onMoveBlock(block.id, snap(position.x), snap(position.y));
                    onResize(
                      block.id,
                      snap(parseInt(ref.style.width, 10)),
                      snap(parseInt(ref.style.height, 10)),
                    );
                  }}
                  style={{ zIndex: isSelected ? 20 : 1 }}
                >
                  <div className="relative h-full w-full">
                    {isSelected && (
                      <div
                        className="pointer-events-none absolute inset-0 z-10"
                        style={{ boxShadow: `inset 0 0 0 2px ${FIGMA.accent}` }}
                      />
                    )}
                    <PdfBlockPreview block={block} />
                  </div>
                </Rnd>
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
        <div className="flex h-full items-center gap-3 border-b bg-neutral-50 p-3">
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
        <div className="flex h-full items-center justify-center border-t bg-neutral-50 p-2 text-center text-[9px] text-neutral-500">
          {(block.props.text as string) ?? "Подвал документа"}
        </div>
      );
    case "text":
      return (
        <div className="h-full p-3 text-[10px] leading-relaxed text-neutral-700">
          {(block.props.content as string) ?? "Текстовый блок"}
        </div>
      );
    case "bom-table":
      return (
        <div className="h-full p-2 text-[9px]">
          <div className="mb-1 font-bold text-neutral-600">Спецификация (BOM)</div>
          <div className="text-neutral-500">{"{{bom.items}}"}</div>
        </div>
      );
    case "dn-info":
      return (
        <div className="h-full p-2 text-[9px]">
          <div className="font-medium text-neutral-700">DN: {"{{station.DN}}"}</div>
        </div>
      );
    case "curves-chart":
      return (
        <div className="flex h-full items-center justify-center bg-neutral-50 text-[9px] text-neutral-400">
          График Q-H {"{{curves.qh}}"}
        </div>
      );
    case "image":
      return (
        <div className="flex h-full items-center justify-center bg-neutral-100 p-3">
          <div className="text-center text-[10px] text-neutral-400">
            🖼️ {(block.props.caption as string) ?? "Изображение"}
          </div>
        </div>
      );
    case "divider":
      return <hr className="my-2 border-neutral-300" />;
    case "equipment-table":
      return (
        <div className="h-full p-2">
          <div className="mb-1 text-[9px] font-bold text-neutral-600">Таблица оборудования</div>
          <div className="grid grid-cols-4 gap-px bg-neutral-300 text-[8px]">
            {["Модель", "Q, м³/ч", "H, м", "N, кВт"].map((h) => (
              <div key={h} className="bg-neutral-100 p-1 font-medium">
                {h}
              </div>
            ))}
            {[1, 2, 3].map((i) => (
              <div key={i} className="contents">
                <div className="bg-white p-1">{"{{pump.name}}"}</div>
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
        <div className="h-full p-2 text-[9px]">
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
        <div className="h-full p-2 text-[9px]">
          <div className="font-medium text-neutral-700">
            {(block.props.organization as string) ?? "Организация"}
          </div>
          <div className="text-neutral-500">{(block.props.date as string) ?? "Дата"}</div>
        </div>
      );
    case "signature":
      return (
        <div className="flex h-full items-end justify-center border-t pt-6 text-center text-[9px] text-neutral-400">
          ___________ / {(block.props.name as string) ?? "Подпись"} /
        </div>
      );
    default:
      return <div className="h-full p-2 text-[9px] text-neutral-400">{block.type}</div>;
  }
}
