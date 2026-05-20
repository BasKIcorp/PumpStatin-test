/**
 * Схема зон техлиста поверх превью A4 — что где рисуется в PDF.
 */
import React from "react";
import { cn } from "@/lib/utils";
import type { PdfPreviewSamples } from "@/lib/pdf-preview-samples";
import {
  computeTechSheetZones,
  zoneRectToCss,
  type MainPageOverlayConfig,
  type TechSheetZoneId,
} from "@/lib/tech-sheet-layout";

const ZONE_STYLES: Record<TechSheetZoneId, string> = {
  header: "border-violet-500/70 bg-violet-500/8",
  charts: "border-sky-500/70 bg-sky-500/10",
  specs: "border-amber-500/70 bg-amber-500/10",
  scheme: "border-emerald-500/70 bg-emerald-500/10",
  mass: "border-orange-500/70 bg-orange-500/12",
};

const PDF_FONT = 'ui-sans-serif, "DejaVu Sans", "Liberation Sans", Arial, sans-serif';

export function TechSheetLayoutZones({
  pageConfig,
  scale,
  samples,
  graphScale = 0.525,
  graphXOffset = -150,
  activeZone,
}: {
  pageConfig: MainPageOverlayConfig;
  scale: number;
  samples: PdfPreviewSamples;
  graphScale?: number;
  graphXOffset?: number;
  activeZone?: TechSheetZoneId | null;
}) {
  const zones = computeTechSheetZones(pageConfig);

  return (
    <div className="absolute inset-0 pointer-events-none z-[5]" aria-hidden>
      {zones.map((zone) => {
        const rect = zoneRectToCss(zone, scale);
        const isActive = activeZone === zone.id;
        return (
          <div
            key={zone.id}
            className={cn(
              "absolute overflow-hidden border-2 border-dashed rounded-sm",
              ZONE_STYLES[zone.id],
              isActive && "ring-2 ring-primary/50 z-[6]",
            )}
            style={rect}
          >
            <ZoneHeader title={zone.title} description={zone.description} />
            {zone.id === "header" && (
              <pre
                className="px-1.5 pb-1 text-right text-zinc-800 whitespace-pre-line m-0 leading-tight"
                style={{ fontFamily: PDF_FONT, fontSize: 10 * scale }}
              >
                {samples.mainHeader}
              </pre>
            )}
            {zone.id === "charts" && (
              <ChartsZonePreview scale={scale} graphScale={graphScale} graphXOffset={graphXOffset} title={samples.sectionChart} />
            )}
            {zone.id === "specs" && (
              <SpecsZonePreview scale={scale} title={samples.sectionSpecs} rows={samples.techSheetSpecRows} />
            )}
            {zone.id === "scheme" && (
              <div
                className="flex h-[calc(100%-28px)] items-center justify-center text-center text-emerald-900/80 px-2"
                style={{ fontSize: 8 * scale }}
              >
                <div>
                  <div className="font-medium">Принципиальная схема</div>
                  <div className="mt-1 opacity-80 text-[9px]">Чертёж / изображение насоса</div>
                </div>
              </div>
            )}
            {zone.id === "mass" && (
              <div className="px-1.5 py-1 text-orange-950/90" style={{ fontSize: 7 * scale }}>
                <div className="font-semibold">Массогабаритные параметры</div>
                <div className="tabular-nums mt-0.5">L×W×H, масса…</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ZoneHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start justify-between gap-1 bg-white/85 px-1.5 py-0.5 border-b border-black/10">
      <span className="text-[9px] font-semibold text-zinc-900 leading-tight">{title}</span>
      <span className="text-[8px] text-zinc-600 leading-tight text-right max-w-[55%]">{description}</span>
    </div>
  );
}

function ChartsZonePreview({
  scale,
  graphScale,
  graphXOffset,
  title,
}: {
  scale: number;
  graphScale: number;
  graphXOffset: number;
  title: string;
}) {
  return (
    <div className="flex flex-col h-[calc(100%-28px)] p-1.5 gap-1">
      <p className="font-medium text-sky-900" style={{ fontSize: 8 * scale }}>
        {title}
      </p>
      <div className="flex-1 min-h-0 rounded border border-sky-400/50 bg-gradient-to-br from-sky-50 to-white flex flex-col items-center justify-center gap-1">
        <svg viewBox="0 0 120 70" className="w-[85%] max-h-[55%] text-sky-600/90" aria-hidden>
          <polyline fill="none" stroke="currentColor" strokeWidth="2" points="8,58 35,42 58,35 92,18" />
          <circle cx="8" cy="58" r="3" fill="currentColor" />
          <circle cx="92" cy="18" r="3" fill="currentColor" />
        </svg>
        <span className="text-sky-800/80" style={{ fontSize: 7 * scale }}>
          Масштаб {(graphScale * 100).toFixed(0)}% · сдвиг X {graphXOffset} pt
        </span>
      </div>
    </div>
  );
}

function SpecsZonePreview({
  scale,
  title,
  rows,
}: {
  scale: number;
  title: string;
  rows: [string, string][];
}) {
  const fontSize = 6.5 * scale;
  return (
    <div className="flex flex-col h-[calc(100%-28px)] p-1 min-h-0">
      <p className="font-medium text-amber-950 mb-0.5 shrink-0" style={{ fontSize: 8 * scale }}>
        {title}
      </p>
      <table className="w-full border-collapse text-amber-950" style={{ fontFamily: PDF_FONT, fontSize }}>
        <tbody>
          {rows.map(([k, v], i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-amber-50/80" : undefined}>
              <td className="border border-amber-400/60 px-0.5 py-px align-top w-[42%]">{k}</td>
              <td className="border border-amber-400/60 px-0.5 py-px align-top font-medium">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

