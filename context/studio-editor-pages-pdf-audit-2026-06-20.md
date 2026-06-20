# Studio editor audit — pages + PDF (2026-06-20)

## Страницы (Frontend → Страницы)

| Страница | Рендер | Статус |
|----------|--------|--------|
| CMS (home, about, contact, catalog) | `GridPageContent` + `SiteLayout` | OK — editor/preview/live совпадают |
| Auth (login) | `GridPageContent` | OK — fix split-layout (2026-06-20) |
| Cabinet | `AppShell` + `GridPageContent` | OK — один блок workspace, grid обрезает область |
| Wizard | отдельная вкладка «Визард» | frames: OK; шаги без frames — `WizardEngine`, не grid |

### Известные ограничения (не баги)

- **Шапка CMS** (`layout.header.logo`) — нет UI в «Стили и меню»; «URL логотипа» в теме = `branding.assets.logoUrl`, другой ключ.
- **Визард в превью сайта** — показывается первый frame-шаг, не текущий шаг редактора.
- **Zoom 55%** на canvas — только масштаб отображения, layout тот же.
- **Новая страница** — без `pageProfile` (дефолт cms-default).

## Визард подбора (не в grid «Страницы»)

Страница **«Подбор насосов»** (`type: wizard`, route `/`) — выбор класса насоса, карточки, форма параметров (Q, H и т.д.).

- Редактор: **Фронт → Визард** или выбор **«Подбор насосов»** в выпадающем списке страниц (переключит на режим Визард).
- Не показывается в `VisualPageEditor` — отдельный `WizardVisualEditor` (шаги, карточки, fields, frame-блоки).
- Шаг `selection-form` с полями ввода — через `WizardEngine`, не CSS grid.

## PDF редактор

### Исправлено (2026-06-20)

| Проблема | Fix |
|----------|-----|
| Превью: iframe GET на POST-only endpoint | POST черновика → blob URL |
| Превью показывало сохранённый файл, не черновик | body.blocks приоритетнее template.json |
| Save: stale closure `blocks` | `blocksRef` |
| Режим «Поток/Свободный» не сохранялся | `mode` в template.json + infer free при load |
| Шаблон с x,y открывался в «Поток» | `inferPdfMode()` при загрузке |
| В палитре не было bom/dn/curves | Добавлены типы |
| PDF генератор игнорировал порядок free-layout | sort by (y, x) при mode=free |

### Ограничение (архитектура)

**Свободный режим** — координаты x/y/w/h на холсте **не рендерятся абсолютно** в PDF (ReportLab flow). В PDF учитываются: порядок слоёв + сортировка по Y. Точное WYSIWYG позиционирование — future work.

**Поток** — порядок блоков = порядок в массиве / панели «Слои».

## Сохранение

- Страницы: «Сохранить» → PUT `/site`
- PDF: «Сохранить» → PUT `/pdf/template`
- Визард: save nav + frames (dual)
