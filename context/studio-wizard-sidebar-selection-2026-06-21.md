# Wizard sidebar selection (Studio)

- Strela funnel sidebar is a grid block: `wizard/funnel-sidebar` (`w-sidebar-{stepId}`).
- Sidebar props live on the block (`sidebarText`, `wordmarkUrl`, `sidebarWidth`), schema in `blockSchema.ts`.
- Studio selection: `selectedBlockId` in `WizardUnifiedStudioEditor` → `WizardUnifiedPageEditor` → canvas (`GridPageContent`) / layers panel.
- Sidebar properties panel: `PropertiesPanel` only when `selectedBlock.type === "wizard/funnel-sidebar"`.
- Do **not** render `WizardFunnelLayoutPanel` unconditionally — it edits profile `StrelaAppearance` and bypasses block selection.
- Step/card/field panels in `rightSidebarExtra` are gated by `selectedBlockId` / `selectedChildId`; block props replace the old appearance sidebar panel.
