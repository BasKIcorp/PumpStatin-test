/** Пресеты и источники данных для блоков с графиками (wizard + PDF). */

export const CHART_PRESET_OPTIONS = [
  { value: "qh-five-curves", label: "Q-H (5 кривых + система)" },
  { value: "power-npsh", label: "Мощность / NPSH" },
] as const;

export type ChartPresetId = (typeof CHART_PRESET_OPTIONS)[number]["value"];

export const CHART_READ_FROM_OPTIONS = [
  { value: "matchedPumps", label: "Подобранные насосы (matchedPumps)" },
  { value: "stationResult", label: "Результат станции (stationResult)" },
] as const;

export type ChartReadFrom = (typeof CHART_READ_FROM_OPTIONS)[number]["value"];

export const CHART_READ_PATH_OPTIONS = [
  { value: "curves.qh", label: "curves.qh — кривая Q-H" },
  { value: "curves.p2", label: "curves.p2 — мощность" },
  { value: "curves.npsh", label: "curves.npsh — NPSH" },
  { value: "curves.qh_main", label: "curves.qh_main — основная Q-H" },
] as const;

export const DEFAULT_CHART_BINDINGS = {
  chartPreset: "qh-five-curves" as ChartPresetId,
  readFrom: "matchedPumps" as ChartReadFrom,
  readPath: "curves.qh",
};
