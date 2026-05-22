import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { SELECTION_CARD_ARROW_SRC } from "@/lib/selectionAssets";
import {
  resolveSelectionCardUi,
  type ResolvedSelectionCardUi,
  type SelectionCardSettings,
} from "@/lib/selectionCardSettings";

/** Ширина колонки с вертикальной подписью — совпадает с отступом основного контента */
const SELECTION_SIDEBAR_WIDTH = "clamp(4.25rem, 11vw, 13.5rem)";

/** URL мини-лого на mockup-карточках (из `cardCaptionLogoSrc` в `SelectionFlowLayout`) */
export const SelectionFlowCardCaptionLogoContext = createContext<string | null | undefined>(undefined);

const SelectionFlowCardUiContext = createContext<ResolvedSelectionCardUi | null>(null);

const FALLBACK_SELECTION_CARD_UI = resolveSelectionCardUi(null);

/** Стили карточек воронки из админки; вне макета — значения по умолчанию */
export function useSelectionCardUi(): ResolvedSelectionCardUi {
  const v = useContext(SelectionFlowCardUiContext);
  return v ?? FALLBACK_SELECTION_CARD_UI;
}

/** Левая колонка: wordmark и подпись из API (без статических fallback). */
function SelectionFlowSidebar({
  wordmarkSrc,
  sidebarText,
}: {
  wordmarkSrc: string | null;
  sidebarText?: string;
}) {
  const text = sidebarText?.trim();
  if (!wordmarkSrc && !text) {
    return <div className="h-full w-full bg-[var(--funnel-surface)]" aria-hidden />;
  }
  return (
    <div
      className="flex h-full min-h-0 w-full flex-col items-stretch justify-start gap-2 overflow-x-visible overflow-y-auto bg-[var(--funnel-surface)] pt-2 sm:pt-3"
      aria-hidden
    >
      {wordmarkSrc ? (
        <div
          className="relative w-full shrink-0 overflow-hidden"
          style={{ height: "min(72dvh, 26rem)" }}
        >
          <img
            src={wordmarkSrc}
            alt="Kentatsu"
            className="absolute left-0 top-0 max-w-none object-fill"
            style={{
              width: "min(72dvh, 26rem)",
              height: "var(--selection-sidebar-width, clamp(4.25rem, 11vw, 13.5rem))",
              transform:
                "translateX(var(--selection-sidebar-width, clamp(4.25rem, 11vw, 13.5rem))) rotate(90deg)",
              transformOrigin: "top left",
            }}
            decoding="async"
          />
        </div>
      ) : null}
      {text ? (
        <p className="max-w-full px-1.5 text-center text-[10px] leading-snug text-[var(--funnel-text-muted)] sm:px-2 sm:text-xs">
          {text}
        </p>
      ) : null}
    </div>
  );
}

function HeaderTitleBlock({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="min-w-0 text-left">
      <h1 className="selection-flow-funnel-heading text-[clamp(1.125rem,4.5vw,1.5rem)] leading-tight tracking-tight text-[var(--funnel-text)] sm:text-[clamp(1.25rem,2.8vw,2.25rem)]">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-1 line-clamp-2 font-sans text-xs font-normal leading-snug text-[var(--funnel-text-muted)] sm:text-sm">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export interface SelectionFlowLayoutProps {
  /** Вертикальный логотип слева (только из API) */
  sidebarWordmarkSrc?: string | null;
  /** Текст под wordmark в левой колонке */
  sidebarText?: string;
  /** Лого в подписи mockup-карточек (контекст); в шапке страницы не показывается */
  cardCaptionLogoSrc?: string | null;
  /** Главный заголовок в шапке (выравнивание по левому краю в средней колонке) */
  title: string;
  subtitle?: string;
  onBack?: () => void;
  /** Подпись ссылки «назад», напр. «← Класс продукции» */
  backLabel?: string;
  /** Блок справа в шапке (профиль, админ) */
  headerRight?: React.ReactNode;
  /** Индикатор этапов (1 — карточки, 2 — параметры) */
  stageIndicator?: React.ReactNode;
  children: React.ReactNode;
  /** Нижняя панель (кнопка «Далее» и т.п.) */
  footer?: React.ReactNode;
  /** Доп. класс для области контента */
  bodyClassName?: string;
  /** Фон слайда макета (URL из /selection-assets/…) */
  stageBackgroundSrc?: string;
  /** Настройки размеров и типографики карточек (из API appearance) */
  cardUiSettings?: SelectionCardSettings | null;
}

/**
 * Единая оболочка экранов воронки подбора: серый фон, белая карта, сайдбар, шапка как на макете.
 */
/** Оболочка контента этапа воронки: как блок с типами насосов (серый фон, отступы). */
export function SelectionFlowStageBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="selection-funnel-stage-top overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col items-stretch justify-start overflow-auto px-1 pb-3 pt-0.5 sm:px-3 sm:pb-4 sm:pt-1.5 md:px-4">
        <div className="selection-pump-gallery w-full">{children}</div>
      </div>
    </div>
  );
}

