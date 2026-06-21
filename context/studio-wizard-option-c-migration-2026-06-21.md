# Studio Wizard Option C — migration status (2026-06-21)

## Goal

Single `page.blocks[]` for wizard (like CMS), scoped by `props.stepId`. No `page.frames`. Navigation graph stays in `wizard/navigation.yaml`; card **content** lives in `wizard/selection-card` block props (runtime props-first with `nav.cards` fallback).

## Phases

| Phase | Status | Notes |
|-------|--------|-------|
| C1 Utils | Done | `wizardUnifiedBlocks.ts`: normalize, flatten, patch by step, `patchSelectionCardProps` |
| C2 Runtime | Done | `WizardStepRenderer`, `WizardGridPage`, `SitePage` call `normalizeWizardPage()` on load |
| C3 Studio | Done | `WizardUnifiedStudioEditor` + dual-write card props + Strela appearance panel |
| C4 YAML | Done | All 4 profiles: flat `blocks[]`, **no `frames`** (re-migrated 2026-06-21) |
| C5 Cards in props | Done (default) | All selection-card blocks in default profile have nav card fields in props |

## Profile migration (disk state after re-run)

| Profile | `frames` | Total blocks | Blocks per step |
|---------|----------|--------------|-----------------|
| default | No | 39 | product-class: 6, hm-line: 7, pu-line: 10, simpel-line: 6, installation-type: 4, selection-form: 6 |
| acme-industrial | No | ~15 | product-class: 5, product-line: 2, installation-type: 3, selection-form: 1 |
| aqua-pro | No | ~15 | same |
| nord-minimal | No | ~15 | same |

All profiles: `navigation.yaml` has `cards: {}` — card content only in `site.yaml` block props.

Migration tools:
- `apps/api/app/tools/migrate_wizard_frames.py` — Strela/default (flatten + materialize + `--cards`)
- `apps/api/app/tools/migrate_non_strela_wizard.py` — acme/aqua/nord decomposed selection-card
- `apps/api/app/tools/strip_wizard_nav_cards.py` — remove redundant nav.cards

Migration tool: `apps/api/app/tools/migrate_wizard_frames.py`

```powershell
cd C:\projects\PumpStation_Base
python apps/api/app/tools/migrate_wizard_frames.py --cards
```

Script actions per wizard page:

1. Flatten `frames` → flat `blocks` with `props.stepId`
2. Materialize missing steps from `wizard/navigation.yaml` (Strela decomposed blocks or simple card-grid)
3. With `--cards`: merge missing nav.cards fields into existing selection-card props

## Save model

- **Blocks:** `PUT /site` — source of truth for layout + card content in block props
- **Nav/flows:** `PUT /wizard` — on save, `nav.cards` rebuilt from block props via `navWithCardsFromBlocks()` (steps graph unchanged)
- **Appearance:** `PUT` branding appearance when Strela funnel panel dirty

## Cards source of truth (C6)

- `cardsFromWizardBlocks(page)` — extract `CardItem[]` per step from `wizard/selection-card` props
- `navWithCardsFromBlocks(nav, page)` — merge into nav before wizard PUT; legacy steps without decomposed cards keep `nav.cards`
- Studio `onBlocksChange` syncs nav.cards from blocks (PropertiesPanel edits stay consistent with card panel)

## Studio (WizardUnifiedStudioEditor)

- `updateCard()` dual-writes: `nav.cards` + `patchSelectionCardProps()` on `draftPage.blocks`
- `addCard` / `removeCard` / `moveCard` already patch unified blocks (Strela)
- **Sidebar / work header:** настраиваются только через выбор grid-блока на canvas — `wizard/funnel-sidebar` (sidebarText, wordmarkUrl, sidebarWidth) и `wizard/selection-work-header` (title, logoUrl) в `PropertiesPanel`; `WizardFunnelLayoutPanel` deprecated
- При сохранении `appearancePatchFromWizardBlocks()` синхронизирует props сайдбара/шапки → `branding.appearance` (fallback для runtime)

## Runtime normalize

- `AdminProfileStudio` preview: `persistNormalizedWizardPage(normalizeWizardPage(p))`
- Live `/wizard`: `SitePage` → `WizardGridPage` → `normalizeWizardPage(page)`
- `WizardSelectionCardBlock`: props-first, `nav.cards` fallback

## Typecheck (apps/web)

- `npm run typecheck` — **passes** (2026-06-21)

## Remaining work

- Other profiles: keep `nav.cards` until card-grid-simple migrates to decomposed blocks
- E2E `visual-validation.spec.ts` aligned with unified editor

## Legacy removed (2026-06-21)

- `WizardVisualEditor.tsx` — deleted (~1200 LOC); Studio uses `WizardUnifiedStudioEditor` only
- `StepScopedPageEditor.tsx` — deleted (frames adapter obsolete)
- `strip_wizard_nav_cards.py` — removes `navigation.yaml` card entries when block props are complete

## Key files

- `apps/web/src/routes/admin/studio/wizard/wizardUnifiedBlocks.ts`
- `apps/web/src/routes/admin/studio/wizard/WizardUnifiedStudioEditor.tsx`
- `apps/web/src/routes/admin/studio/wizard/WizardFunnelLayoutPanel.tsx`
- `apps/api/app/tools/migrate_wizard_frames.py`
- `config/profiles/default/site.yaml` (39 wizard blocks, no frames)
