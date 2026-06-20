import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export const PREVIEW_VIEWPORTS = [
  { id: "full", label: "Полный экран", width: null as number | null },
  { id: "desktop", label: "Desktop", width: 1440 },
  { id: "tablet", label: "Планшет", width: 768 },
  { id: "mobile", label: "Мобильный", width: 375 },
] as const;

export type PreviewViewportId = (typeof PREVIEW_VIEWPORTS)[number]["id"];

export function pickDefaultPreviewViewport(defaultWidth: number): PreviewViewportId {
  const match = PREVIEW_VIEWPORTS.find((v) => v.width === defaultWidth);
  return match?.id ?? "full";
}

/** Read-only page frame — blocks links, buttons and form fields */
export function PreviewReadonlyFrame({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.setAttribute("inert", "");
    return () => ref.current?.removeAttribute("inert");
  }, []);

  return (
    <div
      ref={ref}
      className="pointer-events-none min-h-full w-full select-none"
      aria-hidden
    >
      {children}
    </div>
  );
}

export function PreviewViewport({
  viewportId,
  children,
  className,
}: {
  viewportId: PreviewViewportId;
  children: ReactNode;
  className?: string;
}) {
  const viewport = PREVIEW_VIEWPORTS.find((v) => v.id === viewportId) ?? PREVIEW_VIEWPORTS[0];
  const framed = viewport.width != null;

  const frameStyle: CSSProperties | undefined = framed
    ? { width: viewport.width, maxWidth: "100%" }
    : undefined;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden bg-[#1a1a1a]", className)}>
      <div
        className={cn(
          "min-h-0 flex-1 overflow-auto",
          framed ? "flex justify-center p-4 sm:p-6" : "p-0",
        )}
      >
        <div
          className={cn(
            "overflow-hidden bg-white",
            framed ? "min-h-full rounded-sm shadow-xl" : "min-h-full w-full",
          )}
          style={frameStyle}
        >
          <PreviewReadonlyFrame>{children}</PreviewReadonlyFrame>
        </div>
      </div>
    </div>
  );
}
