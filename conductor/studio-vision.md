# PumpStation Studio — Vision v3

**Визуальный конструктор сайта и PDF внутри админ-панели `/admin`.**
Менеджер заходит в админку → выбирает профиль → редактирует **весь сайт** визуально.
Без переключения между приложениями.

---

## 1. Что меняется в админ-панели

### Было

```
/admin              ← обзор
/admin/users        ← CRUD пользователей
/admin/profiles     ← только JSON/YAML профилей
/admin/database     ← справочники (Postgres)
```

### Стало

```
/admin                      ← обзор (как есть)
/admin/users                ← CRUD пользователей (как есть)
/admin/profiles             ← список профилей (+ предпросмотр)
/admin/profiles/{id}        ← ! КОНСТРУКТОР САЙТА
│   ├── [Стили]              ← глобальные цвета, шрифты, лого
│   ├── [Страницы]           ← дерево страниц + блоки на canvas
│   ├── [Layout]             ← шапка, меню, подвал
│   └── [Визард]             ← шаги подбора (бывший профиль)
/admin/profiles/{id}/pdf     ← ! КОНСТРУКТОР PDF
/admin/database              ← справочники (как есть)
```

### Как попасть

```
/admin/profiles
┌──────────────────────────────────────────────┐
│ Профили                                     │
│                                              │
│ [default] Стрела — демо            ✎ [Открыть]│
│ [acme] ACME Industrial             ✎ [Открыть]│
│ [nord] Nord Minimal                ✎ [Открыть]│
│ [aqua] Aqua Pro                    ✎ [Открыть]│
│                                              │
│ [+ Новый профиль]                            │
└──────────────────────────────────────────────┘
```

Клик «Открыть» → `/admin/profiles/strela` → конструктор сайта.

---

## 2. Интерфейс конструктора (Figma-like, внутри админки)

```
┌─────────────────────────────────────────────────────────────────┐
│ ← /admin/profiles       Стрела — демо         [Save] [Publish]  │
├──────┬────────────────────────────────────────────────────┬─────┤
│      │                                                    │     │
│ Tabs │                                                    │     │
│ ┌───┐│              Canvas (превью)                        │     │
│ │Стил││  ┌──────────────────────────────────────────┐    │     │
│ │    ││  │  █████████████████████████████████████   │    │Prop.│
│ │Стра││  │  ██  ЛОГО                    [Войти]  ██ │    │     │
│ │ницы││  │  █████████████████████████████████████   │    │───  │
│ │    ││  │                                            │    │Стили│
│ │Layo││  │  ┌─────────────────────────────────┐     │    │     │
│ │ут  ││  │  │ Подбор насосного оборудования   │     │    │───  │
│ │    ││  │  │ Быстро и точно                  │     │    │Конт.│
│ │Виз.││  │  │        [Подобрать]              │     │    │     │
│ │ард ││  │  └─────────────────────────────────┘     │    │───  │
│ │    ││  │                                            │    │Дан. │
│ │PDF ││  │  ┌─────┐ ┌─────┐ ┌─────┐                  │    │     │
│ └───┘│   │  │     │ │     │ │     │                  │     │     │
│      │   │  │Широк.│ │Точн. │ │Готов.│                 │     │     │
│Слои  │   │  │выбор │ │расчёт│ │док-я │                 │     │     │
│───   │   │  └─────┘ └─────┘ └─────┘                  │     │     │
│Стра- │   │                                            │     │     │
│ницы: │   │  ┌──────────────────────────────────┐      │     │     │
│[Глав]│   │  │ О компании                       │      │     │     │
│[Кат.]│   │  │ Мы производим...                  │      │     │     │
│[Подб]│   │  │                                   │      │     │     │
│[О нас]│   │  └──────────────────────────────────┘      │     │     │
│[Конт]│   └──────────────────────────────────────────────┘     │
│[+Стр]│                                                    │     │
│      │         [Desktop ▼]  [100%]                         │     │
└──────┴────────────────────────────────────────────────────┴─────┘
```

