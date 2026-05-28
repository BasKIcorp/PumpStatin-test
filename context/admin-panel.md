# Админ-панель

URL: http://83.222.16.200/admin

## Вход

- Логин: `admin`
- Пароль: `demo123`
- Роль: `admin` в `config/accounts/users.yaml`

Обычные демо-пользователи (`strela`, `acme`, …) в быстрый вход не попадают с ролью admin.

## Разделы

| Путь | Назначение |
|------|------------|
| `/admin` | Обзор: плагины, среда |
| `/admin/users` | CRUD пользователей → `users.yaml` |
| `/admin/profiles` | Алгоритм, БД, тема, PDF, layout, брендинг JSON |
| `/admin/database` | Насосы и справочники (только при `USE_MOCK_DB=false`) |

## API

Префикс: `GET/POST/PUT/DELETE /api/v1/admin/*` — требуется JWT и `role: admin`.

## Ограничения MVP

- HTML-шаблоны PDF редактируются в `apps/api/app/pdf/templates/`
- `USE_MOCK_DB=true` — раздел БД только для чтения (подсказка включить Postgres)
- Изменения профилей пишутся в `config/profiles/` на диске сервера
