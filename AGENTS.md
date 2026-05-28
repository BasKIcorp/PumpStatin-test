# Инструкции для AI и редакторов (Cursor)

## О проекте

Подбор насосных станций: многошаговый визард (фронт) + алгоритм, БД, PDF (бэкенд).
Референс UI: http://159.194.215.53/

## Где безопасно править (без опыта программирования)

| Путь | Что менять |
|------|------------|
| `config/profiles/*/profile.yaml` | Какой алгоритм, БД, PDF, тема |
| `config/profiles/*/branding.yaml` | Тексты, цвета, логотип |
| `config/profiles/*/wizard/` | Шаги визарда, поля формы, подписи кнопок |
| `context/` | Заметки: хосты, доступы, договорённости |
| `conductor/product.md` | Описание продукта для AI |

## Где править осторожно (нужен разработчик)

| Путь | Зачем |
|------|--------|
| `apps/api/app/algorithms/` | Логика подбора |
| `apps/api/app/db/adapters/` | Подключение к реальной БД |
| `apps/api/app/pdf/templates/` | Вёрстка PDF |
| `apps/web/src/` | Новые типы экранов, не описанные в YAML |
| `packages/theme-*/` | Глубокая смена внешнего вида |

## Демо-аккаунты (внешний вид по логину)

| Логин | Пароль | Профиль / тема |
|-------|--------|----------------|
| strela | demo123 | default / Стрела |
| acme | demo123 | acme-industrial |
| nord | demo123 | nord-minimal |
| aqua | demo123 | aqua-pro |

## Как добавить нового заказчика

1. `config/profiles/default` → копия с новым именем
2. В `profile.yaml`: согласованная пара `theme` + `pdfTemplate` (см. `_registry.yaml`)
3. Запись в `config/accounts/users.yaml` с `profileId`
4. При необходимости новый пакет `packages/theme-*` и PDF в `apps/api/app/pdf/templates/`

## Как добавить поле в форму подбора

Откройте `config/profiles/.../wizard/flows/*.yaml`, скопируйте блок `- id: ...` в нужную `section` или `options`.

## Команды (PowerShell, из корня репозитория)

```powershell
pnpm install
pnpm dev:api    # API :8000
pnpm dev:web    # UI :5173
```

## Язык

- Коммиты: английский
- UI и конфиги для пользователей: русский

## Подробная архитектура

`docs/ARCHITECTURE.md`
