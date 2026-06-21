import type { BlockCropInset, BlockGridLayout } from "@pumpstation/contracts";

export const ROTATION_SNAP_DEG = 45;

export function layoutRotation(layout: BlockGridLayout): number {
  return layout.rotation ?? 0;
}

export function layoutCrop(layout: BlockGridLayout): BlockCropInset | null {
  const c = layout.crop;
  if (!c) return null;
  if (c.top === 0 && c.right === 0 && c.bottom === 0 && c.left === 0) return null;
  return c;
}

export function normalizeRotation(deg: number): number {
  const n = deg % 360;
  return n < 0 ? n + 360 : n;
}

/** Snap to 45°; fine=true → 1° steps */
export function snapRotation(deg: number, fine = false): number {
  const normalized = normalizeRotation(deg);
  if (fine) return Math.round(normalized);
  const snapped = Math.round(normalized / ROTATION_SNAP_DEG) * ROTATION_SNAP_DEG;
  return snapped === 360 ? 0 : snapped;
}

export function clampCropInset(value: number): number {
  return Math.max(0, Math.min(49, Math.round(value)));
}

export function emptyCrop(): BlockCropInset {
  return { top: 0, right: 0, bottom: 0, left: 0 };
}

export function hasCrop(crop: BlockCropInset | null | undefined): boolean {
  if (!crop) return false;
  return crop.top > 0 || crop.right > 0 || crop.bottom > 0 || crop.left > 0;
}

export function angleFromCenter(cx: number, cy: number, px: number, py: number): number {
  return (Math.atan2(py - cy, px - cx) * 180) / Math.PI;
}

/** Increment rotation by delta (e.g. keyboard R → +90°) */
export function rotateLayoutBy(layout: BlockGridLayout, deltaDeg: number): BlockGridLayout {
  return { ...layout, rotation: snapRotation(layoutRotation(layout) + deltaDeg) };
}

export type CropEdge = "top" | "right" | "bottom" | "left";

/** Adjust crop inset when dragging a block edge (delta in px, block size in px). */
export function cropFromEdgeDrag(
  startCrop: BlockCropInset,
  edge: CropEdge,
  dxPx: number,
  dyPx: number,
  blockWidthPx: number,
  blockHeightPx: number,
): BlockCropInset {
  const w = Math.max(blockWidthPx, 1);
  const h = Math.max(blockHeightPx, 1);
  const next = { ...startCrop };
  switch (edge) {
    case "top":
      next.top = clampCropInset(startCrop.top + (dyPx / h) * 100);
      break;
    case "bottom":
      next.bottom = clampCropInset(startCrop.bottom + (-dyPx / h) * 100);
      break;
    case "left":
      next.left = clampCropInset(startCrop.left + (dxPx / w) * 100);
      break;
    case "right":
      next.right = clampCropInset(startCrop.right + (-dxPx / w) * 100);
      break;
  }
  return next;
}
