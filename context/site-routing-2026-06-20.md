# Роутинг сайта (2026-06-20)

## Изменения

- Визард подбора перенесён с `/` на `/wizard` во всех профилях (`config/profiles/*/site.yaml`).
- Корень `/` редиректит на стартовую страницу (`routing.landingPageId`, по умолчанию `home` → `/home`).
- В `site.yaml` добавлена секция:

```yaml
routing:
  landingPageId: home
```

## Редактор (Studio)

- **Визард** — правая панель «Маршрутизация» (`PageRoutingPanel`): маршрут, название, inMenu.
- **Страницы** — поле «Маршрут» в свойствах страницы + валидация дубликатов.
- **Стили и меню** — блок «Маршрутизация сайта» (`SiteRoutingEditor`): выбор landing page, таблица всех маршрутов.

## Хелперы (`@pumpstation/contracts`)

- `resolveLandingRoute(site)` — URL для редиректа с `/`
- `resolveWizardRoute(site)` — URL визарда
- `resolvePageRoute(site, pageId)` — URL по `pageId` (меню, footer)
- `validatePageRoute(site, pageId, route)` — проверка формата и уникальности

## Frontend

- `SiteConfigProvider` + хуки `useWizardRoute`, `useLandingRoute`, `usePageRoute`
- `App.tsx`: `<Redirect to={landingRoute} />` для `/`

## E2E

- `wizard.spec.ts`: `/` → `/home`, визард на `/wizard`
- `loginStrela`: ожидает `/home` или `/wizard` после входа

## Загрузка изображений карточек визарда

- API: `POST /api/v1/admin/profiles/{profileId}/media/upload` (multipart, admin)
- Файлы: `apps/web/public/selection-assets/uploads/{profileId}/`
- URL в конфиге: `/selection-assets/uploads/{profileId}/{filename}`
- UI: `ImageDropUpload` в правой панели редактора визарда (drag-and-drop + клик)
