/** Статические ассеты воронки/логина — как в pump_station (Simpel) */

export const LOGIN_PAGE_BRAND_SRC = "/selection-assets/group-1-brand.svg";

export const FUNNEL_SIDEBAR_WORDMARK_DEFAULT = "/attached_assets/strela-wordmark.svg";

export const CARD_CAPTION_MARK_DEFAULT_SRC = "/selection-assets/mockup-card-caption-logo.png";

export const SELECTION_FLOW_HEADER_BRAND_DEFAULT_SRC =
  "/assets/selection-flow-header-brand.png";

export function selectionSlidePng(index: 1 | 2 | 3 | 4): string {
  const n = String(index).padStart(3, "0");
  return `/selection-assets/podbor-${n}.png`;
}