### Навигация вкладками (левая панель)

| Вкладка | Что редактирует |
|---------|----------------|
| **Стили** | Глобальные цвета, шрифты, логотип, layout-вариант |
| **Страницы** | Список страниц, их блоки, контент, порядок в меню |
| **Layout** | Шапка (лого, меню, кнопки), подвал (колонки, ссылки, копирайт) |
| **Визард** | Шаги подбора, поля формы (текущий функционал) |
| **PDF** | A4-страница с блоками и data binding (отдельный роут или вкладка) |

### Canvas

Живое превью выбранной страницы профиля. Менеджер видит сайт **как он будет выглядеть** на десктопе / мобилке.

### Properties (правая панель)

Всегда три секции для выбранного элемента:

```
┌──────────────────────────────────┐
│ Блок: Hero                       │
│                                  │
│ ── СТИЛИ ──                      │
│ Фон:           [████  ▼]         │
│ Цвет текста:   [#fff  ■]         │
│ Высота:        [400px ▼]         │
│ Отступы:       [24px  ▒▒▒]       │
│                                  │
│ ── КОНТЕНТ ──                    │
│ Заголовок:    [Подбор насосов]   │
│ Подзаголовок: [Быстро и точно]   │
│ Текст кнопки: [Подобрать ▼]      │
│ Ссылка:       [/wizard]          │
│                                  │
│ ── ПОВЕДЕНИЕ ──                  │
│ Показать:     [всегда ▼]         │
│ Анимация:     [fade-in ▼]        │
└──────────────────────────────────┘
```

---

## 3. Техническая архитектура

### Фронт админки

Всё в React. Админ-панель — SPA (или часть основного фронта с роутингом `/admin/*`).

```
apps/web/
├── src/
│   ├── routes/
│   │   ├── admin/
│   │   │   ├── AdminLayout.tsx          ← layout админки
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard.tsx        ← /admin
│   │   │   │   ├── Users.tsx            ← /admin/users
│   │   │   │   ├── Database.tsx         ← /admin/database
│   │   │   │   └── Profiles/
│   │   │   │       ├── ProfileList.tsx              ← /admin/profiles
│   │   │   │       └── ProfileEditor.tsx            ← /admin/profiles/{id}
│   │   │   └── studio/                              ← ! НОВОЕ
│   │   │       ├── canvas/
│   │   │       │   ├── StudioCanvas.tsx    ← Figma-like canvas
│   │   │       │   ├── CanvasViewport.tsx  ← zoom/pan
│   │   │       │   ├── SelectionEngine.ts
│   │   │       │   └── DragEngine.ts
│   │   │       ├── palette/
│   │   │       │   └── BlockPalette.tsx    ← левая панель с блоками
│   │   │       ├── properties/
│   │   │       │   ├── PropertiesPanel.tsx ← правая панель
│   │   │       │   ├── StyleSection.tsx    ← СТИЛИ
│   │   │       │   ├── ContentSection.tsx  ← КОНТЕНТ
│   │   │       │   └── BehaviorSection.tsx ← ПОВЕДЕНИЕ
│   │   │       ├── site/
│   │   │       │   ├── SiteEditor.tsx      ← вкладка «Страницы»
│   │   │       │   ├── PageTree.tsx        ← дерево страниц
│   │   │       │   └── BlockLibrary.tsx    ← библиотека блоков
│   │   │       ├── theme/
│   │   │       │   └── ThemeEditor.tsx     ← вкладка «Стили»
│   │   │       ├── layout/
│   │   │       │   └── LayoutEditor.tsx    ← вкладка «Layout»
│   │   │       ├── wizard/
│   │   │       │   └── WizardEditor.tsx   ← вкладка «Визард»
│   │   │       └── pdf/
│   │   │           ├── PdfBuilder.tsx      ← вкладка «PDF»
│   │   │           └── PdfCanvas.tsx       ← A4 canvas
```

