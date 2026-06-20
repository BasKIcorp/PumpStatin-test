# Studio Editor — code review (2026-06-20)

## Project
`C:\projects\PumpStation_Base` — PumpStation Studio (Figma-like page constructor)

## Symptom
UI renders correctly; blocks cannot be selected/dragged/added/removed; property changes do not apply.

## Root causes (ranked)

1. **Unfinished Grid Constructor migration (uncommitted)** — `CanvasBlock` + vertical list replaced by `GridPageContent` + CSS grid. ~100 files changed, not committed. Last commit `1408395`; grid work is local WIP.

2. **Missing `useDroppable` on page canvas** — `VisualPageEditor` expects dnd-kit id `canvas-drop-zone`; `GridPageContent` only sets HTML `id`, not `useDroppable`. PDF canvas (`PdfCanvas.tsx`) does it correctly.

3. **Grid drag requires prior selection** — `GridEditableBlock.startDrag` uses stale `selected` from render; first pointerdown selects, drag starts only on second gesture.

4. **Three interaction systems** — dnd-kit (palette/layers), native HTML5 drop (`StudioCanvas`), pointer drag (grid). Not fully integrated.

5. **Auth page click targets** — `auth/login-form` is interactive; canvas clicks hit inputs. Selection via Layers panel or drag handle (⠿) only.

6. **`useUndoRedo` no sync** — does not reset when `blocks` prop changes without remount (edge case after external page updates).

## Backend
- `PUT /api/v1/admin/profiles/{id}/site` — OK (`admin_site.py`)
- Save wired in `AdminProfileStudio.handleSaveSite`
- Issue is frontend interaction/state, not API

## Architecture
- Target: `PageContentRouter` single path for live + studio — correct direction
- Problem: editor options (`onLayoutChange`, `onBlocksChange`) wired through 3 layers; easy to break during migration
- Domain layout rules in `lib/gridLayout.tsx` — acceptable but should stay pure

## Fix status (2026-06-20 applied)

1. **`useDroppable`** — `GridPageContent` + `AuthPageContent` register `STUDIO_CANVAS_DROP_ZONE_ID` (`studioCanvasContext.ts`)
2. **Grid drag** — `startDrag` selects on pointerdown, drag after 4px threshold (no stale `selected`)
3. **Palette** — removed native HTML5 `draggable`; only `@dnd-kit` `useDraggable`
4. **StudioCanvas** — native drop handlers on artboard (`data-canvas-bg`), not outer dotted area
5. **`useUndoRedo` sync** — `VisualPageEditor` resets when parent `blocks` change externally (ref guard)
6. **Auth pages** — droppable wrapper + drop-over outline; interactive form still blocks direct click-select

## Fix: changes not applying (2026-06-20)

**Symptom:** property/layout edits in studio revert or do not persist after Save.

**Root cause:** bidirectional sync in `VisualPageEditor` — `useEffect` compared parent `blocks` JSON with local `editBlocks` and called `reset(oldBlocks)` when parent was briefly stale (race with `onPageChange` / async `setPages`). That wiped canvas edits. `handleSaveSite` could also read stale `pages` from closure.

**Fix applied:**
- `VisualPageEditor`: reset only on `page.id` change; immediate `onBlocksChange` inside `patchBlocks`
- `AdminProfileStudio`: `pagesRef` for Save; `updatePageBlocks(pageId, blocks)` bound to page id; `onPageChange` merges from `pagesRef` to keep latest blocks

## Preview button fix (2026-06-20)
- **Страницы** mode: «Превью» opens `DraftPagePreview` for current page draft (not whole site)
- **Read-only**: `inert` + `pointer-events-none` on preview content (links/buttons/forms inactive)
- **Full screen**: default viewport «Полный экран»; optional Desktop/Tablet/Mobile frames
- **Esc** closes preview; overlay covers entire editor canvas area
- **Визард / Сайт** modes: still open `DraftSitePreview` (same read-only viewport)
- **PDF** tab: unchanged (`pdfPreview`)

## Auth editor fix (2026-06-20)
- **Studio auth pages** use `GridPageContent` (grid drag/resize/select), not `AuthSplitLayout`
- **Live/preview auth** also use `GridPageContent` — layout x/y/w/h from site.yaml applies on `/login` and in draft preview (fix 2026-06-20)
- Login form inputs: `pointer-events-none` on block body in editor — drag anywhere on block chrome

## Fix priority (original)
1. Add `useDroppable({ id: 'canvas-drop-zone' })` to grid surface
2. Fix `startDrag` to use ref or select+drag in one gesture
3. Finish/commit or revert grid migration as a unit
4. E2E: `e2e/studio.spec.ts`, `e2e/grid-constructor.spec.ts`

## Entry path
`/admin/profiles/default` → Фронт → **Страницы** (not Визард/Сайт)
