import React from "react";

/** Красный маркер-стрелка как в макете Figma (карточки BPS-C). */
export function StrelaHmCardChevron({ className = "h-[22px] w-[23px] shrink-0" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 22" className={className} aria-hidden>
      <polygon points="0,0 24,11 0,22" className="fill-[#d9222a]" />
    </svg>
  );
}