/**
 * Горизонтальная полоса карточек без зазоров (прокрутка колёсиком / тач).
 * Вертикальное колесо прокручивает ленту по горизонтали.
 */
export function SelectionHorizontalCardStrip({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardUi = useSelectionCardUi();

  const onWheel = useCallback((e: WheelEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    const { deltaX, deltaY } = e;
    const dominantX = Math.abs(deltaX) > Math.abs(deltaY);
    if (dominantX) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) return;
    e.preventDefault();
    el.scrollLeft += deltaY;
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  return (
    <div className="selection-mockup-strip-outer flex w-full min-w-0 flex-col overflow-hidden pb-1 sm:pb-2">
      <div
        ref={scrollRef}
        className={cn(
          "selection-mockup-strip-scroll flex max-h-full min-h-0 w-full min-w-0 flex-row flex-nowrap items-center overflow-x-auto overflow-y-hidden overscroll-x-contain px-1 py-1 sm:px-2 sm:py-2",
          cardUi.stripGapClass,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export type SelectionCardImageHoverVariant = "zoom" | "zoomSubtle" | "lift";

/**
 * Карточка выбора: картинка → название → текст; при наведении лёгкое увеличение.
 * `boxTitle` при наличии — основной заголовок, `identifier` — короткий код (напр. серия насоса).
 */
export function SelectionMockupCard({
  width: widthProp,
  fullWidth = false,
  image,
  identifier,
  identifierUppercase = false,
  boxTitle = null,
  bullets,
  disabled = false,
  onClick,
  imageHoverVariant = "zoomSubtle",
  captionLogoSrc,
}: {
  /** Ширина карточки в px; не задано — из настроек воронки (админка) */
  width?: number;
  /** Карточка на всю ширину контейнера (колонка вместо ленты) */
  fullWidth?: boolean;
  image: React.ReactNode;
  identifier: string;
  identifierUppercase?: boolean;
  boxTitle?: string | null;
  bullets: string[];
  disabled?: boolean;
  onClick?: () => void;
  /** Анимация масштаба изображения при hover/focus */
  imageHoverVariant?: SelectionCardImageHoverVariant;
  /** Лого слева от заголовка; иначе из контекста воронки; вне макета — `strela-logo.svg` */
  captionLogoSrc?: string | null;
}) {
  const cardUi = useSelectionCardUi();
  const captionLogoFromContext = useContext(SelectionFlowCardCaptionLogoContext);
  const captionLogoResolved =
    captionLogoSrc !== undefined
      ? captionLogoSrc
      : captionLogoFromContext !== undefined
        ? captionLogoFromContext
        : null;
  const showCaptionLogo = Boolean(captionLogoResolved);

  const mainTitle = boxTitle && boxTitle.trim() ? boxTitle.trim() : identifier;
  const showCodeLine =
    Boolean(boxTitle?.trim()) && identifier.trim() !== (boxTitle ?? "").trim();

  const imageZoomClass =
    imageHoverVariant === "zoom"
      ? "group-hover:scale-[1.12] group-focus-visible:scale-[1.12]"
      : imageHoverVariant === "lift"
        ? "group-hover:scale-[1.06] group-focus-visible:scale-[1.06]"
        : "group-hover:scale-[1.08] group-focus-visible:scale-[1.08]";

  const cardLiftClass =
    imageHoverVariant === "lift" ? "group-hover:-translate-y-0.5 group-focus-visible:-translate-y-0.5" : "";

  const cardFace = (
    <div
      className={cn(
        "selection-mockup-card-face selection-mockup-card-glow flex min-h-0 w-full flex-col overflow-hidden rounded-xl border border-[var(--funnel-border)] bg-[var(--funnel-surface)] ring-1 ring-[color-mix(in_srgb,var(--funnel-accent)_18%,transparent)] transition-[box-shadow,transform] duration-300 ease-out",
        imageHoverVariant === "lift" && "selection-mockup-card-glow-lift",
        cardLiftClass,
      )}
    >
      <div
        className="relative box-border w-full max-w-full shrink-0 overflow-hidden bg-[var(--funnel-card-media-bg)] p-1 sm:p-1.5"
        style={{
          width: "100%",
          aspectRatio: cardUi.imageAspectRatio,
          maxHeight: cardUi.imageMaxHeightCss,
        }}
      >
        <div
          className={cn(
            "absolute inset-1 flex min-h-0 min-w-0 items-center justify-center transition-transform duration-300 ease-out will-change-transform sm:inset-1.5",
            imageZoomClass,
            "[&_img]:!h-auto [&_img]:!w-auto [&_img]:max-h-full [&_img]:max-w-full [&_img]:object-contain",
          )}
        >
          {image}
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-0.5 bg-[var(--funnel-surface)] px-3 pb-1 pt-2 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--funnel-accent)_22%,transparent)] sm:px-4 sm:pt-2.5">
        <div className="flex min-w-0 items-start gap-2 sm:items-center sm:gap-2.5">
          {showCaptionLogo ? (
            <img src={captionLogoResolved} alt="" className={cardUi.captionLogoClass} decoding="async" />
          ) : null}
          <div className="min-w-0 flex-1 flex flex-col gap-0.5">
            {showCodeLine ? (
              <span
                className={cn(cardUi.codeLineClass, identifierUppercase ? "uppercase tracking-wider" : "")}
              >
                {identifier}
              </span>
            ) : null}
            <h3 className={cn(cardUi.titleH3Class, !showCodeLine && identifierUppercase ? "uppercase tracking-wide" : "")}>
              {mainTitle}
            </h3>
          </div>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--funnel-surface)] px-3 pb-2.5 pt-1 sm:px-4 sm:pb-3">
        {bullets.length === 1 ? (
          <p className={cardUi.bulletSingleClass}>{bullets[0]}</p>
        ) : (
          <ul className={cn(cardUi.bulletListClass)}>
            {bullets.map((b) => (
              <li key={b} className="flex gap-2 pl-0 sm:gap-2.5 sm:pl-0.5">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--funnel-primary)]/50 sm:mt-2" aria-hidden />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  const interactiveShell = cn(
    "group m-0 flex min-w-0 flex-col overflow-visible border-0 bg-transparent p-0 text-left shadow-none outline-none transition-transform duration-300 ease-out will-change-transform hover:scale-[1.015] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--funnel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--funnel-surface)] active:scale-[0.995]",
    fullWidth ? "w-full max-w-5xl shrink-0" : "flex-shrink-0",
  );

  const labelForA11y = [mainTitle, bullets[0]].filter(Boolean).join(". ");

  const effWidth = fullWidth ? undefined : (widthProp ?? cardUi.cardWidthPx);
  const sizeStyle = fullWidth ? undefined : { width: effWidth };

  if (disabled) {
    return (
      <div
        className={cn(
          "m-0 flex cursor-default flex-col overflow-visible border-0 bg-transparent p-0 opacity-50",
          fullWidth ? "w-full max-w-5xl" : "min-w-0 flex-shrink-0",
        )}
        style={sizeStyle}
        aria-disabled
      >
        {cardFace}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={interactiveShell}
      style={sizeStyle}
      aria-label={labelForA11y}
    >
      {cardFace}
    </button>
  );
}

export const SelectionFlowLayout: React.FC<SelectionFlowLayoutProps> = ({
  sidebarWordmarkSrc = null,
  sidebarText,
  cardCaptionLogoSrc = null,
  title,
  subtitle,
  onBack,
  backLabel = "← Класс продукции",
  headerRight,
  stageIndicator,
  children,
  footer,
  bodyClassName = "",
  stageBackgroundSrc,
  cardUiSettings = null,
}) => {
  const resolvedCardUi = useMemo(() => resolveSelectionCardUi(cardUiSettings), [cardUiSettings]);

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[var(--funnel-page-bg)]">
      <div
        className="selection-flow-funnel-root relative flex min-h-0 flex-1 items-stretch"
        style={
          {
            "--selection-card-area-max-height": resolvedCardUi.cardAreaMaxHeightCss,
          } as React.CSSProperties
        }
      >
        <div
          className="fixed bottom-0 left-0 top-0 z-30 flex flex-col overflow-x-visible border-r border-[var(--funnel-border)] bg-[var(--funnel-surface)] shadow-[inset_-1px_0_0_color-mix(in_srgb,var(--funnel-primary)_25%,transparent)]"
          style={
            {
              width: SELECTION_SIDEBAR_WIDTH,
              "--selection-sidebar-width": SELECTION_SIDEBAR_WIDTH,
            } as React.CSSProperties
          }
        >
          <SelectionFlowSidebar wordmarkSrc={sidebarWordmarkSrc ?? null} sidebarText={sidebarText} />
        </div>

        <div
          className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--funnel-page-bg)]"
          style={{ marginLeft: SELECTION_SIDEBAR_WIDTH }}
        >
          <header className="flex-shrink-0 border-0 px-2 py-2 sm:px-4 sm:py-2.5 lg:px-5">
            <div className="flex min-h-[44px] flex-col gap-2 sm:hidden">
              {stageIndicator ? <div className="pb-0.5">{stageIndicator}</div> : null}
              <HeaderTitleBlock title={title} subtitle={subtitle} />
              <div className="flex min-h-[40px] items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {onBack ? (
                    <button
                      type="button"
                      onClick={onBack}
                      className="max-w-full truncate text-left text-sm font-semibold text-[var(--funnel-primary)] hover:underline"
                    >
                      {backLabel}
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">{headerRight}</div>
              </div>
            </div>
            <div className="hidden min-h-[48px] grid-cols-[1fr_minmax(0,3fr)_1fr] items-center gap-3 sm:grid">
              <div className="flex min-w-0 justify-start">
                {onBack ? (
                  <button
                    type="button"
                    onClick={onBack}
                    className="text-left text-sm font-semibold text-[var(--funnel-primary)] hover:opacity-80 hover:underline lg:text-base"
                  >
                    {backLabel}
                  </button>
                ) : null}
              </div>

              <div className="min-w-0 px-1">
                {stageIndicator ? <div className="mb-2">{stageIndicator}</div> : null}
                <HeaderTitleBlock title={title} subtitle={subtitle} />
              </div>

              <div className="flex min-w-0 items-center justify-end gap-2">{headerRight}</div>
            </div>
          </header>

          <div
            className={`selection-funnel-content-scroll relative flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto ${bodyClassName}`.trim()}
            data-selection-backdrop={stageBackgroundSrc ? "true" : undefined}
          >
            {stageBackgroundSrc ? (
              <div
                className="pointer-events-none absolute inset-0 z-0 bg-[length:min(100%,1920px)_auto] bg-top bg-no-repeat opacity-95"
                style={{ backgroundImage: `url(${stageBackgroundSrc})` }}
                aria-hidden
              />
            ) : null}
            <SelectionFlowCardUiContext.Provider value={resolvedCardUi}>
              <SelectionFlowCardCaptionLogoContext.Provider value={cardCaptionLogoSrc}>
                <div className="relative z-10 flex min-h-0 min-w-0 w-full flex-1 flex-col justify-start overflow-visible pt-1 sm:pt-2">
                  {children}
                </div>
              </SelectionFlowCardCaptionLogoContext.Provider>
            </SelectionFlowCardUiContext.Provider>
          </div>

          {footer ? <div className="flex-shrink-0 border-0 bg-[var(--funnel-surface)]">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
};

export function SelectionChevronIcon({ className = "" }: { className?: string }) {
  return (
    <img
      src={SELECTION_CARD_ARROW_SRC}
      alt=""
      width={22}
      height={20}
      className={`block shrink-0 overflow-visible ${className}`}
      style={{ display: "block", width: 22, height: 20 }}
      decoding="async"
      aria-hidden
    />
  );
}
