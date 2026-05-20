# SiteAppearance / API воронки (апрель 2026)

## Django `SiteAppearance`

- Миграция `0020_siteappearance_funnel_fields`: `funnel_sidebar_logo_1` … `_4` (`ImageField`), `selection_stage_titles`, `selection_category_full_width`
- Миграция `0021_siteappearance_funnel_sidebar_wordmark`: `funnel_sidebar_wordmark` — `FileField` (`upload_to=appearance/funnel`), SVG/PNG для вертикального знака слева на всех шагах воронки
- Миграция `0022_siteappearance_selection_card_settings`: `selection_card_settings` — `JSONField` (nullable), санитизация в `api/pumpapp/selection_card_settings.py`
- Миграции `0025` / `0026`: `selection_card_caption_logo`, `selection_flow_header_logo` — мини-значок у карточек и горизонтальный логотип в шапке воронки/параметров

## `GET /api/appearance` и `GET|PATCH /api/admin/appearance`

- `funnel_sidebar_logo_urls`: `{ "1": url|null, … }` — мини-лого на **карточках** по шагам (fallback: `logo_url`, Strela)
- `funnel_sidebar_wordmark_url`: URL загруженного wordmark или `null` (на фронте тогда `FUNNEL_SIDEBAR_WORDMARK_DEFAULT` из `/selection-assets/funnel-sidebar-wordmark.svg`)
- `selection_stage_titles`, `selection_category_full_width`
- `selection_card_settings`: объект или `null` — настройки mockup-карточек воронки (все ключи опциональны после sanitize): `card_width_px` (280–640), `image_zone` (`compact`|`normal`|`large`), `card_area_height` (`short`|`default`|`tall`), `title_scale` (`sm`|`md`|`lg`|`xl`), `code_scale` (`xs`|`sm`), `bullet_scale` (`xs`|`sm`|`base`), `bullet_leading` (`snug`|`normal`|`relaxed`), `strip_gap` (`sm`|`md`|`lg`), `caption_logo_scale` (`sm`|`md`|`lg`). На фронте: `resolveSelectionCardUi()` в `selectionCardSettings.ts`, проп `cardUiSettings` у `SelectionFlowLayout`, блок в админке «Внешний вид».

- `selection_flow_header_logo_url` — горизонтальный логотип в шапке этапов воронки и экрана параметров; загрузка: `selection_flow_header_logo` (multipart)

Загрузка: `PATCH` multipart — `funnel_sidebar_wordmark`, `funnel_sidebar_logo_1` … `_4`, `selection_card_caption_logo`, `selection_flow_header_logo`.

## Фронт

- `SelectionFlowLayout`: `headerLogoUrl` — лого слева от заголовка в шапке; `cardCaptionLogoSrc` → контекст карточек; дефолт шапки для Стрелы: `SELECTION_FLOW_HEADER_BRAND_DEFAULT_SRC` (`/selection-assets/selection-flow-header-brand.png`), для Simpel без загрузки — `logo_url`
- Экран параметров (`flowStep === "work"`): `pageTitleLogoSrc` = тот же расчёт, что и `headerLogoUrl` воронки (`Home.tsx`)
- Миграции `pumpapp`: параллельно от `0019` идут ветка воронки `0020_siteappearance_funnel_fields` → `0021` → `0022` и ветка `0020_siteappearance_stage_headings` (поля `stage_heading_*`); объединение — `0023_merge_pumpapp_funnel_and_stage_headings`. Публичный и админский API отдают `stage_headings`; `selection_stage_titles` (JSON) при отображении имеет приоритет над плоскими строками (`resolvedSelectionTitle` в `selectionFlowCopy.ts`). Если на сервере остался посторонний файл `0020_merge_*.py`, его нужно удалить — он не из репозитория.
- Дефолт ширины карточки: `SELECTION_MOCKUP_CARD_WIDTH_PX` (448), если в `selection_card_settings` нет `card_width_px`
- Админка: блок «Воронка: вертикальный логотип слева» + загрузка `adminUploadFunnelSidebarWordmark`; блок «Карточки воронки и текст под ними» (`adminPatchAppearance` с `selection_card_settings`)
