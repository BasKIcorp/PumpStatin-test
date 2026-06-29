# PDF-инструкция Studio (2026-06-21)

- **Файл:** `docs/studio-manual/Studio-Editor-Manual.pdf`
- **Скриншоты:** `docs/studio-manual/screenshots/`
- **Сборка скриншотов (production):**
  ```powershell
  cd C:\projects\PumpStation_Base
  $env:CI='1'
  $env:PLAYWRIGHT_BASE_URL='http://83.222.16.200'
  pnpm exec playwright test e2e/studio-manual-screenshots.spec.ts --project=chromium
  ```
- **Сборка PDF:**
  ```powershell
  cd C:\projects\PumpStation_Base\apps\api
  python -m app.tools.build_studio_manual_pdf
  ```

## Fix: loading states in PDF screenshots (2026-06-21)

- **Проблема:** `08-pdf-editor.png` и `09-preview-button.png` захватывали «Загрузка PDF шаблона...» и «Генерация PDF…».
- **Исправление:** `waitForPdfStudioReady` / `waitForPdfPreviewReady` в `e2e/helpers/studio.ts`; spec ждёт canvas и blob-preview; `data-testid="pdf-studio-ready"` на `PdfStudioEditor` после загрузки.
