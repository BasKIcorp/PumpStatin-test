# Studio visual validation follow-up — 2026-06-21

## Environment

- Web dev: http://localhost:5175
- API: http://localhost:8000
- Admin studio: http://localhost:5175/admin/profiles/default
- Credentials: admin / demo123
- Evidence: `context/visual-validation/*.png`, `report.txt`
- Harness: `e2e/visual-validation.spec.ts`

## Unification implementation (2026-06-21 PM)

- CMS + wizard editors share `StudioGridEditorShell` + `useStudioBlockEditor`; wizard keeps step/card/flow panels in `wizard/panels/*`.
- Wizard save: `saveWizardBundle()` with phase-specific errors; single dirty fingerprint via `wizardBundleFingerprint`.
- Toolbar: compact wizard step dropdown; `DraftSitePreview` honors editor step.
- Default profile `product-class` frame fully decomposed in `site.yaml`.
- `WizardLiveCanvas` retained (preview surfaces). See `studio-wizard-cms-unification-plan-2026-06-21.md` § Implementation status.


### VisualPageEditor (`apps/web/src/routes/admin/studio/canvas/VisualPageEditor.tsx`)

**Root cause:** `useEffect` synced `editBlocks` to parent via `onBlocksChange`, while `AdminProfileStudio` passed an inline callback that changed every render. Each parent update retriggered the effect → `Maximum update depth exceeded`.

**Fix:**
- `patchBlocks` updates local undo state only.
- Single sync effect calls `onBlocksChangeRef.current(editBlocks)` with `[editBlocks]` deps (callback kept in ref, not in deps).
- Undo/redo still propagates to parent through the same effect.

### AdminProfileStudio (`apps/web/src/pages/admin/AdminProfileStudio.tsx`)

**Fix:**
- `handleSelectedPageBlocksChange` wrapped in `useCallback`.
- `wizardInitialNav` memoized with `useMemo([data?.wizard])` to avoid new object each render.

### WizardVisualEditor (`apps/web/src/routes/admin/studio/wizard/WizardVisualEditor.tsx`)

**Root cause:** Multiple issues:
1. `onDirtyChange` effect depended on `initialNav` object recreated every parent render → `setWizardDirty(newObject)` every cycle.
2. Parent notify effects listed unstable inline callbacks in deps.
3. `setDraftPage(page)` ran on every new `page` reference even when frames fingerprint unchanged.
4. Fresh `{}` for missing appearance caused unnecessary appearance draft updates.

**Fix:**
- Dirty flags computed as booleans; effect deps: `[navDirty, framesDirty, appearanceDirty]`.
- Parent callbacks stored in refs (`onDraftPageChangeRef`, etc.).
- Server page sync gated by `wizardPageFramesFingerprint(page)`.
- Shared `EMPTY_APPEARANCE` constant for defaults.

## Playwright visual validation

**Command:**
```powershell
$env:PLAYWRIGHT_BASE_URL="http://localhost:5175"
npx playwright test e2e/visual-validation.spec.ts
```

**Result:** PASS (2026-06-21)

| Check | Result |
|-------|--------|
| Wizard product-class baseline | OK |
| Selection-form step click «Подбор насосной установки» | OK |
| 6 decomposed canvas blocks (`wizard/selection-work-header`, params, curves, tech-specs, options, results) | OK |
| Screenshots `10-selection-form-before.png`, `11-selection-form-after.png` | Saved |
| `Maximum update depth exceeded` | **0 errors** |
| PDF shell (layers/blocks tabs) | OK |
| PDF canvas testid | NOT FOUND |
| CMS page editor shell | OK |

**Note:** Sidebar layer labels for selection-form panels were not visible without scrolling the layers list; canvas `data-block-type` checks are authoritative.

## Remaining issues