### Бэкенд

Новые эндпоинты в существующем FastAPI:

```
/api/v1/admin/
├── profiles/{id}/site          GET/PUT  → site.yaml
├── profiles/{id}/branding      GET/PUT  → branding.yaml
├── profiles/{id}/wizard        GET/PUT  → wizard/*
├── profiles/{id}/pages         GET/PUT  → список страниц
├── profiles/{id}/pages/{pageId} GET/PUT → блоки страницы
├── profiles/{id}/preview       GET      → полный конфиг для превью
├── profiles/{id}/pdf/template  GET/PUT  → pdf/template.json
├── profiles/{id}/pdf/preview   POST     → сгенерить PDF для превью
├── profiles/{id}/clone         POST     → копировать профиль
├── profiles/{id}/publish       POST     → git push → CI
└── blocks/registry             GET      → список доступных блоков
```

### Data flow

```
Браузер (админка)
  │
  │ PUT /api/v1/admin/profiles/strela/pages/home
  │     { blocks: [...] }
  ▼
FastAPI (apps/api)
  │
  │ Пишет на диск
  ▼
config/profiles/strela/site.yaml  ← обновлён
  │
  │ Следующий запрос к сайту
  ▼
apps/web (PageRenderer → читает site.yaml → рендерит обновлённую страницу)
```

### Canvas Engine

Встраивается прямо в React-компонент админки. Варианты:

| Вариант | Плюсы |
|---------|-------|
| **tldraw** (как компонент React) | Zoom/pan/selection/resize/drag из коробки |
| **react-moveable** | Только resize/drag, легче |

Скорее всего tldraw — ближе к Figma-подобному опыту.

---

## 4. Что хранится в site.yaml (новый конфиг)

```yaml
# config/profiles/default/site.yaml
layout:
  header:
    logo: { src: "/logo.svg", width: 180, link: "/" }
    menu:
      - label: "Главная"
        pageId: home
      - label: "Каталог"
        pageId: catalog
      - label: "Подбор"
        pageId: wizard
      - label: "О компании"
        pageId: about
      - label: "Контакты"
        pageId: contacts
    loginButton: true
  footer:
    columns:
      - title: "Продукция"
        links:
          - { label: "Насосные установки", pageId: catalog }
          - { label: "Гидромодули", pageId: catalog }
      - title: "Компания"
        links:
          - { label: "О нас", pageId: about }
          - { label: "Контакты", pageId: contacts }
    copyright: "© 2026 Стрела"

pages:
  - id: home
    title: "Главная"
    route: /
    inMenu: true
    blocks:
      - id: hero
        type: hero
        props:
          heading: "Подбор насосного оборудования"
          subheading: "Быстро и точно"
          background: "#1e4a8c"
          cta: { label: "Подобрать", pageId: wizard }
      - id: features
        type: card-grid
        props:
          columns: 3
          cards:
            - icon: settings
              title: "Широкий выбор"
              text: "Более 200 моделей"
            - icon: calculator
              title: "Точный расчёт"
              text: "Автоматический подбор"
            - icon: file-text
              title: "Готовая документация"
              text: "PDF за минуту"

  - id: catalog
    title: "Каталог"
    route: /catalog
    inMenu: true
    blocks:
      - id: grid
        type: product-grid
        props:
          filter: true
          columns: 4

  - id: wizard
    title: "Подбор"
    route: /wizard
    inMenu: true
    type: wizard
    wizardRef: navigation.yaml

  - id: about
    title: "О компании"
    route: /about
    inMenu: true
    blocks:
      - id: content
        type: rich-text
        props:
          content: "# О компании\nМы производим..."

  - id: contacts
    title: "Контакты"
    route: /contacts
    inMenu: true
    blocks:
      - id: form
        type: contact-form
      - id: map
        type: map
        props:
          lat: 55.75
          lng: 37.62
```

