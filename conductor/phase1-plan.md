# Phase 1 — Infrastructure (актуализировано под код)

**Цель:** Перевести статический сайт на конфиг. Сделать базовый интерфейс в админке.

---

## Состояние проекта (по факту)

| Характеристика | Факт |
|---|---|
| Сайт | Только визард (4 роута: `/`, `/login`, `/cabinet`, `/admin/*`) |
| Админка | Часть того же SPA: `AdminApp.tsx` с `Router base="/admin"` |
| Конфиг | `GET /api/v1/auth/session` → `{ profile, branding, wizard }` |
| Профили | `config/profiles/{id}/` — yaml-файлы, читаются через `config_store.py` |
| Фронт стартует | `main.tsx` → `App.tsx` → Switch по роутам |
| Данные на фронте | `ProfileProvider` → загружает сессию, `useProfile()` везде |
| Брендинг | `branding.yaml` → CSS-переменные через `ThemeProvider` |
| Git | `origin https://github.com/BasKIcorp/PumpStatin-test.git`, branch `base` |

---

## Задачи

### T1 — Схема site.yaml + TypeScript типы

**Что сделать:**
- Создать файл `packages/contracts/src/site.ts` с типами: `SiteConfig`, `Page`, `Block`, `Layout`, `Menu`, `Footer`
- Создать Pydantic модели `apps/api/app/schemas/site.py`
- Создать JSON Schema `apps/api/app/schemas/site-schema.json`

**Конкретные типы:**
```typescript
// packages/contracts/src/site.ts
export interface SiteConfig {
  layout: LayoutConfig;
  pages: PageConfig[];
}

export interface LayoutConfig {
  header: HeaderConfig;
  footer: FooterConfig;
}

export interface HeaderConfig {
  logo: { src: string; width: number; link: string };
  menu: MenuItem[];
  loginButton: boolean;
}

export interface MenuItem {
  label: string;
  pageId: string;   // ссылка на страницу
}

export interface FooterConfig {
  columns: FooterColumn[];
  copyright: string;
}

export interface FooterColumn {
  title: string;
  links: { label: string; pageId: string }[];
}

export interface PageConfig {
  id: string;
  title: string;
  route: string;
  inMenu: boolean;
  type?: 'page' | 'wizard';  // 'wizard' — запускает WizardEngine
  blocks?: BlockConfig[];
  wizardRef?: string;         // если type=wizard, ссылка на navigation.yaml
}

export interface BlockConfig {
  id: string;
  type: string;         // регистрируется в BlockRegistry
  props: Record<string, unknown>;
}

export interface BlockProps {
  block: BlockConfig;
  profile: ProfileBundle;
}
```

**Готово, когда:**
- `packages/contracts/src/site.ts` компилируется (`tsc`)
- Pydantic модели валидируют YAML
- JSON Schema готова

---

### T2 — API: чтение/запись site.yaml

**Что сделать:**
- Добавить в `apps/api/app/services/config_store.py` функции:
  - `load_site_yaml(profile_id) → dict`
  - `save_site_yaml(profile_id, data) → None`
- Создать `apps/api/app/api/routes/admin_site.py` с эндпоинтами:
  - `GET /api/v1/admin/profiles/{profile_id}/site`
  - `PUT /api/v1/admin/profiles/{profile_id}/site`
  - `GET /api/v1/admin/profiles/{profile_id}/preview` — полный конфиг (profile + branding + wizard + site)
  - `GET /api/v1/admin/blocks/registry` — список зарегистрированных типов блоков
- Подключить роутер в `main.py` (или в `admin/__init__.py`)

**Где:**
- Новые функции в `apps/api/app/services/config_store.py`
- Новый файл `apps/api/app/api/routes/admin_site.py`
- `main.py` — `app.include_router(admin_site.router, prefix="/api/v1/admin")`

**config_store.py — добавить:**
```python
SITE_FILENAME = "site.yaml"

def load_site_yaml(profile_id: str) -> dict[str, Any]:
    path = PROFILES_DIR / profile_id / SITE_FILENAME
    if not path.is_file():
        # Дефолтный site.yaml, если файла нет
        return get_default_site(profile_id)
    return load_yaml(path)

def save_site_yaml(profile_id: str, data: dict[str, Any]) -> None:
    save_yaml(PROFILES_DIR / profile_id / SITE_FILENAME, data)
```

