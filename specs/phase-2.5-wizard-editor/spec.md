# Phase 2.5 — Wizard Editor (visual)

## OUTCOME

Replace placeholder `WizardEditorShell` with a functional visual wizard editor that:
- Loads wizard navigation + flows from API  
- Shows steps in an ordered list (reorderable via drag)
- Each step shows its properties inline (title, subtitle, type, parent)
- Card sets grouped by step: view/add/edit/delete/reorder cards
- Each card editable: title, description, image, enabled, next, flow
- Save wizard data back via API

## Backend

### New API endpoint (FastIFY /apps/api)

**GET/PUT `/profiles/{profile_id}/wizard`**
- GET: returns `{ navigation, flows }` by calling `config_store.load_wizard_yaml(pid)`
- PUT: receives body with `{ navigation, flows }` → saves via `config_store.save_wizard_yaml(pid, body)`

Proxy in FastAPI (already running at `/api/v1/admin/...`):
- Add route `admin_wizard_get` / `admin_wizard_update`

## Frontend

Replace `apps/web/src/routes/admin/studio/wizard/WizardEditorShell.tsx` with:

```
WizardEditorShell.tsx      ← new main component
WizardStepList.tsx         ← ordered list of steps with drag-reorder
WizardStepEditor.tsx       ← inline editor for one step (title, subtitle, type, parent)
WizardCardGrid.tsx         ← card set editor (add/edit/delete/reorder cards)
WizardCardEditor.tsx       ← inline card form (title, description, image, enabled, next, flow)
```

### Data flow
1. `WizardEditorShell` fetches `GET /api/v1/admin/profiles/{profileId}/wizard` on mount
2. User edits navigation steps, cards inline
3. Save button → `PUT /api/v1/admin/profiles/{profileId}/wizard` with updated data
4. Loading/error/saved states

### Styling
- Same Tailwind as existing studio components
- Use existing `StudioShell` tabs integration
- Cards use same grid layout as the public wizard
