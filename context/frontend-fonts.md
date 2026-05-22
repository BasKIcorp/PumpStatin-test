# Типографика фронтенда (pump_station)

- **Основной текст:** Open Sans — подключение через Google Fonts в `frontend/client/index.html` (веса 400, 500, 600, 700 + курсив 400/600). Tailwind: `font-sans` в `frontend/tailwind.config.ts`.
- **Заголовки:** Segoe UI Semibold (600) — локальные `@font-face` в `frontend/client/src/styles/segoe-fonts.css`, файлы под `/fonts/seui/` (см. комментарий в CSS и `scripts/upload-static-to-server.ps1`). Tailwind: `font-heading`; базово для `h1`–`h6`, `CardTitle`, класс `.selection-flow-heading`.
- **Воронка выбора (боковая вертикальная подпись):** `SegoeUISelectionSidebar` в `index.css` — тот же semibold из `/fonts/seui/`.
