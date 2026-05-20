# Frontend (ветка demo)

**Источник:** https://github.com/BasKIcorp/PumpStations — ветка `demo`  
**Репозиторий:** https://github.com/BasKIcorp/PumpStatin-test

## Воронка подбора

1. **Этап 1** — одна страница выбора класса продукции (`ProductCategorySelector`), затем переход на work с дефолтами (линейка ГМ, BPS-W + хоз-пит, CIVOS для Simpel).
2. **Этап 2** — экран параметров (`flowStep === "work"`) без изменений.

## Структура

- `frontend/client/` — React + Vite UI
- `frontend/server/` — Node dev/prod, прокси `/api/*`
- `frontend/client/src/pages/AppAdmin.tsx` — админ-панель
- `run-frontend.ps1`, `deploy/`

## База данных

- **SQLite** (`better-sqlite3` + Drizzle), путь: `SQLITE_PATH` (по умолчанию `frontend/data/app.sqlite`)
- Сиды: `npm run db:seed` — appearance, form-config, демо-насосы
- `USE_SQLITE=true` (по умолчанию) — локальные ручки `/api/appearance`, `/api/form-config`, `/api/get_matching_pumps`, `/api/get_station_result`
- `BACKEND_API_URL` — если нужен внешний API вместо SQLite

## Переменные

- `USE_SQLITE`, `SQLITE_PATH`, `BACKEND_API_URL`
