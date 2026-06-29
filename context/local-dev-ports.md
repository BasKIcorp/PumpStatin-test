# Локальный dev — порты (автоподбор)

Команда: `pnpm dev:local` (`scripts/dev.ps1`)

- Если **8000** занят, но API уже отвечает `/health` — переиспользуется.
- Иначе API: 8000 → 8001 → 8010 → 8020 → 8030.
- Web: 5173 → 5180 → 5188 → 5190 → 5195 → 5200.
- Актуальные URL пишутся в `.dev-ports.json` (в gitignore).

E2e Playwright: порт **5199** (отдельно от dev).

Последний запуск: API **8000**, Web **5188** — http://127.0.0.1:5188

## E2e

Playwright web: порт **5199**, `reuseExistingServer: false` (всегда свежий билд).

- Workers локально: **2**; visual-specs в проекте `chromium-visual` (workers: 1).
- `studio.spec.ts` — serial (общий профиль default).
- Выбор шага визарда: `selectWizardStep(page, stepId)` → `data-testid="wizard-step-switcher"` или `[data-wizard-step-id]`.
- `openStudioWizardTab` ждёт `wizard-step-switcher` после открытия страницы.

Слои Studio: `data-layer-block-type` (не дублирует `data-block-type` на canvas).

**Статус:** `pnpm exec playwright test e2e/` — 20–21/21; API pytest 17/17.

Git: `8bd19ff` (локально, push при сети) — mobile stack selection-form.

Mobile stack: `SelectionFormDecomposedLayout` — live `lg:hidden` / studio viewport &lt;1024.
