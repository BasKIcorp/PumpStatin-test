/**
 * Визуальный слой превью для PdfOverlayEditor: те же anchor-семантики, что в ReportLab.
 */
import React from "react";
import { cn } from "@/lib/utils";
import type { PdfPreviewSamples } from "@/lib/pdf-preview-samples";
import {
  pdfBaselineLeftToCss,
  pdfCenterRectToCss,
  pdfTopRightToCss,
  ptBottomLeftToCss,
} from "@/lib/pdf-coordinates";

const PDF_FONT = 'ui-sans-serif, "DejaVu Sans", "Liberation Sans", Arial, sans-serif';

export type PdfAnchor =
  | "baseline-left"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "center";

function wysiwygChrome(active: boolean, livePreview?: boolean) {
  if (livePreview) {
    return cn(
      "absolute z-10 cursor-grab rounded-sm pointer-events-auto select-none transition-shadow",
      active
        ? "ring-2 ring-primary bg-white/90 shadow-md"
        : "ring-1 ring-primary/35 bg-white/75 hover:ring-primary/55 hover:bg-white/88",
    );
  }
  return cn(
    "absolute z-10 cursor-grab rounded-md px-1.5 py-1 shadow-sm backdrop-blur-[1px] pointer-events-auto select-none transition-colors",
    active
      ? "border-2 border-primary bg-white/95 ring-2 ring-primary/25 shadow-md"
      : "border border-zinc-400/90 bg-white/92 hover:border-primary/60 hover:bg-white",
  );
}

function DragSurface({
  label,
  className,
  style,
  onMouseDown,
  children,
}: {
  label: string;
  className?: string;
  style?: React.CSSProperties;
  onMouseDown: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      title={`${label}. Перетащите для смены позиции.`}
      className={className}
      style={style}
      onMouseDown={onMouseDown}
    >
      {children}
    </div>
  );
}