- **PDF editor:** no `[data-testid=grid-canvas]` on PDF tab (`PDF CANVAS: NOT FOUND` in report).
- **CMS:** broken logo on preview/auth blocks (known from prior validation).
- **React warning:** `fetchPriority` prop on `<img>` in `AuthBrandPanelBlock`.
- **Transient fetch errors** on first navigation if API briefly unavailable (login still succeeds via cached session).

## Follow-up fixes — 2026-06-21 (three remaining issues)

### 1. PDF canvas `data-testid="grid-canvas"`

**File:** `apps/web/src/routes/admin/studio/pdf/PdfCanvas.tsx`

**Change:** Added `data-testid="grid-canvas"` on the A4 drop surface in `PdfPageContent` (parity with `GridPageContent` / page editor for Playwright e2e).

### 2. CMS preview — broken header logo

**Root cause:** `layout.header.logo.src` in all profile `site.yaml` files is `/logo.svg`, but that file is **not** in `apps/web/public/`. Alt text showed `branding.appTitle` («Подбор насосного оборудования Стрела») because the `<img>` failed to load. Secondary path `branding.assets.logoUrl` (`/assets/selection-flow-header-brand.png`) is also missing from `public/assets/` (only `strela-logo.png` and `strela-wordmark.png` exist). Preview was not a base-URL issue — `DraftPagePreview` → `SitePage` → `SiteLayout` uses the same relative paths as live; assets were simply absent.

**File:** `apps/web/src/engine/SiteLayout.tsx`

**Change:** `resolveSiteHeaderLogoSrc()` skips known missing placeholder paths and falls back to bundled `/assets/strela-logo.png`.

### 3. React warning `fetchPriority` → `fetchpriority`

**File:** `apps/web/src/blocks/auth/AuthBlocks.tsx`

**Change:** `fetchPriority="low"` → `fetchpriority="low"` on `AuthBrandPanelBlock` `<img>` (lowercase DOM attribute per React).

## Changed files (follow-up)

- `apps/web/src/routes/admin/studio/pdf/PdfCanvas.tsx`
- `apps/web/src/engine/SiteLayout.tsx`
- `apps/web/src/blocks/auth/AuthBlocks.tsx`

## Sidebar text revert on wizard step — fixed (2026-06-21)

**Symptom:** Editing `sidebarText` (and related sidebar props) on `wizard/funnel-sidebar` in the Strela funnel editor reverted immediately after each keystroke.

**Root cause:** Two coupled overwrites:
1. `useEffect` syncing frames depended on `appearanceDraft`. Editing sidebar updated both block props and `appearance.sidebar_text`, which re-ran `syncWizardPageFrames` and could rebuild legacy/decomposed frames from appearance defaults.
2. `patchFrameBlocks` / `frameBlocksForPatch` passed `appearanceDraft` on every prop patch, re-running legacy `card-grid-strela` → decomposed migration and re-seeding sidebar props from appearance instead of preserving saved block props.

**Fix:**
- Frame sync effect now runs only on structural changes (`nav.steps`, `nav.cards`, `isStrelaFunnel`); latest appearance read via ref when creating *new* frames.
- `updateFrameBlockProp` updates `draftPage` frame props and `appearance` atomically in one `patchEditor` call.
- `patchFrameBlocks` no longer passes appearance into `frameBlocksForPatch` (props patch path preserves saved shell blocks).
- `wizardFrameUtils`: `appearanceForExistingFrames()` skips appearance when frames are already decomposed; `frameBlocksForPatch` checks decomposed strela before legacy migration; sidebar preserve also matches by block type.

**Changed files:**
- `apps/web/src/routes/admin/studio/wizard/WizardVisualEditor.tsx`
- `apps/web/src/routes/admin/studio/wizard/wizardFrameUtils.ts`

**Manual verify:** Admin studio → wizard page → card-grid step (e.g. product-class) → click `wizard/funnel-sidebar` on canvas → edit «Текст под логотипом» in properties → text must persist while typing and after blur; no `Maximum update depth exceeded` in console.
