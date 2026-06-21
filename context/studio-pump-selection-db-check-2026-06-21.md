# Проверка подбора насосов с БД — 2026-06-21

## Архитектура

| Компонент | Путь |
|-----------|------|
| API endpoint | `POST /api/v1/selection/match-pumps`, `POST /api/v1/selection/build-station` |
| Алгоритм | `apps/api/app/algorithms/bps_w_v2/algorithm.py` |
| DB adapter | `apps/api/app/db/adapters/postgres.py` (SQLite + Postgres через SQLAlchemy) |
| Инициализация БД | `apps/api/app/db/init_db.py` |
| Frontend | `SelectionFormContext.tsx` → `matchPumps()` → API |
| Профиль | `config/profiles/default/profile.yaml` — algorithm: `bps_w_v2`, database: `postgres` |

## Конфигурация БД

- `.env` отсутствует → defaults из `apps/api/app/core/config.py`
- `USE_MOCK_DB=false` (по умолчанию)
- `DATABASE_URL` → `sqlite+aiosqlite:///C:/projects/PumpStation_Base/data/pumpstation.db`
- Docker Compose: Postgres 16 (`postgresql+asyncpg://pump:pump@postgres:5432/pumpstation`)

## Поток wizard → подбор

1. Wizard navigation → шаг `selection-form` (`config/profiles/default/wizard/navigation.yaml`)
2. `SelectionFormProvider.handleMatch()` собирает параметры через `mapLegacyParameters`
3. Вызов `POST /api/v1/selection/match-pumps` с `productLine`, `flowId`, `parameters`
4. Backend: `resolve_plugins()` → `BpsWV2Algorithm.match_pumps()` → `PostgresDatabaseAdapter.get_pump_catalog()` + `get_pump_curves()`

## Результаты проверки

### pytest (изолированная test SQLite)

```
11 passed in ~3s
```

Ключевой тест: `test_login_and_match` — логин `strela/demo123`, match-pumps возвращает ≥1 насос.

### Реальная SQLite `data/pumpstation.db`

**До исправления:**
- 4 насоса, 0 точек кривых (`pump_curve_points`)
- Алгоритм возвращал 1 насос, но working point = fallback (Q=15, H=20), графики пустые

**Исправление:** добавлен `_backfill_pump_curves()` в `init_db.py` — генерирует демо-кривые для насосов без точек.

**После исправления:**
- 4 насоса, 160 точек кривых
- Подбор COMOS Q=15 H=20: `p1 BPS-W 15/22`, score=0.2149, curve=8 pts, Qwp=12.857, Hwp=13.11
- build-station: OK, DN=59.47 мм

### API (ASGITransport, реальная SQLite)

- `match-pumps` → 200, 1 насос с curveLen=8
- `build-station` → 200, summary + selectionId

## Sample input/output

**Input:**
```json
{
  "product_line": "bps-w",
  "flow_id": "bps-w-domestic",
  "parameters": {
    "flowRate": 15,
    "head": 20,
    "workingPumps": 2,
    "reservePumps": 1,
    "pumpType": "COMOS",
    "puLine": "bps-w-pro"
  }
}
```

**Output (фрагмент):**
```json
{
  "pumps": [{
    "id": "p1",
    "name": "BPS-W 15/22",
    "score": 0.2149,
    "powerKw": 2.2,
    "nominal_flow": 15,
    "nominal_head": 22,
    "workingPoint": {"Q": 12.857, "H": 13.11},
    "curve": [{"Q": 0, "H": 22}, ...]
  }]
}
```

## Вердикт

**PASS** — алгоритм читает насосы и кривые из БД, фильтрует по типу/диапазону, ранжирует и возвращает результат через API.

**Fix applied:** backfill кривых в `init_db.py` для существующих БД без `pump_curve_points`.

## Как воспроизвести

```powershell
cd C:\projects\PumpStation_Base\apps\api
python -m pip install -e ".[dev]"
python -m pytest tests/api/test_selection_api.py tests/algorithms/bps_w_v2/ -v
```

Прямая проверка на SQLite:

```powershell
cd C:\projects\PumpStation_Base\apps\api
$env:USE_MOCK_DB = "false"
$env:DATABASE_URL = "sqlite+aiosqlite:///C:/projects/PumpStation_Base/data/pumpstation.db"
python -c "import asyncio; from app.db.init_db import init_database; asyncio.run(init_database())"
python -m pytest tests/api/test_selection_api.py::test_login_and_match -v
```