**Готово, когда:**
- `curl GET /api/v1/admin/profiles/default/site` возвращает JSON с дефолтной структурой
- `curl PUT ...` c телом записывает файл
- Превью-эндпоинт отдаёт `{ profile, branding, wizard, site }`

---

### T3 — Регистр блоков на фронте + 3 базовых блока

**Что сделать:**
- Создать `apps/web/src/engine/BlockRegistry.ts` — `Record<string, React.ComponentType<BlockProps>>`
- Создать 3 блока:
  - `apps/web/src/blocks/HeroBlock.tsx` — заголовок + подзаголовок + CTA-кнопка
  - `apps/web/src/blocks/RichTextBlock.tsx` — markdown/html контент
  - `apps/web/src/blocks/CardGridBlock.tsx` — сетка карточек
  - `apps/web/src/blocks/WizardBlock.tsx` — обёртка над `WizardEngine`

**Интерфейс `BlockProps`:**
```typescript
// apps/web/src/engine/BlockRegistry.ts
import type { BlockConfig, ProfileBundle } from "@pumpstation/contracts";

export interface BlockProps {
  block: BlockConfig;
  profile: ProfileBundle;
}

export type BlockComponent = React.ComponentType<BlockProps>;

export const BLOCK_REGISTRY: Record<string, BlockComponent> = {
  hero: HeroBlock,
  "rich-text": RichTextBlock,
  "card-grid": CardGridBlock,
  wizard: WizardBlock,
};
```

**WizardBlock.tsx — ключевой:**
```tsx
// Оборачивает существующий WizardEngine, беря wizardRef из конфига страницы
export function WizardBlock({ block, profile }: BlockProps) {
  // WizardEngine уже читает profile.wizard.navigation — работает как есть
  return  (
    <div className="wizard-container">
      <WizardEngine />
    </div>
  );
}
```

**Готово, когда:**
- Каждый блок рендерится с `block.props`
- `WizardBlock` показывает существующий визард
- `BLOCK_REGISTRY` экспортируется и типизирована

---

### T4 — PageRenderer + LayoutEngine

**Что сделать:**
- Создать `apps/web/src/engine/PageRenderer.tsx`:
  - Принимает `siteConfig: SiteConfig` и `profile: ProfileBundle`
  - Рендерит `SiteLayout` (header + footer из siteConfig.layout)
  - Для каждой страницы рендерит `page.blocks` через `BLOCK_REGISTRY`
- Создать `apps/web/src/engine/SiteHeader.tsx`:
  - Логотип из `layout.header.logo`
  - Меню из `layout.header.menu` — ссылки на `page.route` через Wouter `Link`
  - Кнопка «Войти» / имя пользователя
- Создать `apps/web/src/engine/SiteFooter.tsx`:
  - Колонки из `layout.footer.columns`
  - Копирайт
- Модифицировать `apps/web/src/App.tsx`:
  - Загружать `site.yaml` при старте
  - Генерировать роуты динамически из `siteConfig.pages`
  - Для страниц с `type: wizard` — рендерить `WizardBlock`
  - Для обычных страниц — рендерить `PageRenderer`

**Изменения в App.tsx:**
```tsx
import { useState, useEffect } from "react";
import { Route, Router, Switch } from "wouter";
// ...
import { fetchSiteConfig } from "@/api/config";  // новый

export default function App() {
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);

  useEffect(() => {
    fetchSiteConfig().then(setSiteConfig);
  }, []);

  if (!siteConfig) return <div>Загрузка...</div>;

  return (
    <Switch>
      <Route path={ADMIN_PATH_PATTERN}>
        <AdminApp />
      </Route>
      <Route path="/login" component={StrelaLoginPage} />
      <Route path="/cabinet">...</Route>
      {/* Динамические роуты из site.yaml */}
      {siteConfig.pages.map(page => (
        <Route key={page.id} path={page.route}>
          <RequireAuth>
            <ProfileProvider>
              {page.type === 'wizard' ? (
                <AppShell><WizardBlock ... /></AppShell>
              ) : (
                <AppShell><PageRenderer page={page} site={siteConfig} /></AppShell>
              )}
            </ProfileProvider>
          </RequireAuth>
        </Route>
      ))}
    </Switch>
  );
}
```

