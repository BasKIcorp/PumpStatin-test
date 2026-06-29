import type { PdfBlock } from "./PdfCanvas";

export type PdfPageDefaults = {
  width: number;
  height: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
};

export const DEFAULT_PDF_PAGE: PdfPageDefaults = {
  width: 595,
  height: 842,
  marginTop: 42,
  marginBottom: 42,
  marginLeft: 56,
  marginRight: 56,
};

export function normalizePdfPages(data: {
  blocks?: PdfBlock[];
  pages?: Array<{ blocks?: PdfBlock[] }>;
}): PdfBlock[][] {
  if (Array.isArray(data.pages) && data.pages.length > 0) {
    return data.pages.map((p) => (Array.isArray(p.blocks) ? p.blocks : []));
  }
  return [data.blocks ?? []];
}

export function parsePdfPageDefaults(raw: unknown): PdfPageDefaults {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PDF_PAGE };
  const d = raw as Record<string, unknown>;
  return {
    width: Number(d.width) || DEFAULT_PDF_PAGE.width,
    height: Number(d.height) || DEFAULT_PDF_PAGE.height,
    marginTop: Number(d.marginTop) ?? DEFAULT_PDF_PAGE.marginTop,
    marginBottom: Number(d.marginBottom) ?? DEFAULT_PDF_PAGE.marginBottom,
    marginLeft: Number(d.marginLeft) ?? DEFAULT_PDF_PAGE.marginLeft,
    marginRight: Number(d.marginRight) ?? DEFAULT_PDF_PAGE.marginRight,
  };
}

/** Known PDF binding paths aligned with backend `_build_pdf_context`. */
export const PDF_BINDING_PATHS = [
  { path: "branding.appTitle", desc: "Название сайта" },
  { path: "station.DN", desc: "Диаметр DN станции" },
  { path: "station.dn_suction", desc: "DN всасывания" },
  { path: "station.dn_discharge", desc: "DN нагнетания" },
  { path: "station.velocity", desc: "Скорость в трубе" },
  { path: "pump.name", desc: "Модель насоса" },
  { path: "pump.model", desc: "Модель (alias)" },
  { path: "working_point.Q", desc: "Рабочая точка Q" },
  { path: "working_point.H", desc: "Рабочая точка H" },
  { path: "bom.items", desc: "Спецификация BOM" },
  { path: "curves.qh_main", desc: "Кривая Q-H" },
  { path: "configuration.DN", desc: "DN из конфигурации" },
] as const;
