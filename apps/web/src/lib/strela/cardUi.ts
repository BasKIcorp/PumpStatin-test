export const STRELA_SIDEBAR_WIDTH = "clamp(4.25rem, 11vw, 13.5rem)";

export const DEFAULT_CARD_UI = {
  imageAspectRatio: "5 / 4",
  imageMaxHeightCss: "min(30dvh, 14.5rem)",
  titleH3Class:
    "selection-flow-funnel-heading text-lg font-semibold leading-snug text-white sm:text-xl",
  codeLineClass:
    "selection-flow-funnel-heading text-xs leading-none text-white/85 uppercase tracking-wider sm:text-sm",
  bulletSingleClass: "font-sans text-sm leading-snug text-white/90 sm:text-base",
  bulletListClass: "font-sans text-sm leading-snug text-white/90 sm:text-base",
  stripGapClass: "gap-3 sm:gap-4",
  captionLogoClass:
    "h-6 w-auto max-w-[min(32%,3.25rem)] shrink-0 object-contain sm:h-6 sm:max-w-[3rem]",
} as const;

export type ImageHoverVariant = "zoom" | "zoomSubtle" | "lift";

export const CARD_HOVER_VARIANTS: ImageHoverVariant[] = ["zoom", "zoomSubtle", "lift"];
