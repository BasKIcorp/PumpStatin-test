/**
 * Фоны слайдов воронки: /selection-assets/ или VITE_STATIC_BASE_URL + тот же путь.
 * Файлы: podbor-001.png … podbor-024.png.
 */
import { staticUrl } from "@/lib/staticBase";

export const SELECTION_ASSETS_BASE = staticUrl("/selection-assets");

/** Ширина карточек воронки «Выбор карточек» (mockup strip) */
export const SELECTION_MOCKUP_CARD_WIDTH_PX = 448;

/** Вертикальный логотип Kentatsu в левой колонке (официальный SVG с kentatsu.global) */
export const FUNNEL_SIDEBAR_WORDMARK_DEFAULT = staticUrl("/selection-assets/kentatsu-logo.svg");

/** Маркер в строке названия карточки (экспорт «Рисунок 3.svg») */
export const SELECTION_CARD_ARROW_SRC = staticUrl("/selection-assets/selection-card-arrow.svg");

export const STRELA_LOGO_SRC = staticUrl("/selection-assets/strela-logo.svg");

/** Значок слева от названия mockup-карточки (дефолтный PNG, если в админке не задан свой файл) */
export const CARD_CAPTION_MARK_DEFAULT_SRC = staticUrl("/selection-assets/mockup-card-caption-logo.png");

/** Логотип в левой колонке страницы `/login` (SVG Group 1) */
export const LOGIN_PAGE_BRAND_SRC = staticUrl("/selection-assets/group-1-brand.svg");

/** Горизонтальный логотип «стрела» + стрелка в шапке этапов воронки и экрана параметров (дефолт до загрузки в админке) */
export const SELECTION_FLOW_HEADER_BRAND_DEFAULT_SRC = staticUrl(
  "/selection-assets/selection-flow-header-brand.png",
);

export function selectionSlidePng(index: 1 | 2 | 3 | 4 | 23): string {
  const n = index === 23 ? "023" : String(index).padStart(3, "0");
  return staticUrl(`/selection-assets/podbor-${n}.png`);
}

/**
 * Логотип для шапки конкретного этапа воронки подбора.
 * Поддерживает 4 варианта по stage-индексу (1–4) и brand_key.
 * Пока все этапы strela используют один файл; структура готова к замене.
 */
export function getStageLogoUrl(stage: 1 | 2 | 3 | 4, brandKey: string): string | undefined {
  if (brandKey === "simpel") return undefined;
  return staticUrl("/selection-assets/strela-logo.svg");
}