**Готово, когда:**
- Главная страница (или любая page-страница) рендерится из site.yaml
- Меню и подвал соответствуют конфигу
- Визард продолжает работать (WizardBlock)
- Роуты генерируются динамически

---

### T5 — API: эндпоинт site для фронта

**Что сделать:**
- Дополнить `GET /api/v1/auth/session` — добавить поле `site` (вызов `load_site_yaml`)
- ИЛИ создать новый эндпоинт `GET /api/v1/config/site`
- На фронте: создать `api/config.ts` → `fetchSiteConfig()` вызывает один из эндпоинтов

**Где править:**
- `apps/api/app/api/routes/auth.py` — `session()` — добавить `site: load_site_yaml(profile_id)`
- ИЛИ `apps/api/app/api/routes/config.py` — добавить `GET /site`
- `apps/api/app/core/profile_loader.py` — `load_profile_bundle()` — добавить `site` в возврат
- `apps/web/src/api/config.ts` — добавить `SiteConfig` в `ProfileBundle`

**Готово, когда:**
- `GET /api/v1/auth/session` возвращает `site` в ответе
- Фронт может прочитать site.yaml
- При отсутствии site.yaml — дефолтная структура

---

### T6 — Admin Studio UI: роут + оболочка

**Что сделать:**
- Добавить роут `/admin/profiles/:profileId` в `AdminApp.tsx`
- Создать `apps/web/src/pages/admin/AdminProfileStudio.tsx`:
  - Загружает профиль через `fetchAdminProfileDetail(profileId)` + `fetchAdminSite(profileId)`
  - Показывает 5 вкладок: Стили | Страницы | Layout | Визард | PDF
  - Левая панель — переключение вкладок
  - Правая панель — заглушка Properties
  - Центр — сообщение «Выберите страницу»
- Создать компонент студии: `apps/web/src/routes/admin/studio/StudioShell.tsx`
- Создать `apps/web/src/routes/admin/studio/TabNav.tsx`

**Изменения в AdminApp.tsx:**
```tsx
import { AdminProfileStudio } from "@/pages/admin/AdminProfileStudio";

function AdminRoutes() {
  return (
    <Switch>
      <Route path="/users" component={AdminUsersPage} />
      <Route path="/profiles" component={AdminProfilesPage} />
      <Route path="/profiles/:profileId" component={AdminProfileStudio} />  {/* НОВОЕ */}
      <Route path="/database" component={AdminDatabasePage} />
      <Route path="/" component={AdminDashboardPage} />
      <Route component={AdminDashboardPage} />
    </Switch>
  );
}
```

**Обновить AdminLayout.tsx — подсветка навигации:**
```tsx
const NAV = [
  { href: "/", label: "Обзор", end: true },
  { href: "/users", label: "Пользователи" },
  { href: "/profiles", label: "Профили и фронт" },
  { href: "/database", label: "База данных" },
];
// Пути /profiles/{id} тоже подсвечивают "Профили"
const active = item.end
  ? path === "/" || path === ""
  : path === item.href || path.startsWith(`${item.href}/`);
```

**Готово, когда:**
- Переход по `/admin/profiles/strela` открывает студию
- Вкладки переключаются
- Профиль и site загружаются с API

---

### T7 — Admin Studio: вкладка «Страницы» (form-based)

**Что сделать:**
- Создать `apps/web/src/routes/admin/studio/pages/PageList.tsx`:
  - Список страниц из site.yaml
  - Выбор страницы → показывает её блоки
  - Добавление/удаление страницы
- Создать `apps/web/src/routes/admin/studio/pages/BlockEditor.tsx`:
  - Для выбранного блока: выбор типа из dropdown, редактирование props
  - Тип выбирается из `BLOCK_REGISTRY` (все ключи)
  - Для HeroBlock props: heading, subheading, cta.label, background
