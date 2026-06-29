import { useCallback, useEffect, type RefObject } from "react";

/** Vertical wheel → horizontal scroll (live card strip, wizard decomposed row). */
export function useHorizontalWheelScroll(ref: RefObject<HTMLElement | null>, enabled = true) {
  const onWheel = useCallback(
    (event: WheelEvent) => {
      const el = ref.current;
      if (!el || !enabled) return;
      const { deltaX, deltaY } = event;
      if (Math.abs(deltaX) > Math.abs(deltaY)) return;
      if (el.scrollWidth <= el.clientWidth + 1) return;
      event.preventDefault();
      el.scrollLeft += deltaY;
    },
    [ref, enabled],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel, enabled, ref]);
}
