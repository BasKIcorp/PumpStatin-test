# Frontend (PumpStatin)

React + Vite + Express. Подбор насосного оборудования, личный кабинет, админ-панель.

## Локально

```bash
npm install
npm run dev
```

Порт **5000**. Запросы `/api` и `/media` проксируются на backend (`BACKEND_API_URL`, по умолчанию `http://127.0.0.1:8000`).

## Production

```bash
npm ci
npm run build
NODE_ENV=production npx tsx server/index.ts
```

Статика после сборки: `dist/public/`.

## Воронка подбора

- **Этап 1:** выбор класса продукции (одна страница карточек).
- **Этап 2:** параметры, графики, конфигурация станции (`Home.tsx`, `flowStep === "work"`).
