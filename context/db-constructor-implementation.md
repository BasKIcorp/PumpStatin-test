# Конструктор БД (реализация)

- **Модель:** `pumpapp.ExtSchemaProject` (`pumpapp_extschemaproject`), поле `blueprint` JSON, `revision` для optimistic locking.
- **PostgreSQL:** схема `ext` создаётся миграцией `0027_extschemaproject_and_ext_schema`.
- **API префикс:** `/api/admin/ext-design/` — `core-snapshot`, `catalog`, CRUD `projects`, `projects/{id}/duplicate|apply|merge-core|export-core-draft`, DDL `ext/table`, `ext/foreign-key`, `ext/constraint/{table}`.
- **Данные ext:** `/api/admin/ext-data/tables`, `/{table}`, `/{table}/create`, `/{table}/{pk}`; опционально `_file_ref_columns` для проверки путей в каталоге Drawings.
- **Фронт:** вкладка «Конструктор БД» (`db-constructor`), компонент `AdminDbConstructor`; в «Данные БД» схема `ext` и поле колонок file ref.

**Админка «Данные БД»:** только схема `ext`. Перенос legacy-строк → `ext.dj_*` через API админки.
