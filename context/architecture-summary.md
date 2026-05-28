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

`USE_MOCK_DB=true` в `.env` — без Postgres, каталог насосов из mock-адаптера.

## Postgres

`USE_MOCK_DB=false` + `docker compose up` — таблицы и seed при старте API.
