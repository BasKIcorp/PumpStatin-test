# Профили клиентов

Каждая подпапка — отдельный заказчик или вариант продукта.

## Примеры в репозитории

| Профиль | Тема | PDF | Layout | Демо-логин |
|---------|------|-----|--------|------------|
| `default` | theme-strela | strela-standard | sidebar-brand | `strela` |
| `acme-industrial` | theme-acme | acme-datasheet | topbar-dark | `acme` |
| `nord-minimal` | theme-nord | nord-compact | minimal-light | `nord` |
| `aqua-pro` | theme-aqua | aqua-report | sidebar-gradient | `aqua` |

Пароль для всех демо: `demo123` (см. `config/accounts/users.yaml`).

**Важно:** `theme` и `pdfTemplate` — пара. Список пар в `_registry.yaml`. При несовпадении API вернёт ошибку при загрузке профиля.

## Новый клиент

1. Скопируйте `default/` → `имя-клиента/`
2. Укажите пару theme + pdf из `_registry.yaml` (или добавьте новую пару в код)
3. Добавьте пользователя в `config/accounts/users.yaml` с `profileId: имя-клиента`
4. Настройте `branding.yaml` и `wizard/`

## Аккаунт → внешний вид

Пользователь видит профиль из `users.yaml`, не из `APP_PROFILE_ID`.
`APP_PROFILE_ID` используется только для гостевого `/auth/session`.
