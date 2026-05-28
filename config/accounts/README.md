# Учётные записи

Файл `users.yaml` — демо-аккаунты для разработки.

- `profileId` определяет тему, визард, PDF и алгоритм
- В проде замените на таблицу `users` в PostgreSQL с полем `profile_id`

Добавление пользователя:

```yaml
  - username: newclient
    password: demo123
    displayName: Клиент Новый
    profileId: my-profile-folder-name
```

После входа фронтенд загружает `/api/v1/auth/session` с JWT и применяет профиль автоматически.
