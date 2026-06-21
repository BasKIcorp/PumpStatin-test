import type { BlockCropInset, BlockGridLayout } from "@pumpstation/contracts";
import type { CSSProperties, ReactNode } from "react";
import { layoutCrop, layoutRotation } from "@/lib/blockTransform";

export function cropClipStyle(crop: BlockCropInset | null | undefined): CSSProperties {
  if (!crop) return {};
  const { top, right, bottom, left } = crop;
  if (top === 0 && right === 0 && bottom === 0 && left === 0) return {};
  return { clipPath: `inset(${top}% ${right}% ${bottom}% ${left}%)` };
}

export function BlockTransformWrap({
  layout,
  children,
  className,
}: {
  layout: BlockGridLayout;
  children: ReactNode;
  className?: string;
}) {
  const rotation = layoutRotation(layout);
  const crop = layoutCrop(layout);
  const hasTransform = rotation !== 0 || crop !== null;

  if (!hasTransform) {
    return <div className={className ?? "h-full w-full min-h-0"}>{children}</div>;
  }

  return (
    <div className={`${className ?? ""} h-full w-full min-h-0 overflow-hidden`.trim()}>
      <div
        className="flex h-full w-full min-h-0 items-center justify-center"
        style={{
          transform: rotation !== 0 ? `rotate(${rotation}deg)` : undefined,
          transformOrigin: "center center",
        }}
      >
        <div className="h-full w-full min-h-0" style={cropClipStyle(crop ?? undefined)}>
          {children}
        </div>
      </div>
    </div>
  );
}
