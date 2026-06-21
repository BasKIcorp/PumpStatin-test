# План унификации Wizard vs CMS в Studio (2026-06-21)

Документ для команды PumpStation / Strela: практический поэтапный план согласования редактора визарда подбора и CMS-страниц в Admin Profile Studio. Основан на текущем состоянии кодовой базы и контексте от 2026-06-20 — 2026-06-21.

---

## 1. Цели и non-goals

### Что означает «унификация» в этом проекте

**Цель (primary):** одинаковый опыт редактирования в Studio — общая оболочка (toolbar, sidebar «Слои | Блоки», canvas, properties, undo/redo, превью), одинаковые grid-блоки и трансформации (drag/resize/rotation/crop), предсказуемое сохранение и parity editor ↔ preview ↔ live.

**Цель (secondary):** сократить дублирование кода между `VisualPageEditor` и `WizardVisualEditor`, не ломая runtime визарда (`WizardEngine`, `wizardStore`, flows YAML).

**Non-goals (явно не входят в scope):**

- Слияние PDF-редактора с page/wizard editor (отдельная модель координат и ReportLab pipeline).
- Переписывание `WizardEngine` и бизнес-логики подбора (расчёт насосов, PDF generation, API selection).
- Объединение `wizard/navigation.yaml` и `wizard/flows/*.yaml` в один файл «на один sprint».
- Удаление шаговости визарда для конечного пользователя — funnel остаётся многошаговым на live `/wizard`.
- Полная WYSIWYG-унификация mobile layout для `selection-form` (legacy monolith vs decomposed desktop grid) — отдельный продуктовый трек.

### Различие: UX parity vs merge data model

| Аспект | UX parity (рекомендуемый фокус) | Merge data model |
|--------|----------------------------------|------------------|
| Редактор | Один shell, общие компоненты | Один тип страницы, один массив blocks |
| Хранение | `site.yaml` + `navigation.yaml` + flows | Всё в `site.yaml` или одном JSON |
| Runtime | Без изменений | Требует миграции WizardEngine |
| Риск | Низкий | Высокий |
| Срок | 2–6 недель по фазам | 2–3 месяца+ |

---

## 2. Текущее состояние и gaps

### Архитектура сегодня

```
AdminProfileStudio
├── selectedPage.type !== "wizard" → VisualPageEditor
│   └── page.blocks[] → StudioPageCanvas → PageContentRouter → GridPageContent
└── selectedPage.type === "wizard" → WizardVisualEditor
    ├── nav (steps, cards, flows) ← wizard/navigation.yaml + flows/
    ├── draftPage.frames[stepId].blocks[] ← site.yaml (page id=wizard)
    └── appearance ← branding.appearance (Strela funnel shell)
```

**Save flows:**

| Действие | Endpoint | Что пишется |
|----------|----------|-------------|
| CMS-страница «Сохранить» | `PUT /profiles/{id}/site` | `layout`, `pages[].blocks`, `routing` |
| Wizard «Сохранить» | `PUT /profiles/{id}/wizard` | `navigation.steps`, `navigation.cards`, `flows` |
| Wizard frames (dual) | `PUT /profiles/{id}/site` | `pages[wizard].frames` |
| Wizard оболочка | `PUT /profiles/{id}/branding` | `appearance` (sidebar, funnel colors) |
| PDF | `PUT /profiles/{id}/pdf/template` | отдельный template |

Рouting в `AdminProfileStudio.tsx`: при `isWizardPageSelected` save идёт через `wizardSaveRef` → `handleSaveWizard` (до 3 HTTP-запросов).

### Таблица gaps: CMS vs Wizard vs PDF

