# PumpStation Base

Заготовка платформы подбора насосных станций с **плагинной** архитектурой: разные темы, алгоритмы, БД и шаблоны PDF через конфигурацию профилей.

## Референс

UI-шаблон: [159.194.215.53](http://159.194.215.53/) (продукт «Стрела»).

## Структура

- `config/profiles/` — профили клиентов (основная зона правок)
- `apps/web` — React + Vite, визард по YAML
- `apps/api` — FastAPI, реестр плагинов
- `packages/` — контракты API, темы, схемы
- `docs/ARCHITECTURE.md` — полное описание архитектуры

## Быстрый старт

```powershell
pnpm install
cd apps/api; uv sync   # или: pip install -e .
# из корня:
pnpm dev:api
pnpm dev:web
```

Откройте http://localhost:5173 (прокси `/api` → :8000).

## Демо-вход (разный внешний вид)

| Логин | Пароль | Оформление |
|-------|--------|------------|
| strela | demo123 | Стрела (синий sidebar) |
| acme | demo123 | ACME Industrial (тёмный) |
| nord | demo123 | Nord Minimal (светлый) |
| aqua | demo123 | Aqua Pro (градиент) |

## Профили

`config/profiles/` — 4 примера; пары theme + PDF в `_registry.yaml`.

## Для редакторов без кода

См. **AGENTS.md** — какие папки можно менять в Cursor.

## Docker

```powershell
docker compose up --build
```
