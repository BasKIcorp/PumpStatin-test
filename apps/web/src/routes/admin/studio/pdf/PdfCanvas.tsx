import { useCallback, useState } from "react";
import { Rnd } from "react-rnd";
import { useDroppable } from "@dnd-kit/core";
import { StudioCanvas } from "../canvas/StudioCanvas";
import { StudioViewportToolbar } from "../canvas/StudioViewportToolbar";
import {
  studioViewportGuideWidth,
  viewportPresetById,
  type StudioViewportPresetId,
} from "../canvas/studioViewport";
import {
  STUDIO_CANVAS_DROP_ZONE_ID,
  useStudioCanvasPan,
  useStudioCanvasZoom,
} from "../canvas/studioCanvasContext";
import { FIGMA } from "../figma/figmaTokens";

export const PDF_A4 = { width: 595, height: 842 } as const;
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

function PdfPageContent({
  blocks,
  selectedId,
  onSelect,
  onMove: onMoveBlock,
  onResize,
  mode,
  pageWidth,
  pageHeight,
  margins,
}: {
  blocks: PdfBlock[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, w: number, h: number) => void;
  mode: "auto" | "free";
  pageWidth: number;
  pageHeight: number;
  margins?: { marginTop: number; marginBottom: number; marginLeft: number; marginRight: number };
}) {
  const zoom = useStudioCanvasZoom();
  const spaceHeld = useStudioCanvasPan();
  const { setNodeRef, isOver } = useDroppable({ id: STUDIO_CANVAS_DROP_ZONE_ID });
  const freeMode = mode === "free" && !spaceHeld;

  const handleBgClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onSelect(null);
    },
    [onSelect],
  );

  return (
    <div
      ref={setNodeRef}
      data-canvas-bg
      data-testid="grid-canvas"
      className="relative overflow-hidden bg-white"
      style={{
        width: pageWidth,
        minHeight: pageHeight,
        height: pageHeight,
        outline: isOver ? `2px solid ${FIGMA.accent}` : undefined,
      }}
      onClick={handleBgClick}
    >
      {margins ? (
        <div
          className="pointer-events-none absolute border border-dashed border-[#0d99ff]/40 bg-[#0d99ff]/[0.03]"
          style={{
            left: margins.marginLeft,
            top: margins.marginTop,
            right: margins.marginRight,
            bottom: margins.marginBottom,
          }}
          aria-hidden
        />
      ) : null}
      {mode === "free" && (
        <svg className="pointer-events-none absolute inset-0" width={pageWidth} height={pageHeight}>
          {Array.from({ length: Math.ceil(pageWidth / SNAP) }).map((_, i) => (
            <line
              key={`v${i}`}
              x1={i * SNAP}
              y1={0}
              x2={i * SNAP}
              y2={pageHeight}
              stroke="#f0f0f0"
              strokeWidth={0.5}
            />
          ))}
          {Array.from({ length: Math.ceil(pageHeight / SNAP) }).map((_, i) => (
            <line
              key={`h${i}`}
              x1={0}
              y1={i * SNAP}
              x2={pageWidth}
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
            scale={zoom}
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
  );
}

export function PdfCanvas({
  blocks,
  selectedId,
  onSelect,
  onMove,
  onResize,
  onDropBlock,
  mode,
  pageWidth = PDF_A4.width,
  pageHeight = PDF_A4.height,
  margins,
}: {
  blocks: PdfBlock[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, w: number, h: number) => void;
  onDropBlock?: (type: string) => void;
  mode: "auto" | "free";
  pageWidth?: number;
  pageHeight?: number;
  margins?: { marginTop: number; marginBottom: number; marginLeft: number; marginRight: number };
}) {
  const [viewportPreset, setViewportPreset] = useState<StudioViewportPresetId>("a4");
  const viewport = viewportPresetById(viewportPreset);
  const viewportGuideWidth = studioViewportGuideWidth(viewport.width, pageWidth);

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <StudioViewportToolbar value={viewportPreset} onChange={setViewportPreset} />
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

      <StudioCanvas
        artboardLabel={`PDF ${pageWidth}×${pageHeight}`}
        artboardWidth={pageWidth}
        artboardMinHeight={pageHeight}
        viewportGuideWidth={viewportGuideWidth}
        highlightWorkArea
        onSelect={onSelect}
        onDropBlock={onDropBlock}
      >
        <PdfPageContent
          blocks={blocks}
          selectedId={selectedId}
          onSelect={onSelect}
          onMove={onMove}
          onResize={onResize}
          mode={mode}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          margins={margins}
        />
      </StudioCanvas>
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