| Область | CMS (`VisualPageEditor`) | Wizard (`WizardVisualEditor`) | PDF (`PdfStudioEditor`) |
|---------|--------------------------|-------------------------------|-------------------------|
| **Модель данных** | `page.blocks[]` | `page.frames[stepId].blocks[]` + `navigation.yaml` | `template.blocks[]` (pixel coords) |
| **Canvas** | `StudioCanvas` + `GridPageContent` | `StudioCanvas` + `WizardStepRenderer` → `GridPageContent` (decomposed) или `WizardEngine` (legacy) | `StudioCanvas` + `PdfCanvas` |
| **Левая панель** | Слои + Палитра | Шаги + Карточки/Поля + Блоки шага + Палитра | Слои + Палитра |
| **Правая панель** | `PropertiesPanel` + `PagePropertiesPanel` | `PropertiesPanel` + Step/Card/Flow/Routing panels | `PdfPropertiesPanel` |
| **Undo/redo** | `useUndoRedo(blocks)` | `useWizardEditorUndo({ nav, draftPage, appearance })` | `useUndoRedo(blocks)` |
| **Save** | 1× PUT site | 1–3× PUT wizard + site + branding | 1× PUT pdf |
| **Preview** | `DraftPagePreview` | `DraftPagePreview` + `previewWizardStepId` | blob POST preview |
| **Live render** | `PageContentRouter` | `WizardGridPage` → `WizardStepRenderer` / `WizardEngine` | ReportLab compile |
| **Grid features** | rotation, crop, DnD palette | rotation, crop (frames); cards sync из nav | free/flow mode, no rotation |
| **Parity** | OK | OK для decomposed frames; legacy steps → `WizardEngine` | OK (flow); free-layout WYSIWYG — partial |

### Уже сделано (baseline Option A)

- Вкладка «Визард» убрана; визард — страница «Подбор насосов» в селекторе.
- Общие компоненты: `StudioLeftSidebar`, `StudioRightSidebar`, `StudioCanvas`, `LayersPanel`, `PropertiesPanel`, `UndoRedoButtons`, `FIGMA` tokens.
- Card-grid и selection-form декомпозированы в frame-блоки (`wizard/funnel-sidebar`, `wizard/selection-card`, `wizard/selection-*-panel`).
- Единый `GridPageContent` для CMS и decomposed wizard frames.
- Fix infinite render loops (2026-06-21), sidebar text revert, Playwright visual validation PASS.

### Оставшиеся разрывы

1. **Два редактора (~360 vs ~1500 LOC)** — дублирование DnD, keyboard shortcuts, palette drop, undo patterns.
2. **Dual/triple save** для wizard — риск partial save, сложный dirty state (`nav | frames | appearance`).
3. **`navigation.yaml` coupling** — карточки, заголовки шагов, `when`/`parent`, `flowRef` живут вне `frames`; `syncWizardPageFrames` пересобирает блоки при structural changes.
4. **Legacy frames** — `wizard/card-grid-strela` в `site.yaml` для шагов без полной декомпозиции; on-the-fly migration в `wizardFrameUtils`.
5. **Appearance vs block props** — `branding.appearance.sidebar_text` дублирует props `wizard/funnel-sidebar` (частично исправлено 2026-06-21).
6. **Шаги без frames** — runtime fallback на `WizardEngine`; в Studio нет grid-editing для monolith steps.
7. **Mobile selection-form** — только в legacy monolith (`lg:hidden` stack).
8. **DraftSitePreview** — визард показывает первый frame-шаг, не текущий шаг редактора (page preview — OK).

---

## 3. Три стратегических варианта

### A) UX-only unification — один editor shell, split config (текущий вектор)

**Суть:** извлечь общий `StudioPageEditorShell` (layout, sidebars, canvas wrapper, keyboard, undo toolbar). Wizard остаётся «страницей с step-scoping»: при смене шага редактируется `frames[stepId]`, плюс wizard-specific panels (шаги, карточки, поля). Данные: `blocks` vs `frames` + `navigation.yaml` без merge.

| Плюсы | Минусы |
|-------|--------|
| Минимальный риск для live `/wizard` | Dual save остаётся |
| Быстрые инкременты (уже ~60% shell общий) | Два code path для block editing |
| Не требует миграции YAML на prod | Nav ↔ frames sync logic сохраняется |
| Rollback = revert UI refactor | «Полная» унификация данных не достигнута |

**Статус:** частично реализовано; Phase 0–2 доводят до зрелости.

---

### B) Block model unification — шаги как virtual sub-pages

**Суть:** каждый wizard step — логическая «sub-page» с собственным `blocks[]`, но физически хранится как `frames[stepId]` или как child pages `wizard-{stepId}` в `site.pages`. `navigation.yaml` — только graph (parent/when/next), без card content; карточки → `wizard/selection-card` blocks.

| Плюсы | Минусы |
|-------|--------|
| Единая mental model «страница = blocks» | Большая миграция navigation.yaml |
| Можно переиспользовать `VisualPageEditor` для step canvas | Card CRUD усложняется (block CRUD vs nav.cards) |
| Проще тестировать parity | `when`/conditional steps — metadata layer всё равно нужен |
| Постепенная миграция step-by-step | Backend API может потребовать новый endpoint |