- Drag-to-reorder кнопками (↑ ↓), позже — drag & drop
- Сохранение → `PUT /api/v1/admin/profiles/{profileId}/site`

**Структура редактора:**
```
[Страницы]
  ├── [+] Новая страница
  ├── [Главная]            ← активна
  │     └── hero           ← выбран
  │           type: hero
  │           props: { heading, subheading, ... }
  │     └── features
  ├── [Каталог]
  ├── [Подбор]
  │     type: wizard
  │     wizardRef: navigation.yaml
  └── [Контакты]

Properties (справа) — для выбранного блока:
  ┌──────────────────────┐
  │ Тип:  [hero     ▼]   │
  │ ── КОНТЕНТ ──        │
  │ Заголовок: [_____]   │
  │ Подзагол:  [_____]   │
  │ Текст CTA: [_____]   │
  │ ── СТИЛИ ──          │
  │ Фон: [color picker]   │
  └──────────────────────┘
```

**Готово, когда:**
- Можно создать страницу, добавить на неё блоки
- Выбрать HeroBlock, заполнить поля → сохранить
- Фронт перерисовывается после сохранения

---

### T8 — Admin Studio: вкладка «Стили» (form-based)

**Что сделать:**
- Создать `apps/web/src/routes/admin/studio/theme/ThemeEditor.tsx`:
  - Color picker для: primary, accent, background, surface, text
  - Dropdown для шрифтов (Open Sans, Segoe UI, Caveat)
  - Upload логотипа (fetch POST /api/v1/admin/upload)
  - Выбор layout-варианта (strela-funnel, sidebar-brand, topbar-dark, minimal-light, sidebar-gradient)
- Сохранение → `PUT /api/v1/admin/profiles/{profileId}/branding`
- После сохранения — тему можно перезагрузить (или показать сообщение)

**Зависимости:**
- Нужен эндпоинт загрузки файлов: `POST /api/v1/admin/upload` — сохраняет в `apps/web/public/` или `config/profiles/{id}/assets/`

**Готово, когда:**
- Можно менять цвета через color picker
- layout-вариант переключается через dropdown
- После Save — данные пишутся в branding.yaml

---

### T9 — Admin Studio: вкладка «Layout» (form-based)

**Что сделать:**
- Создать `apps/web/src/routes/admin/studio/layout/MenuEditor.tsx`:
  - Список пунктов меню (label + pageId)
  - Добавление/удаление пункта
  - Ссылка выбирается из существующих страниц
- Создать `apps/web/src/routes/admin/studio/layout/FooterEditor.tsx`:
  - Колонки: заголовок + список ссылок
  - Текстовое поле для копирайта
- Сохранение → в `site.yaml` (тот же `PUT /api/v1/admin/profiles/{profileId}/site`)

**Готово, когда:**
- Меню редактируется
- Подвал редактируется
- После Save — layout обновляется

---

### T10 — Admin Studio: вкладки «Визард» и «PDF» (заглушки)

**Что сделать:**
- `apps/web/src/routes/admin/studio/wizard/WizardEditorShell.tsx`:
  - Показывает список шагов из `wizard.navigation`
  - Ссылка «Редактировать шаги» → пока редиректит на `/admin/profiles` (старый редактор)
- `apps/web/src/routes/admin/studio/pdf/PdfPlaceholder.tsx`:
  - Заглушка: «Конструктор PDF появится в Phase 3»

**Готово, когда:**
- Вкладки переключаются, не падают с ошибкой
- Пользователь не может сломать визард/PDF через эти вкладки

---

## Порядок выполнения

```
T1 (схемы site.ts + Pydantic)
 │
 ├──→ T2 (API site.yaml + admin endpoints)
 │         │
 │         └──→ T5 (добавить site в session API)
 │
 └──→ T3 (BlockRegistry + 3 блока)
           │
           └──→ T4 (PageRenderer + LayoutEngine + App.tsx)
                     │
                     └──→ T6 (Admin Studio shell: роут + вкладки)
                               │
                               ├──→ T7 (вкладка Страницы)
                               ├──→ T8 (вкладка Стили)
                               ├──→ T9 (вкладка Layout)
                               └──→ T10 (Визард/PDF заглушки)
```

