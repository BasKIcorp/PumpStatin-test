/**
 * Координаты PDF (ReportLab): origin снизу слева, pt, страница A4.
 * Должны соответствовать api/pdf/coordinates.py.
 */
export const A4_PT = { width: 595.28, height: 841.89 } as const;
export const CM_TO_PT = 28.35;

/** Приближение ascent (как в ReportLab при отсутствии метрик). */
export function approxFontAscent(fontSizePt: number): number {
  return Math.max(fontSizePt * 0.8, fontSizePt * 0.25);
}

/** Точка (ptX, ptY от низа) → CSS left/top в превью. */
export function ptBottomLeftToCss(
  ptX: number,
  ptYFromBottom: number,
  scale: number,
  pageHeightPt: number = A4_PT.height,
): { left: number; top: number } {
  return {
    left: ptX * scale,
    top: pageHeightPt * scale - ptYFromBottom * scale,
  };
}

/** ReportLab drawString: (ptX, baselineY) → CSS для левого верхнего угла текста. */
export function pdfBaselineLeftToCss(
  ptX: number,
  baselineY: number,
  fontSizePt: number,
  scale: number,
  pageHeightPt: number = A4_PT.height,
): { left: number; top: number } {
  const ascent = approxFontAscent(fontSizePt);
  return {
    left: ptX * scale,
    top: pageHeightPt * scale - (baselineY + ascent) * scale,
  };
}

/** Верхний правый угол текста (титул ТКП): ptY — верх строки от низа листа. */
export function pdfTopRightToCss(
  ptRightX: number,
  ptTopY: number,
  scale: number,
  pageHeightPt: number = A4_PT.height,
): { left: number; top: number } {
  return ptBottomLeftToCss(ptRightX, ptTopY, scale, pageHeightPt);
}

/** Центр блока (centerX, centerY от низа) → CSS left/top левого верхнего угла прямоугольника. */
export function pdfCenterRectToCss(
  centerX: number,
  centerY: number,
  widthPt: number,
  heightPt: number,
  scale: number,
  pageHeightPt: number = A4_PT.height,
): { left: number; top: number; width: number; height: number } {
  const w = widthPt * scale;
  const h = heightPt * scale;
  const centerDiv = ptBottomLeftToCss(centerX, centerY, scale, pageHeightPt);
  return {
    left: centerDiv.left - w / 2,
    top: centerDiv.top - h / 2,
    width: w,
    height: h,
  };
}

export function cssToPtBottomLeft(
  divX: number,
  divY: number,
  scale: number,
  pageHeightPt: number = A4_PT.height,
): { x: number; y: number } {
  return {
    x: divX / scale,
    y: (pageHeightPt * scale - divY) / scale,
  };
}