**Компромисс:** хранить `frames`, но API редактора expose как `SubPageEditor(stepId)` с тем же интерфейсом что CMS.

---

### C) Full merge — single `page.blocks` + navigation as metadata only

**Суть:** один массив blocks на wizard page; шаги — группы блоков с `bindings.stepId` или namespaced IDs; navigation — чистый routing graph без cards array; flows остаются отдельно.

| Плюсы | Минусы |
|-------|--------|
| Один save (PUT site) | Ломает текущий WizardEngine contract |
| Простейшая модель для новых профилей | Миграция всех 4 profiles + import scripts |
| Один редактор без fork | Условные шаги (`when`) сложно выразить в blocks |
| | 2–3 месяца, высокий regression risk |
| | Откат на YAML уровне болезненный |

**Вердикт для Strela:** premature — слишком много domain logic в navigation/flows.

---

## 4. Рекомендуемый путь для PumpStation / Strela

**Рекомендация: Option A с элементами B (Phase 3–4), без Option C в горизонте Q3 2026.**

### Rationale

1. **Продукт уже invest в decomposed frames** — card-grid и selection-form работают через `GridPageContent`; откат к monolith не нужен.
2. **WizardEngine + flows — core IP** — переписывание ради единого массива blocks не даёт user-visible value в Studio.
3. **Dual save работает** (`studio-constructor-parity.md`) — проблема UX (partial save), а не архитектурный тупик; решается transactional save wrapper.
4. **Strela funnel** — sidebar/heading/cards как blocks уже редактируются как CMS; оставшаяся специфика (steps tree, flow fields) закономерна.
5. **Option B incrementally** — step sub-editor с тем же API что CMS можно ввести без смены storage format.

### Принцип «один canvas без шагов» (запрос пользователя)

Интерпретация для Strela: **один canvas на выбранный шаг** (уже так), не один canvas на весь funnel. «Без шагов» в UI sidebar = опционально Phase 4 (compact step switcher в toolbar вместо полного step tree). Полное скрытие шагов невозможно без потери редактирования navigation graph.

---

## 5. Поэтапный roadmap

### Phase 0 — Stabilize & document (3–5 дней)

**Цель:** зафиксировать контракты, закрыть known gaps, подготовить shared abstractions.

| Задача | Файлы / модули | Риск | Rollback |
|--------|----------------|------|----------|
| Документировать save contract (wizard triple PUT) | `AdminProfileStudio.tsx`, `context/` | Низкий | N/A |
| Transactional wizard save: all-or-nothing с rollback message | `AdminProfileStudio.handleSaveWizard` | Partial save если site OK, wizard fail | Feature flag `sequentialSave` → old behavior |
| Migrate remaining `card-grid-strela` → decomposed in default profile | `config/profiles/default/site.yaml`, `wizardFrameUtils` | Regression card layout | Git revert site.yaml |
| E2E: wizard save → reload → frames persist | `e2e/visual-validation.spec.ts` | Flaky CI | Skip test |
| Удалить dead code: `WizardLiveCanvas` если unused | `WizardLiveCanvas.tsx`, imports | Low | Restore file |

**Acceptance criteria:**

- [ ] Save wizard при ошибке branding/site не оставляет «полусохранённое» состояние без явного error UI.
- [ ] Все card-grid steps default profile используют decomposed blocks (grep `card-grid-strela` = 0 или только fallback path).
- [ ] Playwright visual-validation PASS без console errors.
- [ ] `context/studio-wizard-cms-unification-plan-2026-06-21.md` (этот документ) согласован с PO.

---

### Phase 1 — Shared editor shell (5–8 дней)

**Цель:** извлечь общую оболочку редактора; уменьшить дублирование CMS/Wizard.

