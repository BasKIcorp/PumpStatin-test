import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { DEFAULT_CARD_UI } from "@/lib/strela/cardUi";

interface Props {
  children: ReactNode;
  stripGapClass?: string;
}

export function MockupCardStrip({ children, stripGapClass = DEFAULT_CARD_UI.stripGapClass }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const onWheel = useCallback((event: WheelEvent) => {
    const el = ref.current;
    if (!el) return;
    const { deltaX, deltaY } = event;
    if (Math.abs(deltaX) > Math.abs(deltaY) || el.scrollWidth <= el.clientWidth) return;
    event.preventDefault();
    el.scrollLeft += deltaY;
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  return (
    <div className="selection-mockup-strip-outer flex w-full min-w-0 flex-col overflow-hidden pb-1 sm:pb-2">
      <div
        ref={ref}
        className={cn(
          "selection-mockup-strip-scroll flex max-h-full min-h-0 w-full min-w-0 flex-row flex-nowrap items-center overflow-x-auto overflow-y-hidden overscroll-x-contain px-1 py-1 sm:px-2 sm:py-2",
          stripGapClass,
        )}
      >
        {children}
      </div>
    </div>
  );
}
