# Пользователи и этапы подбора (SQLite MVP)

## Двухэтапная воронка

1. **Выбор из карточек** (`flowStep: cards`) — класс продукции, индикатор «Этап 1».
2. **Ввод параметров** (`flowStep: parameters`) — формы Q/H, кривые, конфигурация станции; состав полей без изменений.

Компонент: `client/src/components/selection/SelectionStageProgress.tsx`.

## Учётные записи (SQLite)

Таблицы: `users`, `sessions` (cookie `ps_session`, 30 дней).

### Учётная запись по умолчанию (после `npm run db:seed`)

| Поле | Значение |
|------|----------|
| Email | `admin@strela.local` |
| Пароль | `admin12345` |
| Роль | `admin` |

### API

- `POST /api/auth/login/`, `register/`, `logout/`, `GET /api/auth/user/`
- `GET /api/admin/users`, `POST /api/admin/users/create`, `PATCH/DELETE /api/admin/users/:id`, `POST .../set-password`
- `POST /api/admin/login/`, `GET /api/admin/whoami/` (отдельная форма `/admin`)

Управление пользователями: кабинет → **Администрирование → Пользователи → Список** (вкладка `users` в `AppAdmin`).

### Пересоздать admin после обновления схемы

```powershell
cd c:\projects\PumpStatin_test\frontend
npm run db:seed -- --force
```