export function WysiwygHandle({
  label,
  sampleText,
  anchor = "baseline-left",
  ptX,
  ptY,
  fontSizePt = 11,
  scale,
  pageHeightPt = 841.89,
  onMouseDown,
  active,
  fontWeight = 400,
  textAlign = "left" as const,
  maxWidthPx = 220,
  variant = "text",
  livePreview = true,
  kpTable,
  customerRows,
}: {
  label: string;
  sampleText: string;
  anchor?: PdfAnchor;
  ptX: number;
  ptY: number;
  fontSizePt?: number;
  scale: number;
  pageHeightPt?: number;
  onMouseDown: (e: React.MouseEvent) => void;
  active: boolean;
  fontWeight?: number;
  textAlign?: "left" | "right" | "center";
  maxWidthPx?: number;
  variant?: "text" | "compact_table" | "kp_table" | "executor";
  livePreview?: boolean;
  kpTable?: PdfPreviewSamples["kpTable"];
  customerRows?: [string, string][];
}) {
  let pos: { left: number; top: number };
  if (anchor === "top-right") {
    pos = pdfTopRightToCss(ptX, ptY, scale, pageHeightPt);
  } else if (anchor === "baseline-left") {
    pos = pdfBaselineLeftToCss(ptX, ptY, fontSizePt, scale, pageHeightPt);
  } else {
    pos = ptBottomLeftToCss(ptX, ptY, scale, pageHeightPt);
  }

  const transform =
    anchor === "top-right"
      ? "translate(-100%, 0)"
      : anchor === "bottom-left"
        ? "translate(0, 100%)"
        : anchor === "center"
          ? "translate(-50%, -50%)"
          : undefined;

  const tableFont = 7 * scale;
  const pad = livePreview ? "p-0.5" : "px-1.5 py-1";

  return (
    <DragSurface
      label={label}
      className={cn(wysiwygChrome(active, livePreview), pad)}
      style={{
        left: pos.left,
        top: pos.top,
        transform,
        maxWidth: maxWidthPx,
        ...(active ? { zIndex: 20 } : {}),
      }}
      onMouseDown={onMouseDown}
    >
      {!livePreview && (
        <div className="mb-0.5 truncate text-[8px] font-semibold uppercase tracking-wide text-primary">{label}</div>
      )}
      {variant === "compact_table" ? (
        <table
          className="border-collapse text-zinc-900 leading-tight"
          style={{ fontFamily: PDF_FONT, fontSize: tableFont }}
        >
          <tbody>
            {(customerRows ?? [
              ["Кому:", "ООО «Заказчик»"],
              ["Проект:", "Объект тестовый"],
            ]).map(([k, v], i) => (
              <tr key={i} className={i < 2 ? "border-b border-zinc-300/80" : undefined}>
                <td className="py-0.5 pr-2 text-zinc-600 whitespace-nowrap">{k}</td>
                <td className="py-0.5 font-medium">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : variant === "kp_table" && kpTable ? (
        <table
          className="border-collapse text-zinc-900"
          style={{ fontFamily: PDF_FONT, fontSize: tableFont, width: maxWidthPx }}
        >
          <thead>
            <tr className="border border-black bg-zinc-100">
              {kpTable.headers.map((h, i) => (
                <th key={i} className="border border-black px-1 py-0.5 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {kpTable.row.map((cell, i) => (
                <td key={i} className="border border-black px-1 py-0.5 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      ) : variant === "executor" ? (
        <pre
          className="text-zinc-900 whitespace-pre-line font-sans m-0 leading-snug"
          style={{ fontFamily: PDF_FONT, fontSize: (livePreview ? 10 : 8) * scale }}
        >
          {sampleText}
        </pre>
      ) : (
        <SampleText fontSizePt={fontSizePt} scale={scale} fontWeight={fontWeight} textAlign={textAlign}>
          {sampleText}
        </SampleText>
      )}
    </DragSurface>
  );
}

function SampleText({
  children,
  fontSizePt,
  scale,
  fontWeight = 400,
  textAlign = "left" as const,
  className,
}: {
  children: React.ReactNode;
  fontSizePt: number;
  scale: number;
  fontWeight?: number;
  textAlign?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "break-words text-zinc-900 leading-snug",
        textAlign === "center" && "text-center",
        textAlign === "right" && "text-right",
        className,
      )}
      style={{ fontFamily: PDF_FONT, fontSize: fontSizePt * scale, fontWeight, textAlign }}
    >
      {children}
    </div>
  );
}

/** Сводная таблица подборов (пакетный PDF). */
export function WysiwygTkpSummaryTable({
  label,
  leftPt,
  topPt,
  scale,
  rows,
  pageHeightPt = 841.89,
  onMouseDown,
  active,
  livePreview = true,
}: {
  label: string;
  leftPt: number;
  topPt: number;
  scale: number;
  rows: PdfPreviewSamples["tkpSummaryRows"];
  pageHeightPt?: number;
  onMouseDown: (e: React.MouseEvent) => void;
  active: boolean;
  livePreview?: boolean;
}) {
  const pos = ptBottomLeftToCss(leftPt, topPt, scale, pageHeightPt);
  const colWidthsPx = [22, 238, 44, 44, 78].map((w) => w * scale);
  const fontSize = 7 * scale;

  return (
    <DragSurface
      label={label}
      className={cn(wysiwygChrome(active, livePreview), livePreview ? "p-0" : "px-1 py-1")}
      style={{
        left: pos.left,
        top: pos.top,
        width: colWidthsPx.reduce((a, b) => a + b, 0),
        ...(active ? { zIndex: 20 } : {}),
      }}
      onMouseDown={onMouseDown}
    >
      {!livePreview && (
        <div className="mb-0.5 truncate text-[8px] font-semibold uppercase tracking-wide text-primary">
          {label}
        </div>
      )}
      <table className="w-full border-collapse text-zinc-900" style={{ fontFamily: PDF_FONT, fontSize }}>
        <thead>
          <tr>
            {["№", "Наименование", "Q", "H, м", "Цена"].map((h, i) => (
              <th
                key={h}
                className="border border-black bg-white font-semibold text-left"
                style={{ width: colWidthsPx[i], padding: 2 * scale }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.n}>
              <td className="border border-black" style={{ padding: 2 * scale }}>{row.n}</td>
              <td className="border border-black" style={{ padding: 2 * scale }}>{row.name}</td>
              <td className="border border-black text-center" style={{ padding: 2 * scale }}>{row.q}</td>
              <td className="border border-black text-center" style={{ padding: 2 * scale }}>{row.h}</td>
              <td className="border border-black text-right tabular-nums" style={{ padding: 2 * scale }}>
                {row.price}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </DragSurface>
  );
}

export function WysiwygCenterRectBlock({
  label,
  sampleText,
  centerX,
  centerY,
  widthPt,
  heightPt,
  scale,
  pageHeightPt = 841.89,
  dragging,
  onMouseDown,
  resizable,
  resizeDragging,
  onResizeMouseDown,
  fontSizePx = 10,
  fontWeight = 600,
  uppercase,
  livePreview = true,
}: {
  label: string;
  sampleText: string;
  centerX: number;
  centerY: number;
  widthPt: number;
  heightPt: number;
  scale: number;
  pageHeightPt?: number;
  dragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  resizable?: boolean;
  resizeDragging?: boolean;
  onResizeMouseDown?: (e: React.MouseEvent) => void;
  fontSizePx?: number;
  fontWeight?: number;
  uppercase?: boolean;
  livePreview?: boolean;
}) {
  const rect = pdfCenterRectToCss(centerX, centerY, widthPt, heightPt, scale, pageHeightPt);
  const active = dragging || resizeDragging;
  return (
    <DragSurface
      label={label}
      className={cn(
        livePreview
          ? cn(wysiwygChrome(active, true), "flex flex-col overflow-hidden min-w-0 p-0.5")
          : cn(
              "absolute z-10 flex cursor-grab flex-col overflow-hidden rounded-md px-1.5 py-1 shadow-sm backdrop-blur-[1px] pointer-events-auto min-w-0",
              active
                ? "border-2 border-primary bg-white/97 ring-2 ring-primary/25 shadow-lg"
                : "border border-zinc-400/90 bg-white/93 hover:border-primary/55",
            ),
      )}
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        ...(active ? { zIndex: 20 } : {}),
      }}
      onMouseDown={onMouseDown}
    >
      {!livePreview && (
        <div className="shrink-0 truncate text-[8px] font-semibold uppercase tracking-wide text-primary">
          {label}
        </div>
      )}
      <div className={cn("flex min-h-0 flex-1 items-center justify-center overflow-hidden px-0.5", uppercase && "uppercase")}>
        <SampleText fontSizePt={fontSizePx / scale} scale={scale} fontWeight={fontWeight} textAlign="center">
          {sampleText}
        </SampleText>
      </div>
      {resizable && onResizeMouseDown && (
        <div
          className="absolute top-0 bottom-0 right-0 w-2 cursor-ew-resize bg-primary/10 hover:bg-primary/20"
          onMouseDown={(e) => {
            e.stopPropagation();
            onResizeMouseDown(e);
          }}
        />
      )}
    </DragSurface>
  );
}
