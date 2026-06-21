# Редактор визарда и страниц (2026-06-20)

## Унификация

- Отдельная вкладка **«Визард»** убрана — визард редактируется как обычная **страница** в режиме «Страницы».
- Выберите **«Подбор насосов»** в селекторе страниц — откроется тот же layout: **Слои | Блоки**, canvas, свойства справа.
- **Сохранить** и **Превью** — в общей верхней панели (как у CMS-страниц).

## Card-grid шаги — что редактируется

| Область | Где в редакторе |
|---------|-----------------|
| Шаг: заголовок, подзаголовок, тип | Правая панель → «Шаг» |
| Карточки: текст, изображение (drag-drop), описание, next, flow | Правая панель → «Карточка» или список «Карточки» |
| Блоки шага (heading, card-grid) | Вкладка «Блоки» → «Блоки на шаге», слои «Блоки шага» |
| Layout блоков | Drag/resize на canvas (как CMS) |
| Маршрут страницы | Правая панель → «Маршрутизация» |

## Strela funnel — сайдбар и canvas (2026-06-20, доработка)

- **Сайдбар** не grid-блок — настраивается в правой панели **«Оболочка Strela (сайдбар)»**: ширина (`appearance.funnel_sidebar_width`), текст, wordmark.
- **Режим «Оболочка Strela»** (по умолчанию): WYSIWYG как на сайте (`WizardEngine`).
- **Режим «Сетка»**: drag/resize блоков в StudioCanvas.
- **Превью** (кнопка в toolbar): `DraftPagePreview` текущей страницы визарда + выбранный шаг, не «Главная».
- **Live `/wizard`**: всегда `WizardEngine` внутри funnel — frames только для Studio-редактора.

## Исправление 2026-06-20 (card-grid regression)

**Причина:** frames перевели card-grid на `GridPageContent` (CSS Grid), Strela-карточки требуют flex внутри funnel.

**Fix:** `WizardStepRenderer` без `editor` → `WizardEngine`. Превью визарда → `DraftPagePreview`, не site preview с «Главной». Восстановлен `pdfPreview` state в AdminProfileStudio.
- Заголовок шага на live — в шапке funnel, не в grid; текст — в панели **«Шаг»**. Для Strela дефолтные frames без `wizard/step-heading`.
- Сохранение: `handleSaveWizard` пишет wizard + site frames + `branding.appearance` при изменении оболочки.

## Live / preview parity

- `StrelaWizardShell` в studio (режим «Оболочка Strela») использует `previewStepId` — funnel header совпадает с выбранным шагом.
- Заголовок funnel берётся из `navigation.yaml` (title/subtitle шага), если задан.
- `CardGridStep` (simple) показывает `card.image`.
- `WizardStepHeadingBlock` показывает subtitle.

## API

- Загрузка изображений карточек: `POST /api/v1/admin/profiles/{id}/media/upload` → `/selection-assets/uploads/{profileId}/...`

## Исправление 2026-06-20 (sidebar поверх UI Studio)

**Причина:** `WizardLiveCanvas` рендерил `StrelaWizardShell` без `embedded` → сайдбар `fixed` от viewport, перекрывал левую панель редактора.

**Fix:** `WizardGridPage` prop `embedded` → `StrelaWizardShell`. `WizardLiveCanvas` всегда `embedded={true}` + `overflow-hidden` контейнер. Live `/wizard` — `embedded=false` (default).

## Исправление 2026-06-20 (редактирование визарда как страниц)

**Причина:** по умолчанию открывался режим «Оболочка Strela» (`WizardLiveCanvas`) — read-only превью без drag/resize блоков. Редактирование было только в скрытом режиме «Сетка».

**Fix:** убран переключатель «Сетка / Оболочка Strela». Редактор всегда использует `StudioCanvas` + `WizardStepRenderer` с `editor`. `WizardLiveCanvas` только в «Превью».

## Исправление 2026-06-20 (все элементы — grid-блоки)

**Было:** сайдбар — appearance + WizardFunnelLayoutPanel; заголовок — nav/shell; карточки — монолит `wizard/card-grid-strela`.

**Стало:** frame-блоки на шаг: `wizard/funnel-sidebar`, `wizard/funnel-heading`, `wizard/selection-card` (по одной на карточку). Миграция из `card-grid-strela` в `wizardFrameUtils`. Live/editor — `GridPageContent` без StrelaWizardShell при decomposed frames.

