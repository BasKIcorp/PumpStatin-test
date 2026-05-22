# Права доступа к БД в админ-панели

## Текущая политика (2026-05)

- **UI:** все вкладки админки в `/account` доступны любому вошедшему пользователю (`role` не проверяется).
- **Редактирование таблиц:** в UI всегда разрешено (`tableEditable = true`), флаг `editable` с API игнорируется.
- **Презентация:** раздел «Дизайн» и layout в White-Label снова видны (`ADMIN_PRESENTATION.hideDesignSection = false`).
- **SQLite API:** `sqlite-public-data.ts` — `GET/POST/PUT/DELETE` для `pumps`, `users`, `app_settings`; каталог `ext-design`/`public-design`; заглушки stats/email/all-selections.
- **Проверка admin на сервере снята** для `/api/admin/*` в `sqlite-routes.ts` (кроме логики «не удалить себя»).

## Таблицы SQLite в «Данные БД»

| Таблица | Описание |
|---------|----------|
| `pumps` | Насосы (nasos_type, payload JSON) |
| `users` | Пользователи (без password_hash в ответах) |
| `app_settings` | JSON-настройки (appearance, form_config, …) |

## Внешний Django

При `BACKEND_API_URL` прокси отдаёт полный набор таблиц public; ограничения staff/editable снова на стороне Django.
