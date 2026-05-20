# Frontend (ветка demo)

**Источник:** https://github.com/BasKIcorp/PumpStations — ветка `demo`  
**Дата копирования:** 2026-05-20  
**В workspace:** только `frontend/`, без Django `api/` и Python-бэкенда.

## Структура

- `frontend/client/` — React + Vite UI
- `frontend/server/` — dev/prod Node-сервер (Express), `npm run dev`
- `frontend/shared/` — общие типы/схемы
- `run-frontend.ps1` — установка зависимостей и `npm run dev` из корня
- `scripts/` — деплой статики (`upload-static-to-server.ps1`, `sync-selection-assets.ps1`)

## Админ-панель (React, внутри frontend)

Отдельного каталога нет — UI админки встроен в `frontend/client/`:

| Путь | Назначение |
|------|------------|
| `client/src/pages/AppAdmin.tsx` | Основной экран админки (~2000 строк) |
| `client/src/pages/Cabinet.tsx` | Встраивает `AppAdmin` для `user.role === "admin"` |
| `client/src/config/adminNav.ts` | Разделы: дашборд, пользователи, алгоритм, БД, дизайн, сайты |
| `client/src/config/adminPresentation.ts` | Флаги видимости разделов |
| `client/src/components/admin/*` | Вкладки: PDF, White-Label, конструктор БД, appearance, data-flow… |
| `client/src/lib/api.ts` | Клиент `/api/admin/*` (login, appearance, pdf-settings…) |
| `server/routes.ts` | Прокси `app.all('/api/admin/*')` → Django :8000 |

**Маршруты:** `/account` (кабинет + админ-вкладки для admin), редирект `/app-admin` → `/account`.

**Доступ:** пользователь с `role: "admin"` после логина; API админки на бэкенде Django (не скопирован).

## Запуск локально

```powershell
.\run-frontend.ps1
```

- Dev-сервер: http://127.0.0.1:5000 (см. `frontend/server`)
- Прокси API: `/api`, `/media` → `http://127.0.0.1:8000` (`vite.config.ts`, `DJANGO_API_URL` в `run-frontend.ps1`)
- Бэкенд Django нужен отдельно на порту 8000

## Сборка

```powershell
cd frontend
npm install
npm run build
```