## Исправление 2026-06-20 (размеры карточек в grid)

**Причина:** grid-ячейки `h=11` (~520px) сильно выше контента MockupCard; рамка выделения показывала пустое место. Карточки не растягивались на ширину ячейки (22rem cap).

**Fix:** `cardLayoutNeedsReposition` только при add/remove карточек в nav, не при расхождении x/y/w со слотом — drag/resize сохраняется.

## Canvas: прокрутка и расширение (2026-06-20)

**Fix:** `StudioCanvas` — `overflow-auto`, artboard `overflow-visible`, высота от `gridContentHeight`; колёсико — scroll, Ctrl+wheel — zoom.

## Горизонтальная лента карточек (2026-06-20)

**Fix:** `layoutForCard` — карточки в один ряд (`SELECTION_CARD_COL_W=4`), grid расширяется: `gridContentCols` + `artboardWidthForCols`. Live/editor — `overflow-x-auto`, ширина сетки = `artboardWidth`.

## Undo / Redo (2026-06-20)

**Fix:** `useWizardEditorUndo` — единый snapshot `{ nav, draftPage, appearance }` на базе `useUndoRedo`.

- **Ctrl+Z** / **Ctrl+Y** (или **Ctrl+Shift+Z**) — откат/повтор в `WizardVisualEditor`; не перехватывается в input/textarea/select/contenteditable.
- В историю попадают: drag/resize блоков (`patchFrameBlocks`), шаги, карточки, appearance (через `setAppearanceDraft`).
- Sync frames (`syncWizardPageFrames`) и загрузка с сервера — `recordHistory: false`.
- Атомарные операции nav+draftPage: `addStep`, `removeStep`, `updateStep`, `addCard`, `removeCard`, `moveCard`, DnD reorder карточек — через `patchEditor`.

## Поворот и обрезка блоков — Phase 1 (2026-06-21)

**Контракт:** `BlockGridLayout.rotation` (градусы), `BlockCropInset` / `layout.crop` (inset 0–49%).

**Studio:** секция «Трансформация» в `PropertiesPanel`; ручка поворота на canvas (`GridPageContent`); обёртка `BlockTransformWrap` (rotate + clip-path). **R** — +90° (не в input/textarea/select/contenteditable). `clampLayout` сохраняет rotation/crop.

**Wizard sidebar:** новый `wizard/funnel-sidebar` по умолчанию `rotation: -90`; при reposition карточек rotation/crop сохраняются.

## Форма подбора (selection-form) — декомпозиция (2026-06-21)

**Шаг:** `selection-form` («Подбор насосной установки») в `wizard/navigation.yaml`, parent: `installation-type`.

**Было:** монолит `wizard/legacy-selection` (24×12 grid) — read-only в Studio, drag/resize недоступен.

**Стало:** 6 frame-блоков (Strela, profile `default`):

| Блок | type | Назначение |
|------|------|------------|
| Шапка | `wizard/selection-work-header` | WorkHeader, «Назад», логотип, ошибки |
| Параметры | `wizard/selection-params-panel` | Поля из flow.sections |
| Кривые | `wizard/selection-curves-panel` | Q-H, P2/NPSH charts |
| Тех. характеристики | `wizard/selection-tech-specs-panel` | Таблица + ТКП/тех. лист |
| Опции | `wizard/selection-options-panel` | flow.options + кнопки Подобрать/Сбросить/Сформировать |
| Результаты | `wizard/selection-results-panel` | Список насосов, summary, PDF |

**Миграция:** `wizard/legacy-selection` → decomposed в `wizardFrameUtils` (`buildDecomposedSelectionFormFrameBlocks`, on-the-fly при загрузке frames).

**Состояние:** `SelectionFormProvider` оборачивает grid в `WizardStepRenderer` при decomposed frames; панели через `useSelectionForm()`.

**Live `/wizard`:** `WizardStepRenderer` → `GridPageContent` + provider (parity с editor). Legacy monolith — fallback через `WizardEngine` → `StrelaSelectionFormStep`.

**Gaps:** mobile stack (lg:hidden) только в legacy monolith; decomposed — desktop grid layout. Поля flow редактируются в панели «Поля», не как отдельные grid-блоки.
