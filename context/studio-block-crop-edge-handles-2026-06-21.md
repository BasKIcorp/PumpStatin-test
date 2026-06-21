# Studio — обрезка блока перетаскиванием сторон

Обновлено: 2026-06-21

## Поведение

- При выделении блока в grid-редакторе появляются 4 полоски-хэндла на сторонах (верх/низ/лево/право).
- Перетаскивание стороны меняет `layout.crop` (inset в %, 0–49 на сторону).
- Превью во время drag через `previewCrop` → `BlockTransformWrap` (`clip-path: inset(...)`).
- Альтернатива: поля % в PropertiesPanel; сброс — «Сбросить обрезку».

## Файлы

- `apps/web/src/lib/blockTransform.ts` — `CropEdge`, `cropFromEdgeDrag()`, `clampCropInset()`
- `apps/web/src/engine/GridPageContent.tsx` — `startCropEdge`, edge hit-zones в `GridEditableBlock`
- `apps/web/src/components/studio/BlockTransformWrap.tsx` — применение crop/rotation

## UX

- Хэндлы: `pointer-events-auto`, полупрозрачный accent `#0d99ff`, курсор `ns-resize` / `ew-resize`.
- Углы оставлены для resize (правый нижний) и rotate (верх по центру).
