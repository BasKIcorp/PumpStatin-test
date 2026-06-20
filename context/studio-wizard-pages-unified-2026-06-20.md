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
