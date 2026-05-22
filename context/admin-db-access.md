# Права доступа к БД и админ-панели

## Постоянная политика

Файл **`frontend/shared/admin-access-policy.ts`**:

- `OPEN_ADMIN_AND_DB_ACCESS = true` — не отключать без явного решения продукта.
- Все пользователи в API получают `role: "admin"` (`effectiveUserRole`).
- Новые пользователи создаются с ролью `admin` (`defaultNewUserRole`).
- При старте SQLite все записи `users.role` обновляются на `admin`.

Клиент: **`frontend/client/src/config/adminAccessPolicy.ts`** — `canAccessAdminPanel`, `canUseAdminOnlyFeatures`, `isPublicDataTableEditable`.

## UI

- Вкладки «Администрирование» и «База данных» видны всем вошедшим в `/account`.
- Все разделы меню админки включены (игнорируется `ADMIN_PRESENTATION.hide*`).
- Таблицы public-data всегда редактируемы в UI.

## SQLite API — актуальная схема

- `sqlite-schema-introspect.ts` — живой список таблиц/колонок/FK из `app.sqlite`.
- `sqlite-public-data.ts` — public-data, public-design/catalog, ext-design/catalog и виртуальный проект схемы.
- Таблицы в админке (в т.ч. `sessions`) подтягиваются автоматически, без захардкоженного списка.

`sqlite-routes.ts`: нет `requireAdmin`.

## Деплой и сохранение данных

- `deploy-app.sh` **не** запускает `db:seed`, если `data/app.sqlite` уже есть — правки в БД не сбрасываются при пуше.
- `seed.ts` при существующей `appearance` **не** перезаписывает `app_settings`, только добавляет демо-насосы, если таблица `pumps` пуста.
- Таблица `app_settings` (ключ `appearance`, `form_config`): PK — строка `key`; сохранение через blur в админке.

## Отключение (только осознанно)

1. `OPEN_ADMIN_AND_DB_ACCESS = false` в `shared/admin-access-policy.ts`
2. Вернуть проверки `role === "admin"` в UI (см. git history)
3. При Django — настроить `is_staff` на бэкенде
