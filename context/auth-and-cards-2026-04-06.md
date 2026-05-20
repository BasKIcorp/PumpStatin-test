# 2026-04-06

- **Вход в ЛК по email:** `authenticate_username_or_email` в `api/pumpapp/auth_login.py`; используется в `login_view` и `admin_login`. `ensureappadmin` выставляет `email` (по умолчанию `{APP_ADMIN_USERNAME}@local.admin`, или `APP_ADMIN_EMAIL`).
- **Демо 159.194.215.53:** после правок задеплоены файлы API + фронта, `ensureappadmin` выполнен, `systemctl restart pumpstations-api` / `pumpstations-frontend`, сборка `npm run build` в `/opt/pumpstations/frontend`. hm-cards и pump-types PNG на сервере присутствуют.
- **Карточки воронки:** `SelectionMockupCard` — квадратная витрина через `aspect-ratio: 1` и `absolute inset-2`; в `PumpTypeSelector` / `HydromoduleLineSelector` у img `max-h-full max-w-full object-contain`.
- **Логин, бренд-панель:** вместо `background-image` + `flexShrink: 0` — `<img>` с `object-contain`, у колонки `min-w-0 shrink grow-0 basis-[67.2%]`, корень `overflow-x-hidden`, чтобы SVG уменьшался при сужении окна.
- **TDZ-ошибка фронта (2026-04-06):** `Cannot access 'lastParams' before initialization` — `useState` для `lastParams` в `Home.tsx` объявлялся после `useCallback`, который включал `lastParams` в массив зависимостей. Исправлено переносом объявления выше (строка ~321). Сборка с `minify: false` помогла определить реальное имя переменной (в минифицированном бандле это было `ne`).

## Проверка 159.194.215.53 (картинки, 2026-04-06)

- `GET /api/appearance`: `logo_url` указывает на `http://159.194.215.53/media/appearance/kentatsu_4o83Arp.png`; все `hydromodule_card_urls` — `null`.
- `HEAD/GET /media/appearance/kentatsu_4o83Arp.png` и несуществующий `/media/nonexistent.png` — **HTTP 500**, тело — стандартная HTML-страница Django «Server Error (500)»; ответ идёт через nginx + Express (`X-Powered-By: Express`).
- `HEAD /assets/pump-types/COMOS.png` — **HTTP 200** (статика из сборки фронта отдаётся).
- Главная: карточки «Гидромодули» / «Насосные установки» в `ProductCategorySelector.tsx` используют белый плейсхолдер (`<div className="h-full w-full bg-white" />`), а не URL изображений.

