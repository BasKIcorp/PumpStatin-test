/**
 * Геометрия техлиста — те же формулы, что в api/pdf_generator.py (основная страница).
 */
import { A4_PT, CM_TO_PT, ptBottomLeftToCss } from "@/lib/pdf-coordinates";

/** Ширина блока таблицы характеристик, см (api/pdf/config.py). */
export const TECH_SHEET_SPEC_BLOCK_CM = 8.835;

export const TECH_SHEET_HEADER_BLOCK_PT = 36;

export type TechSheetZoneId = "header" | "charts" | "specs" | "scheme" | "mass";

export interface TechSheetZone {
  id: TechSheetZoneId;
  title: string;
  description: string;
  leftPt: number;
  bottomPt: number;
  widthPt: number;
  heightPt: number;
}

export interface MainPageOverlayConfig {
  left_margin_cm?: number;
  right_margin_cm?: number;
  content_top_cm?: number;
  header_top_cm?: number;
}

export function computeTechSheetZones(cfg: MainPageOverlayConfig): TechSheetZone[] {
  const pageW = A4_PT.width;
  const pageH = A4_PT.height;
  const leftPt = (cfg.left_margin_cm ?? 8) * CM_TO_PT;
  const rightPt = (cfg.right_margin_cm ?? 1.5) * CM_TO_PT;
  const contentTopPt = pageH - (cfg.content_top_cm ?? 2.5) * CM_TO_PT;
  const headerTopPt = pageH - (cfg.header_top_cm ?? 1) * CM_TO_PT;
  const specBlockPt = TECH_SHEET_SPEC_BLOCK_CM * CM_TO_PT;
  const chartGapPt = 0.5 * CM_TO_PT;
  const chartWidthPt = Math.max(40, pageW - leftPt - rightPt - specBlockPt - chartGapPt);
  const tableLeftPt = pageW - rightPt - specBlockPt;

  const upperHeightPt = Math.min(pageH * 0.4, contentTopPt - 2 * CM_TO_PT);
  const upperBottomPt = Math.max(2 * CM_TO_PT, contentTopPt - upperHeightPt);
  const headerBottomPt = headerTopPt - TECH_SHEET_HEADER_BLOCK_PT;
  const schemeHeightPt = Math.max(80, upperBottomPt - 1.2 * CM_TO_PT);
  const schemeBottomPt = 1 * CM_TO_PT;

  return [
    {
      id: "header",
      title: "Шапка",
      description: "Название станции и номер ТКП (справа)",
      leftPt,
      bottomPt: Math.max(0, headerBottomPt),
      widthPt: pageW - leftPt - rightPt,
      heightPt: TECH_SHEET_HEADER_BLOCK_PT,
    },
    {
      id: "charts",
      title: "Графики",
      description: "Q–H, NPSH и др. (картинка из подбора)",
      leftPt,
      bottomPt: upperBottomPt,
      widthPt: chartWidthPt,
      heightPt: upperHeightPt,
    },
    {
      id: "specs",
      title: "Характеристики",
      description: "Таблица оборудования и параметров",
      leftPt: tableLeftPt,
      bottomPt: upperBottomPt,
      widthPt: specBlockPt,
      heightPt: upperHeightPt,
    },
    {
      id: "scheme",
      title: "Схема и чертёж",
      description: "Принципиальная схема, изображение насоса",
      leftPt,
      bottomPt: schemeBottomPt,
      widthPt: chartWidthPt * 0.98,
      heightPt: schemeHeightPt,
    },
    {
      id: "mass",
      title: "Массогабариты",
      description: "Таблица габаритов (тип станции «гм»)",
      leftPt: tableLeftPt,
      bottomPt: schemeBottomPt,
      widthPt: specBlockPt,
      heightPt: Math.min(72, schemeHeightPt * 0.35),
    },
  ];
}

export function zoneRectToCss(
  zone: Pick<TechSheetZone, "leftPt" | "bottomPt" | "widthPt" | "heightPt">,
  scale: number,
  pageHeightPt = A4_PT.height,
) {
  const topAnchor = ptBottomLeftToCss(zone.leftPt, zone.bottomPt + zone.heightPt, scale, pageHeightPt);
  return {
    left: topAnchor.left,
    top: topAnchor.top,
    width: zone.widthPt * scale,
    height: zone.heightPt * scale,
  };
}
