# Studio multi-profile + charts + PDF pages (2026-06-21)

## Task 1 — Profile verification

| Profile | layoutVariant | Sidebar/header blocks | Editable via PropertiesPanel (click block) |
|---------|---------------|----------------------|------------------------------------------|
| **default** (Стрела) | `strela-funnel` | `wizard/funnel-sidebar`, `wizard/selection-work-header` | sidebarText, wordmarkUrl, sidebarWidth; title, logoUrl |
| **acme-industrial** | `topbar-dark` | нет (by design) | `wizard/step-heading`, `wizard/selection-card`, `wizard/legacy-selection` |
| **aqua-pro** | `sidebar-gradient` | нет | same as acme |
| **nord-minimal** | `minimal-light` | нет | same as acme |

All four profiles use **Option C** flat `page.blocks[]` (no `frames` on disk). Non-Strela profiles use decomposed `wizard/selection-card` (7 cards + 3 step-headings + legacy form), not `funnel-sidebar`.

### Fixes applied
- **WizardUnifiedStudioEditor**: `addCard` / `removeCard` / `moveCard` now call `addCardBlockToUnifiedStep` / `removeCardBlockFromUnifiedStep` for **all** profiles with decomposed cards (removed `isStrelaFunnel` guard).
- **updateStep**: title/subtitle sync to `wizard/step-heading` blocks (not only `wizard/funnel-heading`).
- **PropertiesPanel**: `wizard/selection-card` image field uses `ImageDropUpload` on all profiles when block is selected.

## Task 2 — Chart formation rules

| Block | UI location | Fields |
|-------|-------------|--------|
| `wizard/selection-curves-panel` | PropertiesPanel → section **Данные** | `bindings.chartPreset`, `bindings.readFrom`, `bindings.readPath` |
| `curves-chart` (PDF) | PdfPropertiesPanel | `props.dataPath`, `props.chartPreset` |

Presets align with `config/profiles/default/blocks/registry.yaml` (`qh-five-curves`, `power-npsh`) and `algorithm/wiring.yaml` displayCatalog.

## Task 3 — PDF add/remove pages

- Template model: `pages: [{ id, label, blocks[] }]` + legacy top-level `blocks` for backward compatibility.
- **PdfStudioEditor**: undo stack over `pages[]`, `currentPageIndex`, buttons **+ Страница** / **− Страница** and page tabs in PdfPropertiesPanel (when no block selected).
- Save/load via existing `PUT/GET .../pdf/template`; payload includes `pages` and flattened `blocks`.
- **block_renderer.py**: `_iter_pdf_block_pages()` + `PageBreak` between pages.

## Key files
- `apps/web/src/routes/admin/studio/properties/blockSchema.ts`
- `apps/web/src/routes/admin/studio/properties/PropertiesPanel.tsx`
- `apps/web/src/routes/admin/studio/wizard/WizardUnifiedStudioEditor.tsx`
- `apps/web/src/routes/admin/studio/pdf/pdfTemplateUtils.ts`
- `apps/web/src/routes/admin/studio/pdf/PdfStudioEditor.tsx`
- `apps/api/app/pdf/block_renderer.py`
