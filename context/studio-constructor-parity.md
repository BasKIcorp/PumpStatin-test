# Studio constructor — parity & blockers (2025-06)

## Unified render paths

| Context | Entry |
|---------|-------|
| Live / Preview | `SitePage` → `PageContentRouter` / `WizardGridPage` |
| Studio pages | `StudioPageCanvas` → `PageContentRouter` + editor |
| Studio wizard | `WizardVisualEditor` → `WizardStepRenderer` |

## Implemented

- Single CSS grid renderer (`GridPageContent`) for CMS/cabinet/wizard frames **and auth login (live + studio)**
- Auth column layout (`AuthSplitLayout`) — legacy; live/preview migrated to grid (2026-06-20)
- Layers panel reorder updates `layout.y` via `reorderBlocksInLayers`
- Draft preview (`DraftPagePreview`) from editor state — одна страница в режиме pages (legacy state)
- **Full-site draft preview** (`DraftSitePreview`) — кнопка «Превью» на вкладке Frontend, черновик pages + layout + wizard nav/frames
- Dirty indicators: site + wizard nav/frames in top bar (на всех frontend-режимах)
- Wizard save writes navigation + site frames
- **Auto frames**: `ensureStepFrame` / `syncWizardPageFrames` при add/remove/update шага в `WizardVisualEditor`
- Legacy removed: `PageRenderer`, `WizardPage`, `WizardBlock` (alias `wizard` → `wizard/embed`)

## Auth login editor (fix 2025-06)

- Левая колонка (бренд): один блок не попадал в `AuthEditorColumn` → клик не выбирал блок
- Drag-handlers на всей строке перехватывали клики по форме → только на ⠿
- `auth/brand-panel` без полей в Properties → добавлены `src` / `alt`
- Добавление auth-блоков с палитры — placement в правильную колонку

## Remaining (low priority)

- Split config files (wizard YAML vs site YAML) — architectural, works via dual save
