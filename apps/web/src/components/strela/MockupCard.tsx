import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { DEFAULT_CARD_UI, type ImageHoverVariant } from "@/lib/strela/cardUi";

interface Props {
  image: ReactNode;
  identifier: string;
  bullets: string[];
  boxTitle?: string | null;
  disabled?: boolean;
  onClick?: () => void;
  imageHoverVariant?: ImageHoverVariant;
  captionLogoSrc?: string | null;
  widthPx?: number;
}

export function MockupCard({
  image,
  identifier,
  bullets,
  boxTitle = null,
  disabled = false,
  onClick,
  imageHoverVariant = "zoomSubtle",
  captionLogoSrc = null,
  widthPx,
}: Props) {
  const ui = DEFAULT_CARD_UI;
  const captionLogo = captionLogoSrc ?? null;
  const hasLogo = Boolean(captionLogo);
  const title = boxTitle?.trim() ? boxTitle.trim() : identifier;
  const showCode = Boolean(boxTitle?.trim()) && identifier.trim() !== (boxTitle ?? "").trim();

  const imageScale =
    imageHoverVariant === "zoom"
      ? "group-hover:scale-[1.12] group-focus-visible:scale-[1.12]"
      : imageHoverVariant === "lift"
        ? "group-hover:scale-[1.06] group-focus-visible:scale-[1.06]"
        : "group-hover:scale-[1.08] group-focus-visible:scale-[1.08]";

  const cardShadow =
    imageHoverVariant === "lift"
      ? "group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_28px_rgba(15,23,42,0.14),0_4px_10px_rgba(15,23,42,0.09)] group-focus-visible:-translate-y-0.5 group-focus-visible:shadow-[0_12px_28px_rgba(15,23,42,0.14),0_4px_10px_rgba(15,23,42,0.09)]"
      : "group-hover:shadow-[0_8px_22px_rgba(15,23,42,0.12),0_2px_6px_rgba(15,23,42,0.08)] group-focus-visible:shadow-[0_8px_22px_rgba(15,23,42,0.12),0_2px_6px_rgba(15,23,42,0.08)]";

  const face = (
    <div
      className={cn(
        "selection-mockup-card-face flex min-h-0 w-full flex-col overflow-hidden rounded-xl border-0 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.08),0_1px_3px_rgba(15,23,42,0.06)] ring-0 transition-[box-shadow,transform] duration-300 ease-out",
        cardShadow,
      )}
    >
      <div
        className="relative box-border w-full max-w-full shrink-0 overflow-hidden bg-[var(--funnel-card-media-bg)] p-1 sm:p-1.5"
        style={{
          width: "100%",
          aspectRatio: ui.imageAspectRatio,
          maxHeight: ui.imageMaxHeightCss,
        }}
      >
        <div
          className={cn(
            "absolute inset-1 flex min-h-0 min-w-0 items-center justify-center transition-transform duration-300 ease-out will-change-transform sm:inset-1.5",
            imageScale,
            "[&_img]:!h-auto [&_img]:!w-auto [&_img]:max-h-full [&_img]:max-w-full [&_img]:object-contain",
          )}
        >
          {image}
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-0.5 bg-white px-3 pb-1 pt-2 shadow-[inset_0_1px_0_0_rgba(15,23,42,0.07)] sm:px-4 sm:pt-2.5">
        <div className="flex min-w-0 items-start gap-2 sm:items-center sm:gap-2.5">
          {hasLogo ? (
            <img src={captionLogo!} alt="" className={ui.captionLogoClass} decoding="async" />
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {showCode ? <span className={ui.codeLineClass}>{identifier}</span> : null}
            <h3 className={ui.titleH3Class}>{title}</h3>
          </div>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white px-3 pb-2.5 pt-1 sm:px-4 sm:pb-3">
        {bullets.length === 1 ? (
          <p className={ui.bulletSingleClass}>{bullets[0]}</p>
        ) : (
          <ul className={ui.bulletListClass}>
            {bullets.map((bullet) => (
              <li key={bullet} className="flex gap-2 pl-0 sm:gap-2.5 sm:pl-0.5">
                <span
                  className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--funnel-primary)]/50 sm:mt-2"
                  aria-hidden
                />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  const shellClass = cn(
    "group m-0 flex min-w-0 flex-col overflow-visible border-0 bg-transparent p-0 text-left shadow-none outline-none",
    widthPx ? "shrink-0" : "w-[min(100%,var(--selection-card-width,22rem))] shrink-0 snap-start",
    disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
  );

  if (!onClick || disabled) {
    return (
      <div className={shellClass} style={widthPx ? { width: widthPx } : undefined}>
        {face}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={shellClass}
      style={widthPx ? { width: widthPx } : undefined}
      onClick={onClick}
      disabled={disabled}
    >
      {face}
    </button>
  );
}