| Задача | Файлы / модули | Риск | Rollback |
|--------|----------------|------|----------|
| Создать `StudioGridEditorShell` — DndContext, sidebars, canvas slot, keyboard (Del, R, Ctrl+Z) | `apps/web/src/routes/admin/studio/canvas/StudioGridEditorShell.tsx` (new) | Regression shortcuts | Keep old editors parallel behind prop |
| Создать `useStudioBlockEditor` — patchBlocks, reorder, add from palette | `apps/web/src/hooks/useStudioBlockEditor.ts` (new) | Undo scope mismatch | Wizard keeps own hook |
| Refactor `VisualPageEditor` → shell + hook | `VisualPageEditor.tsx` | Medium | Revert single file |
| Refactor wizard canvas section → shell (without step panels) | `WizardVisualEditor.tsx` | Medium | Revert |
| Unify `artboardMinHeight` / grid metrics helpers | `gridLayout.ts`, editors | Low | Inline again |

**Acceptance criteria:**

- [ ] CMS и wizard используют один `StudioGridEditorShell` (grep import).
- [ ] LOC `VisualPageEditor` + wizard canvas section ↓ минимум 25% vs baseline.
- [ ] Manual: drag/resize/rotation/crop работают на home и product-class step.
- [ ] No new `Maximum update depth` in console (regression test).

**Migration risks:** wizard frame patching uses `patchFrameBlocks` + nav sync — shell must accept generic `onBlocksChange` adapter.

---

### Phase 2 — Unified dirty state & save UX (4–6 дней)

**Цель:** один паттерн «несохранено» и одна кнопка Save для wizard без silent partial writes.

| Задача | Файлы / модули | Риск | Rollback |
|--------|----------------|------|----------|
| `saveWizardBundle()` — sequential PUT with rollback plan | `AdminProfileStudio.tsx`, optional `studioSaveUtils.ts` | Failed mid-sequence | Document manual fix; keep old handler |
| Dirty fingerprint: single `wizardBundleFingerprint(nav, frames, appearance)` | `studioDraftUtils.ts` | False dirty | Split fingerprints again |
| Toolbar hint: «Визард: навигация + макет + оболочка» → unified message | `StudioEditorTopBar.tsx` | Cosmetic | Revert copy |
| Optional: backend composite endpoint `PUT /wizard-bundle` | `apps/api/app/api/routes/admin_site.py` | API versioning | Frontend-only sequential |

**Acceptance criteria:**

- [ ] User видит один dirty indicator для wizard edits.
- [ ] Failed save показывает какой шаг сохранения упал (wizard / site / branding).
- [ ] Successful save сбрасывает все три fingerprint refs.

**Rollback strategy:** frontend-only changes; backend endpoint optional and additive.

---

### Phase 3 — Step-scoped editor parity (Option B lite, 8–12 дней)

**Цель:** wizard step canvas использует тот же block editor API что CMS; nav panels — plugin slot.

| Задача | Файлы / модули | Риск | Rollback |
|--------|----------------|------|----------|
| `StepScopedPageEditor` adapter: `frames[stepId]` ↔ `blocks` | `StepScopedPageEditor.tsx` (new) | Frame loss on step switch | Keep WizardVisualEditor monolith |
| Extract `WizardNavPanel`, `WizardCardPanel`, `WizardFlowPanel` | `wizard/panels/*` (new) | UI regression | Inline in WizardVisualEditor |
| Card add/remove → sync nav.cards + block create/delete atomically | `wizardFrameUtils`, `WizardVisualEditor` | Desync nav/blocks | `syncDecomposedCardBlocks` repair util |
| Deprecate `wizard/card-grid-strela` migration path | `wizardFrameUtils.ts` | Old profiles break | Keep migration 1 release |

**Acceptance criteria:**

- [ ] Adding card from UI creates both nav entry and `wizard/selection-card` block.
- [ ] Removing card removes block and nav entry (with confirm).
- [ ] `StepScopedPageEditor` unit/integration test for frame round-trip.
- [ ] New profile created in Studio gets decomposed frames by default (`ensureStepFrame`).

**Migration risks:** profiles with hand-edited YAML (`acme-industrial`, `aqua-pro`) need validation script.

---

### Phase 4 — Long-term polish (2–4 недели, optional)

**Цель:** продуктовые улучшения без merge data model.

| Задача | Файлы | Риск |
|--------|-------|------|
| Compact step switcher in toolbar (dropdown vs full tree) | `WizardVisualEditor`, `StudioEditorTopBar` | UX confusion |
| DraftSitePreview: honor editor step | `DraftSitePreview`, `AdminProfileStudio` | Low |
| Mobile stack for decomposed selection-form | `WizardBlocks`, new responsive blocks | Medium |
| Single appearance source: block props only, deprecate appearance sidebar fields | `wizardFrameUtils`, branding | Data migration |
| Backend: optional `PUT /profiles/{id}/studio-bundle` (site + wizard + branding) | API | Ops complexity |

