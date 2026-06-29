/** Presets for studio artboard / viewport guides (CMS, wizard, PDF). */
export const STUDIO_VIEWPORT_PRESETS = [
  { id: "desktop", label: "Desktop 1440", width: 1440, height: 900 },
  { id: "laptop", label: "Laptop 1280", width: 1280, height: 800 },
  { id: "tablet", label: "Tablet 768", width: 768, height: 1024 },
  { id: "mobile", label: "Mobile 375", width: 375, height: 812 },
  { id: "a4", label: "A4 PDF", width: 595, height: 842 },
] as const;

export type StudioViewportPresetId = (typeof STUDIO_VIEWPORT_PRESETS)[number]["id"];

export function viewportPresetById(id: StudioViewportPresetId) {
  return STUDIO_VIEWPORT_PRESETS.find((p) => p.id === id) ?? STUDIO_VIEWPORT_PRESETS[0];
}

/** Width of the dashed viewport guide on the artboard (caps CMS content width when set). */
export function studioViewportGuideWidth(
  presetWidth: number,
  artboardWidth: number,
  opts?: { maxContentWidth?: number },
): number {
  const cap = opts?.maxContentWidth ?? Infinity;
  return Math.min(presetWidth, cap, artboardWidth);
}
