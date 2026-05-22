# PumpStatin-test (frontend)

React + Vite + Node/Express. Репозиторий: https://github.com/BasKIcorp/PumpStatin-test

## Запуск локально

```powershell
.\run-frontend.ps1
```

- UI: http://127.0.0.1:5000
- API на **SQLite** (`USE_SQLITE=true`, файл `frontend/data/app.sqlite`)
- Опционально внешний backend: `BACKEND_API_URL` (если задан — прокси вместо SQLite)

## Production

http://83.222.16.200/ — автообновление при push в `master` (GitHub Actions).