**Acceptance criteria:**

- [ ] Full-site preview opens wizard on same step as editor.
- [ ] PO sign-off on step switcher UX.
- [ ] appearance.sidebar_* read from funnel-sidebar block on live (fallback to branding).

---

## 6. Quick wins (1–2 дня) vs long bets

### Quick wins

| Item | Effort | Impact |
|------|--------|--------|
| Transactional error messages in `handleSaveWizard` | 2–4 h | High trust |
| Migrate `product-class` frame off `card-grid-strela` in default site.yaml | 2 h | Cleaner editor path |
| DraftSitePreview pass `previewWizardStepId` from studio state | 3 h | Preview parity |
| Extract shared keyboard handler to util | 4 h | Less duplication |
| Document dirty/save matrix in toolbar tooltip | 1 h | Operator clarity |

### Long bets

| Item | Effort | Impact |
|------|--------|--------|
| Full `StudioGridEditorShell` refactor (Phase 1) | 1–2 w | Maintainability |
| Backend composite save endpoint | 3–5 d | Reliability |
| Option C single blocks array | 2–3 mo | High risk / low immediate value |
| Mobile decomposed selection-form | 1–2 w | Live parity |
| Remove WizardEngine for all step types | 1 mo+ | Only if all steps decomposed |

---

## 7. Что НЕ унифицировать

| Компонент | Причина |
|-----------|---------|
| **PDF editor** | Pixel layout, ReportLab flow, отдельный template.json; другая палитра блоков |
| **Flows YAML** (`wizard/flows/*.yaml`) | Domain schema (sections, fields, validators, API bindings); не visual blocks |
| **WizardEngine runtime** | State machine, selection API, store; замена только после 100% decomposed + feature parity |
| **wizardStore / user progress** | Client session state; не часть Studio config |
| **navigation graph** (`parent`, `when`, `next`) | Не выразимо как static blocks без потери conditional logic |
| **Auth/cabinet page types** | Уже на GridPageContent; отдельные providers (AuthLoginProvider, AppShell) — осознанно |
| **Branding theme tokens** | Глобальные CSS variables; wizard appearance — локальная оболочка funnel |

---

## 8. Открытые решения для product owner

1. **Step UI в редакторе:** полное дерево шагов (как сейчас) vs compact dropdown в toolbar?
2. **Card editing:** карточка = запись в navigation.yaml (текущее) vs только block props (Phase 3)?
3. **Appearance:** оставить dual source (branding + block props) или migrate to block-only для sidebar?
4. **Legacy steps:** инвестировать в декомпозицию всех step types или допустить WizardEngine fallback indefinitely?
5. **Mobile selection-form:** приоритет responsive decomposed vs desktop-only Studio?
6. **Composite save API:** frontend sequential достаточно или нужен atomic backend endpoint для ops?
7. **Multi-profile rollout:** мигрировать все 4 profiles (`default`, `nord-minimal`, `acme-industrial`, `aqua-pro`) synchronously или default-first?
8. **Full-site preview:** должен ли следовать текущему шагу редактора или всегда entry step funnel?

---

## 9. Зависимости и ключевые файлы (reference)

### Routing & save

- `apps/web/src/pages/admin/AdminProfileStudio.tsx` — tab/mode routing, `handleSaveWizard`, editor mount
- `apps/web/src/routes/admin/studio/studioPages.ts` — editable page types
- `apps/api/app/api/routes/admin_site.py` — PUT wizard, PUT site, PUT branding

### Editors

- `apps/web/src/routes/admin/studio/canvas/VisualPageEditor.tsx` — CMS/auth/cabinet
- `apps/web/src/routes/admin/studio/wizard/WizardVisualEditor.tsx` — wizard steps/frames/nav
- `apps/web/src/routes/admin/studio/wizard/wizardFrameUtils.ts` — frames sync, decomposed migration
- `apps/web/src/routes/admin/studio/wizard/useWizardEditorUndo.ts` — unified wizard undo

### Render parity

- `apps/web/src/engine/WizardStepRenderer.tsx` — frames vs WizardEngine branch
- `apps/web/src/engine/WizardGridPage.tsx` — live wizard page
- `apps/web/src/engine/PageContentRouter.tsx` — CMS live/preview
- `apps/web/src/engine/GridPageContent.tsx` — shared grid renderer