---

## 5. Фронтенд: PageRenderer (новый движок)

В основном фронте `apps/web` появляется модуль, который читает `site.yaml` и рендерит страницы:

```tsx
// apps/web/src/engine/PageRenderer.tsx
function PageRenderer({ page, profile }) {
  return (
    <SiteLayout layout={profile.site.layout}>
      {page.blocks.map(block => {
        const Component = BLOCK_REGISTRY[block.type];
        return <Component key={block.id} {...block.props} />;
      })}
    </SiteLayout>
  );
}
```

**Регистрация блоков:**

```tsx
// apps/web/src/engine/BlockRegistry.ts
export const BLOCK_REGISTRY = {
  hero: HeroBlock,
  "card-grid": CardGrid,
  "product-grid": ProductGrid,
  "rich-text": RichTextBlock,
  "contact-form": ContactFormBlock,
  map: MapBlock,
  wizard: WizardBlock,    // ← запускает WizardEngine
  "pump-table": PumpTableBlock,
  // ...
};
```

**Новый блок = новый React-компонент + регистрация в BlockRegistry.**

---

## 6. Этапы внедрения

### Phase 1 — Infrastructure (2 недели)

- Создать `site.yaml` schema + валидация
- Написать PageRenderer + BlockRegistry (3–4 блока: Hero, RichText, CardGrid, Wizard)
- Сделать Layout engine (header/footer из конфига)
- API: GET/PUT site.yaml

**Результат:** статика поехала — но хардкод сайта в React переехал в конфиг.

### Phase 2 — Studio UI в админке (4 недели)

- Страница `/admin/profiles/{id}` с вкладками
- Вкладка «Стили»: color pickers, font dropdown, logo upload
- Вкладка «Страницы»: дерево страниц, выбор блоков из Palette, Properties
- Вкладка «Layout»: редактирование меню, подвала
- Canvas engine (tldraw) — zoom/pan, живое превью
- Кнопка Save → PUT site.yaml

**Результат:** менеджер визуально собирает сайт в админке.

### Phase 3 — Полный набор блоков (3 недели)

- ProductGrid, ContactForm, MapBlock, Gallery, Accordion, Tabs, Image, Divider
- WizardEditor (вкладка «Визард»): drag-reorder шагов, inline-edit полей
- Каждый блок регистрируется в BlockRegistry + появляется в Palette

**Результат:** можно собрать полноценный сайт без кода.

### Phase 4 — PDF Builder (3 недели)

- Вкладка «PDF»: A4 canvas + drag-drop блоков
- Data binding + preview
- Сохранение в `pdf/template.json`

**Результат:** PDF собирается визуально.

### Phase 5 — Versioning + Publish (1-2 недели)

- Git snapshots при каждом Save
- История версий, rollback
- Кнопка Publish → git push → CI деплой

---

## 7. Canvas внутри админки — ключевые решения

| Решение | Почему |
|---------|--------|
| Canvas внутри `/admin/*` | Один домен, общий auth, общий layout |
| Живое iframe-превью справа | Менеджер видит изменения сразу |
| tldraw как canvas engine | zoom/pan/selection/resize — из коробки |
| Три секции Properties | Стили, контент, поведение — всегда видны |
| Вкладки в левой панели | Стили / Страницы / Layout / Визард / PDF |
| site.yaml как единый конфиг | Один файл на весь сайт, проще версионировать |

---

## 8. Итог

Сайт = конфиг (`site.yaml` + `branding.yaml` + `wizard/` + `pdf/`).

Админка = визуальный редактор этого конфига.

Менеджер открывает `/admin/profiles/{id}` и видит:
- Слева — вкладки (Стили / Страницы / Layout / Визард / PDF)
- По центру — живое превью сайта (canvas / iframe)
- Справа — свойства выбранного элемента (стили + контент + поведение)

Сохраняет → конфиг пишется на диск → фронт перерисовывается.
