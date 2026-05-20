/**
 * Общие классы и чтение CSS-переменных для экрана «Работа» (подбор установки).
 */

import { cn } from "@/lib/utils";

export type FunnelChartTheme = {
  background: string;
  text: string;
  grid: string;
  linePrimary: string;
  lineSecondary: string;
};

const CHART_FALLBACK: FunnelChartTheme = {
  background: "#ffffff",
  text: "#18181b",
  grid: "#71717a",
  linePrimary: "#13347f",
  lineSecondary: "#18181b",
};

export function readFunnelChartTheme(): FunnelChartTheme {
  if (typeof document === "undefined") return CHART_FALLBACK;
  const s = getComputedStyle(document.documentElement);
  return {
    background: s.getPropertyValue("--funnel-chart-bg").trim() || CHART_FALLBACK.background,
    text: s.getPropertyValue("--funnel-text").trim() || CHART_FALLBACK.text,
    grid: s.getPropertyValue("--funnel-text-muted").trim() || CHART_FALLBACK.grid,
    linePrimary: s.getPropertyValue("--funnel-primary").trim() || CHART_FALLBACK.linePrimary,
    lineSecondary: s.getPropertyValue("--funnel-text").trim() || CHART_FALLBACK.lineSecondary,
  };
}

export const FUNNEL_SELECT_CONTENT_CLASS =
  "border-0 bg-[var(--funnel-surface)] text-[var(--funnel-text)] shadow-lg";

export const FUNNEL_SELECT_ITEM_CLASS =
  "focus:bg-[var(--funnel-table-row-alt-bg)] focus:text-[var(--funnel-text)]";

export const FUNNEL_SELECT_TRIGGER_CLASS = cn(
  "h-8 border-0 bg-[var(--funnel-input-bg)] text-sm text-[var(--funnel-text)] shadow-none",
  "transition-[box-shadow,opacity] duration-150 ease-out hover:opacity-95",
  "focus:outline-none focus:ring-2 focus:ring-[var(--funnel-primary)]/35 focus:ring-offset-1 focus:ring-offset-[var(--funnel-surface)]",
);

export const FUNNEL_INPUT_CLASS = cn(
  "border-0 bg-[var(--funnel-input-bg)] text-[var(--funnel-text)] shadow-none",
  "placeholder:text-[var(--funnel-text-muted)]",
  "focus-visible:ring-2 focus-visible:ring-[var(--funnel-primary)]/35 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--funnel-surface)]",
);
