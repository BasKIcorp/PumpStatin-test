# Кратко: архитектура

## 4 демо-профиля

default (Стрела), acme-industrial, nord-minimal, aqua-pro — см. `config/profiles/_registry.yaml`.

## Аккаунт → UI + PDF

`config/accounts/users.yaml` → `profileId` → theme + pdfTemplate + layoutVariant + wizard.

## API auth

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/session` (Bearer token)
- `GET /api/v1/auth/demo-accounts`

## Локальная разработка

По умолчанию **SQLite** (`data/pumpstation.db`), `USE_MOCK_DB=false` — таблицы и seed при старте API.

`USE_MOCK_DB=true` — только in-memory mock для подбора; кабинет и история не работают.

## Postgres (продакшен / docker)

`USE_MOCK_DB=false` + `docker compose up` — таблицы и seed при старте API.