### Config

- `config/profiles/default/site.yaml` — `pages[wizard].frames`
- `config/profiles/default/wizard/navigation.yaml` — steps, cards, flowRef
- `packages/contracts/src/site.ts` — `PageConfig.blocks` vs `PageConfig.frames`

### Tests

- `e2e/visual-validation.spec.ts` — regression harness
- `e2e/wizard.spec.ts` — live wizard smoke

---

## 10. Резюме решения

| Question | Answer |
|----------|--------|
| Recommended option | **A (UX shell) + B-lite in Phase 3** |
| Data model merge? | **No** (keep frames + navigation.yaml) |
| First sprint focus | Phase 0 + Phase 1 quick wins |
| «One canvas without steps» | One canvas **per selected step**; step switcher remains |
| WizardEngine rewrite? | **Not in 2026 H1 scope** |

---

*Автор: AI agent session 2026-06-21. Связанные документы: `studio-wizard-pages-unified-2026-06-20.md`, `studio-constructor-parity.md`, `studio-visual-validation-followup-2026-06-21.md`.*

---

## Implementation status (2026-06-21 session)

### Phase 0 — Stabilize

| Item | Status | Notes |
|------|--------|-------|
| Transactional wizard save | Done | `studioSaveUtils.saveWizardBundle()` — sequential PUT wizard → site → branding; `WizardSaveError` с этапом |
| Migrate `card-grid-strela` (default) | Done | `config/profiles/default/site.yaml` — `product-class` decomposed (sidebar/heading/selection-card) |
| E2E save/reload | Done | `e2e/visual-validation.spec.ts` — optional save+reload block после selection-form |
| Remove `WizardLiveCanvas` | Skipped | Компонент используется в `DraftSitePreview` / `DraftPagePreview` — не dead code |

### Phase 1 — Shared editor shell

| Item | Status |
|------|--------|
| `StudioGridEditorShell.tsx` | Done |
| `useStudioBlockEditor.ts` | Done |
| `VisualPageEditor` refactor | Done |
| `WizardVisualEditor` canvas refactor | Done |
| `studioGridMetrics.ts` | Done |

### Phase 2 — Unified dirty & save UX

| Item | Status |
|------|--------|
| `wizardBundleFingerprint()` | Done |
| Single dirty hint for wizard | Done — «Визард не сохранён (навигация + макет + оболочка)» |
| `saveWizardBundle()` | Done |
| Failed save phase label | Done — `(этап: навигация визарда / макет / оболочка)` |

### Phase 3 — Step-scoped editor parity (B-lite)

| Item | Status |
|------|--------|
| `StepScopedPageEditor.tsx` | Done — hook adapter `useStepScopedPageEditor` |
| `wizard/panels/*` | Done — Nav, Card, Flow panels |
| Card add/remove atomic sync | Already present — `addCardBlockToStep` / `removeCardBlockFromStep` |
| Deprecate `card-grid-strela` migration | Kept in `wizardFrameUtils` for one release (other profiles) |

### Phase 4 — Polish

| Item | Status |
|------|--------|
| `DraftSitePreview` + `previewWizardStepId` | Done |
| Compact step switcher in toolbar | Done — `WizardNavPanel` compact + `StudioEditorTopBar.wizardStepSwitcher` |
| Appearance fallback on live sidebar | Done — `WizardFunnelSidebarBlock` reads block props, fallback branding |

### Manual verification

1. Studio → «Подбор насосов» → decomposed blocks on `product-class`, undo/redo, Del/R, save.
2. Toolbar step dropdown switches canvas step; dirty clears after save.
3. Failed save (stop API) shows which PUT phase failed.
4. Full-site preview (if enabled) uses current editor step via `previewWizardStepId`.
5. `pnpm exec tsc --noEmit` in `apps/web` — no new errors in studio modules (pre-existing `AuthBlocks` fetchpriority).

### Remaining (optional)

- Backend `PUT /wizard-bundle` composite endpoint.
- Migrate `card-grid-strela` in non-default profiles (`acme-industrial`, `aqua-pro`).
- Unit test for `StepScopedPageEditor` frame round-trip.
- Playwright save/reload may SKIP if properties input selector misses — tighten selector after manual run.