---

## Изменяемые файлы (сводка)

### Бэкенд (Python)

| Файл | Что делаем |
|------|-----------|
| `apps/api/app/services/config_store.py` | + `load_site_yaml`, `save_site_yaml`, `get_default_site` |
| `apps/api/app/api/routes/admin_site.py` | **NEW** — эндпоинты site, preview, blocks registry |
| `apps/api/app/main.py` | + `include_router(admin_site.router)` |
| `apps/api/app/core/profile_loader.py` | + `site` в `load_profile_bundle` |
| `apps/api/app/api/routes/auth.py` | + `site` в ответе `/session` |
| `apps/api/app/schemas/site.py` | **NEW** — Pydantic модели |
| `apps/api/app/schemas/site-schema.json` | **NEW** — JSON Schema |

### Фронтенд (TypeScript/React)

| Файл | Что делаем |
|------|-----------|
| `packages/contracts/src/site.ts` | **NEW** — типы SiteConfig, Page, Block, Layout |
| `apps/web/src/engine/BlockRegistry.ts` | **NEW** — регистр блоков |
| `apps/web/src/blocks/HeroBlock.tsx` | **NEW** — hero-блок |
| `apps/web/src/blocks/RichTextBlock.tsx` | **NEW** — rich text блок |
| `apps/web/src/blocks/CardGridBlock.tsx` | **NEW** — карточки |
| `apps/web/src/blocks/WizardBlock.tsx` | **NEW** — обёртка визарда |
| `apps/web/src/engine/PageRenderer.tsx` | **NEW** — рендер страниц |
| `apps/web/src/engine/SiteHeader.tsx` | **NEW** — шапка из конфига |
| `apps/web/src/engine/SiteFooter.tsx` | **NEW** — подвал из конфига |
| `apps/web/src/App.tsx` | Модифицировать — динамические роуты |
| `apps/web/src/api/config.ts` | + `fetchSiteConfig()` |
| `apps/web/src/pages/admin/AdminApp.tsx` | + роут `/profiles/:profileId` |
| `apps/web/src/pages/admin/AdminProfileStudio.tsx` | **NEW** — студия |
| `apps/web/src/routes/admin/studio/StudioShell.tsx` | **NEW** — layout студии |
| `apps/web/src/routes/admin/studio/TabNav.tsx` | **NEW** — вкладки |
| `apps/web/src/routes/admin/studio/pages/PageList.tsx` | **NEW** — список страниц |
| `apps/web/src/routes/admin/studio/pages/BlockEditor.tsx` | **NEW** — редактор блоков |
| `apps/web/src/routes/admin/studio/theme/ThemeEditor.tsx` | **NEW** — редактор стилей |
| `apps/web/src/routes/admin/studio/layout/MenuEditor.tsx` | **NEW** — редактор меню |
| `apps/web/src/routes/admin/studio/layout/FooterEditor.tsx` | **NEW** — редактор подвала |
| `apps/web/src/routes/admin/studio/wizard/WizardEditorShell.tsx` | **NEW** — заглушка |
| `apps/web/src/routes/admin/studio/pdf/PdfPlaceholder.tsx` | **NEW** — заглушка |

---

## Приёмка Phase 1

1. ✅ Сайт рендерится из `site.yaml`
2. ✅ 3 базовых блока работают (Hero, RichText, CardGrid)
3. ✅ Визард работает как блок `type: wizard`
4. ✅ `/admin/profiles/{id}` — студия с 5 вкладками
5. ✅ Вкладка «Страницы»: CRUD страниц + блоков
6. ✅ Вкладка «Стили»: цвета, шрифты, лого, layout
7. ✅ Вкладка «Layout»: меню, подвал
8. ✅ После Save → конфиг на диске → фронт подхватывает
9. ✅ Существующие функции (визард, логин, кабинет, админка) не сломаны
