import { useRef, type ReactNode } from "react";
import { useHorizontalWheelScroll } from "@/hooks/useHorizontalWheelScroll";
import { cn } from "@/lib/cn";
import { DEFAULT_CARD_UI } from "@/lib/strela/cardUi";

interface Props {
  children: ReactNode;
  stripGapClass?: string;
}

export function MockupCardStrip({ children, stripGapClass = DEFAULT_CARD_UI.stripGapClass }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useHorizontalWheelScroll(ref);

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
