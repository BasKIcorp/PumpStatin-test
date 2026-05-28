# Клон UI референса 159.194.215.53

Источник: http://159.194.215.53/ (Vite+React, воронка + work-form).

## Реализовано

| Экран | Компоненты |
|-------|------------|
| Карточки визарда | `SelectionFlowFunnel`, `MockupCard`, `MockupCardStrip`, `StrelaCardGridStep` |
| Форма BPS-W | `StrelaSelectionFormStep`, `WorkHeader`, CSS-grid панелей |
| Вход | `StrelaLoginPage` — layout как `pump_station/Login.tsx`, бренд `group-1-brand.svg`, блок «Быстрый вход» по организациям |
| Стили | `src/styles/strela-funnel.css` + `appearance` из `branding.yaml` |

## Тексты и палитра

Синхронизированы с `/api/appearance` и snapshot браузера:

- `appTitle`: «Подбор насосного оборудования Стрела»
- Карточки категорий — полные описания из референса
- `funnel_surface_color: #284dbd` — синие карточки, белый текст, красная стрелка в caption-logo
- `stage_headings` в `branding.yaml` → `resolveStrelaStageHeading()`

## Ассеты (`apps/web/public`)

Источник SVG/PNG: `C:\projects\Simpel\pump_station\frontend\client\public\`

- `selection-assets/group-1-brand.svg` — левая панель логина (не `assets/logo.png` референса)
- `attached_assets/strela-wordmark.svg` — копия `funnel-sidebar-wordmark.svg`
- `assets/selection-flow-header-brand.png`
- `selection-assets/mockup-card-caption-logo.png`, `selection-card-arrow.svg`
- `selection-assets/podbor-001.png` … `004.png`

Константы путей: `apps/web/src/lib/strela/selectionAssets.ts`

## Палитра экрана подбора (BPS-C Pro)

| Элемент | Цвет |
|---------|------|
| Фон страницы / панели | `#ffffff` |
| Рамки панелей и полей | `#d4d4d8` (zinc-300) |
| Заголовки панелей | градиент zinc-100 → white, текст `#52525b` |
| Акцент / кнопка «Подобрать» | `#13347f` |
| Строка таблицы (выбрана) | `#e8eef7` |
| Подписи полей | `#71717a` (zinc-500) |

Задаётся в `config/profiles/default/branding.yaml` → `appearance` и CSS `strela-funnel.css`.

## Шрифты Segoe UI

Как в `pump_station`: `public/fonts/seui/*.woff2` + `src/styles/segoe-fonts.css` (подключение в `main.tsx` до `strela-funnel.css`).

- Основной текст воронки / логина: **Segoe UI** (`funnel_font_body: segoe`)
- Заголовки воронки: **SegoeUISelectionSidebar** (semibold woff2)
- Open Sans остаётся через Google Fonts для прочих экранов / `funnel_font_heading: open_sans` в других профилях

## Быстрый вход (демо)

`GET /api/v1/auth/demo-accounts` → `organization` + `displayName` из `config/accounts/users.yaml` (пароль `demo123` для всех).

## Ещё не 1:1

- Кривые характеристик (react-flow / Uk, Vk)
- API «В ТКП», «Тех. лист», `/api/page-layout/resolve/{slug}`
- Забыли пароль / Регистрация — заглушки
- Гидромодули — без картинок hm-cards с референса

## Деплой

```powershell
ssh -i $env:USERPROFILE\.ssh\id_ed25519_pumpstatin root@83.222.16.200
cd /opt/pumpstation-base && git pull && bash deploy/remote-setup.sh
```

После деплоя: http://83.222.16.200/ (логин strela / demo123).
