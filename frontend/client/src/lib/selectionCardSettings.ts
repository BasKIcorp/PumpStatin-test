import { SELECTION_MOCKUP_CARD_WIDTH_PX } from "@/lib/selectionAssets";

/** Частичные настройки с API / админки (совпадают с ключами после sanitize на бэкенде) */
export type SelectionCardSettings = {
  card_width_px?: number;
  image_zone?: "compact" | "normal" | "large";
  card_area_height?: "short" | "default" | "tall";
  title_scale?: "sm" | "md" | "lg" | "xl";
  code_scale?: "xs" | "sm";
  bullet_scale?: "xs" | "sm" | "base";
  bullet_leading?: "snug" | "normal" | "relaxed";
  strip_gap?: "sm" | "md" | "lg";
  caption_logo_scale?: "sm" | "md" | "lg";
};

export type ResolvedSelectionCardUi = {
  cardWidthPx: number;
  cardAreaMaxHeightCss: string;
  imageMaxHeightCss: string;
  imageAspectRatio: string;
  titleH3Class: string;
  codeLineClass: string;
  bulletSingleClass: string;
  bulletListClass: string;
  /** Зазор между карточками в ленте и между карточками в колонке (fullWidth) */
  stripGapClass: string;
  captionLogoClass: string;
};

const IMAGE_MAX: Record<NonNullable<SelectionCardSettings["image_zone"]>, string> = {
  compact: "min(22dvh, 11rem)",
  normal: "min(30dvh, 14.5rem)",
  large: "min(36dvh, 17rem)",
};

const CARD_AREA: Record<NonNullable<SelectionCardSettings["card_area_height"]>, string> = {
  short: "min(72dvh, calc(100dvh - 6rem))",
  default: "min(86dvh, calc(100dvh - 4.75rem))",
  tall: "min(92dvh, calc(100dvh - 4rem))",
};

const TITLE_H3: Record<NonNullable<SelectionCardSettings["title_scale"]>, string> = {
  sm: "text-base leading-snug sm:text-lg",
  md: "text-lg leading-snug sm:text-xl",
  lg: "text-xl leading-snug sm:text-2xl",
  xl: "text-xl leading-tight sm:text-3xl",
};

const CODE_LINE: Record<NonNullable<SelectionCardSettings["code_scale"]>, string> = {
  xs: "text-[11px] leading-none sm:text-xs",
  sm: "text-xs leading-none sm:text-sm",
};

const BULLET_SINGLE: Record<NonNullable<SelectionCardSettings["bullet_scale"]>, string> = {
  xs: "text-[11px] font-normal sm:text-xs",
  sm: "text-xs font-normal sm:text-sm",
  base: "text-sm font-normal sm:text-base",
};

const BULLET_LEADING: Record<NonNullable<SelectionCardSettings["bullet_leading"]>, string> = {
  snug: "leading-snug",
  normal: "leading-normal",
  relaxed: "leading-relaxed",
};

const BULLET_LIST_EXTRA: Record<NonNullable<SelectionCardSettings["bullet_scale"]>, string> = {
  xs: "space-y-1 sm:space-y-1.5",
  sm: "space-y-1.5 sm:space-y-2",
  base: "space-y-2 sm:space-y-2.5",
};

const STRIP_GAP: Record<NonNullable<SelectionCardSettings["strip_gap"]>, string> = {
  sm: "gap-2 sm:gap-2",
  md: "gap-3 sm:gap-4",
  lg: "gap-4 sm:gap-5",
};

const CAPTION_LOGO: Record<NonNullable<SelectionCardSettings["caption_logo_scale"]>, string> = {
  sm: "h-5 w-auto max-w-[min(32%,2.75rem)] shrink-0 object-contain sm:h-6 sm:max-w-[3rem]",
  md: "h-6 w-auto max-w-[min(32%,3.25rem)] shrink-0 object-contain sm:h-7 sm:max-w-[3.5rem]",
  lg: "h-7 w-auto max-w-[min(36%,3.75rem)] shrink-0 object-contain sm:h-8 sm:max-w-[4rem]",
};

const DEFAULTS: Required<
  Pick<
    SelectionCardSettings,
    | "image_zone"
    | "card_area_height"
    | "title_scale"
    | "code_scale"
    | "bullet_scale"
    | "bullet_leading"
    | "strip_gap"
    | "caption_logo_scale"
  >
> = {
  image_zone: "normal",
  card_area_height: "default",
  title_scale: "md",
  code_scale: "sm",
  bullet_scale: "sm",
  bullet_leading: "snug",
  strip_gap: "md",
  caption_logo_scale: "md",
};

export function resolveSelectionCardUi(raw: SelectionCardSettings | null | undefined): ResolvedSelectionCardUi {
  const s = raw && typeof raw === "object" ? raw : {};
  const imageZone = s.image_zone ?? DEFAULTS.image_zone;
  const cardArea = s.card_area_height ?? DEFAULTS.card_area_height;
  const titleScale = s.title_scale ?? DEFAULTS.title_scale;
  const codeScale = s.code_scale ?? DEFAULTS.code_scale;
  const bulletScale = s.bullet_scale ?? DEFAULTS.bullet_scale;
  const bulletLeading = s.bullet_leading ?? DEFAULTS.bullet_leading;
  const stripGap = s.strip_gap ?? DEFAULTS.strip_gap;
  const logoScale = s.caption_logo_scale ?? DEFAULTS.caption_logo_scale;

  const w =
    typeof s.card_width_px === "number" && Number.isFinite(s.card_width_px)
      ? Math.round(Math.max(280, Math.min(640, s.card_width_px)))
      : SELECTION_MOCKUP_CARD_WIDTH_PX;

  const lead = BULLET_LEADING[bulletLeading];
  const bulletSingle = `${BULLET_SINGLE[bulletScale]} ${lead} text-[var(--funnel-text-muted)]`;
  const bulletList = `font-sans font-normal ${BULLET_LIST_EXTRA[bulletScale]} ${lead} text-[var(--funnel-text-muted)]`;

  return {
    cardWidthPx: w,
    cardAreaMaxHeightCss: CARD_AREA[cardArea],
    imageMaxHeightCss: IMAGE_MAX[imageZone],
    imageAspectRatio: "5 / 4",
    titleH3Class: `selection-flow-funnel-heading text-[var(--funnel-primary)] ${TITLE_H3[titleScale]}`,
    codeLineClass: `selection-flow-funnel-heading text-[var(--funnel-primary)] opacity-85 ${CODE_LINE[codeScale]}`,
    bulletSingleClass: `font-sans ${bulletSingle}`,
    bulletListClass: `font-sans ${bulletList}`,
    stripGapClass: STRIP_GAP[stripGap],
    captionLogoClass: CAPTION_LOGO[logoScale],
  };
}
