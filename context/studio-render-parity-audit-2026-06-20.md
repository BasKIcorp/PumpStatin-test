# Studio render parity audit (2026-06-20)

## Matrix: editor vs preview vs live

| Page type | Studio canvas | Draft preview | Live `/route` | Parity |
|-----------|---------------|---------------|---------------|--------|
| **CMS** (`page`) | `PageContentRouter` → `GridPageContent` + `SiteLayout` | same via `SitePage` | same | OK |
| **Auth** (`auth`) | `GridPageContent` | `GridPageContent` (fix 2026-06-20) | `GridPageContent` | OK after auth fix |
| **Cabinet** | `AppShell` + `GridPageContent` | same | same | OK |
| **Wizard** (frames) | `WizardStepRenderer` → `GridPageContent` | `WizardGridPage` + fixed step (fix 2026-06-20) | `WizardGridPage` + wizardStore step | OK for frames; preview shows first frame step |
| **Wizard** (no frames, e.g. selection-form) | `WizardEngine` | `WizardEngine` | `WizardEngine` | OK (not grid-editable) |

## Fixed issues (this session)

1. **Auth login** — live/preview used `AuthSplitLayout` (ignored `layout.x/y/w/h`). Unified on `GridPageContent`.
2. **Wizard site preview** — `DraftSitePreview` used `wizardStore.step` (random user progress). Now `previewWizardStepId` from first frame / first nav step.
3. **Wizard live** — `WizardStepRenderer` now receives `site` from `WizardGridPage`.

## No parity bug (but worth knowing)

- **CMS header logo** (`layout.header.logo.src/width`) — only in `site.yaml`, no visual editor in «Стили и меню». Theme «URL логотипа» is `branding.assets.logoUrl` — **different field**, does not change CMS header.
- **Login brand block** (`auth/brand-panel`) — size/position = grid `w/h/x/y`, not header logo.
- **Cabinet** `cabinet/workspace` — content fills cell; grid resize clips wrapper, both sides identical.
- **Studio zoom** — canvas 55% zoom; layout cells match live proportions, only scale differs.
- **Legacy dead code** — `AuthPageContent`, `AuthSplitLayout`, `AuthEditorColumn` unused after auth grid migration (safe to delete later).

## Save reminder

All page block/layout edits require **«Сохранить»** on Frontend → Страницы (or wizard dual save). Public site tab needs **F5** after save (`App.tsx` loads `/api/v1/config/site` once).
