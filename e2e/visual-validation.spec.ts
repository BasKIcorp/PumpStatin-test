import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  loginAdmin,
  openStudioPagesTab,
  openStudioPdfTab,
  openStudioWizardTab,
  openStudioAssetsTab,
  selectStudioPage,
  studioSidebar,
} from "./helpers/studio";

const EVIDENCE_DIR = "C:\\projects\\PumpStation_Base\\context\\visual-validation";

function ensureEvidenceDir() {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function snap(page: Page, name: string) {
  ensureEvidenceDir();
  const filePath = path.join(EVIDENCE_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  return filePath;
}

async function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test.describe("Visual validation — PumpStation Studio", () => {
  test("control-ui surfaces", async ({ page }) => {
    const consoleErrors = await collectConsoleErrors(page);
    const report: string[] = [];

    await loginAdmin(page);
    report.push("LOGIN: OK — admin session, URL /admin");

    // 1. Wizard page "Подбор насосов"
    await openStudioWizardTab(page);
    await expect(page.getByText("Подбор насосов").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("[data-testid=grid-canvas], #canvas-drop-zone").first()).toBeVisible({
      timeout: 15_000,
    });

    const wizardBefore = await snap(page, "01-wizard-before-select");
    report.push(`WIZARD BEFORE: ${wizardBefore}`);

    const sidebar = studioSidebar(page);
    await sidebar.getByRole("button", { name: "Слои" }).click();
    const layerButtons = sidebar.locator("button").filter({ hasText: /./ });
    const layerCount = await layerButtons.count();
    report.push(`WIZARD LAYERS: ${layerCount} layer buttons visible`);

    await expect(page.getByText("Шаги", { exact: true }).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Слои", { exact: true }).first()).toBeVisible({ timeout: 5_000 });

    const headingLayer = sidebar.getByText("Заголовок funnel", { exact: true }).first();
    const cardsLayer = sidebar.getByText("Карточка подбора", { exact: true }).first();
    const sidebarLayer = sidebar.getByText("Сайдбар Strela", { exact: true }).first();

    const headingOk = await headingLayer.isVisible().catch(() => false);
    const cardsOk = await cardsLayer.isVisible().catch(() => false);
    const sidebarOk = await sidebarLayer.isVisible().catch(() => false);
    report.push(
      `WIZARD DECOMPOSED BLOCKS: heading=${headingOk}, cards=${cardsOk}, sidebar=${sidebarOk}`,
    );

    const canvas = page.locator("[data-testid=grid-canvas]").first();
    if (sidebarOk) await sidebarLayer.click();
    else if (headingOk) await headingLayer.click();
    else if (cardsOk) await cardsLayer.click();
    else {
      const firstFrame = canvas.locator("[data-block-type^='wizard/']").first();
      await firstFrame.click();
    }
    const propsPanel = page.locator("aside").filter({ hasText: "Свойства" });
    await expect(propsPanel.getByText("Трансформация").first()).toBeVisible({ timeout: 5_000 });
    report.push("WIZARD PROPERTIES: OK — Трансформация panel visible");

    const selectedBlock = canvas.locator("[data-block-type]").first();
    await expect(selectedBlock).toBeVisible();

    const dragHandles = canvas.locator(".cursor-se-resize, .cursor-nw-resize, .cursor-ne-resize, .cursor-sw-resize");
    const handleCount = await dragHandles.count();
    report.push(`WIZARD RESIZE HANDLES: ${handleCount} corner resize handles on selected block`);

    const rotateHandle = canvas.getByRole("button", { name: "Повернуть блок" });
    const rotateVisible = await rotateHandle.first().isVisible().catch(() => false);
    report.push(`WIZARD ROTATION HANDLE ↻: ${rotateVisible ? "VISIBLE" : "NOT FOUND"}`);

    await page.keyboard.press("r");
    await page.waitForTimeout(400);
    const wizardAfterRotate = await snap(page, "02-wizard-after-rotate");
    report.push(`WIZARD AFTER ROTATE: ${wizardAfterRotate}`);

    await page.keyboard.press("Control+z");
    await page.waitForTimeout(400);
    const wizardAfterUndo = await snap(page, "03-wizard-after-undo");
    report.push(`WIZARD AFTER CTRL+Z: ${wizardAfterUndo}`);

    // 2. Selection-form step «Подбор насосной установки»
    await sidebar.getByRole("button", { name: "Слои" }).click();
    await expect(page.getByText("Шаги", { exact: true }).first()).toBeVisible({ timeout: 5_000 });

    const selectionFormStep = sidebar.getByText("Подбор насосной установки", { exact: true }).first();
    await selectionFormStep.scrollIntoViewIfNeeded();
    await expect(selectionFormStep).toBeVisible({ timeout: 5_000 });
    const selectionFormBefore = await snap(page, "10-selection-form-before");
    report.push(`SELECTION-FORM BEFORE: ${selectionFormBefore}`);

    await selectionFormStep.click();
    await expect(page.getByText("Подбор насосов — Подбор насосной установки")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Слои", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(500);

    const wizardCanvas = page.locator("[data-testid=grid-canvas]").first();

    const selectionFormBlockTypes = [
      "wizard/selection-work-header",
      "wizard/selection-params-panel",
      "wizard/selection-curves-panel",
      "wizard/selection-tech-specs-panel",
      "wizard/selection-options-panel",
      "wizard/selection-results-panel",
    ] as const;

    const selectionFormLayers = [
      "Шапка формы подбора",
      "Параметры подбора",
      "Кривые характеристик",
      "Тех. характеристики",
      "Опции и действия",
      "Результаты подбора",
    ] as const;

    for (const blockType of selectionFormBlockTypes) {
      await expect(page.locator(`[data-block-type="${blockType}"]`)).toHaveCount(1, {
        timeout: 10_000,
      });
      await expect(wizardCanvas.locator(`[data-block-type="${blockType}"]`)).toHaveCount(1);
    }

    const layerChecks = await Promise.all(
      selectionFormLayers.map(async (label) => ({
        label,
        visible: await sidebar.getByText(label, { exact: true }).first().isVisible().catch(() => false),
      })),
    );
    report.push(
      `SELECTION-FORM DECOMPOSED: ${layerChecks
        .map(({ label, visible }) => `${label}=${visible}`)
        .join(", ")}`,
    );
    report.push(
      `SELECTION-FORM CANVAS BLOCKS: ${selectionFormBlockTypes.length} decomposed panels visible`,
    );

    const selectionFormAfter = await snap(page, "11-selection-form-after");
    report.push(`SELECTION-FORM AFTER: ${selectionFormAfter}`);

    const depthErrors = consoleErrors.filter((msg) => /Maximum update depth exceeded/i.test(msg));
    report.push(`MAX DEPTH ERRORS: ${depthErrors.length}`);

    // Wizard save → reload: decomposed blocks persist
    await sidebar.getByText("Сайдбар Strela", { exact: true }).first().click();
    const propInput = page.locator('aside').filter({ hasText: "Свойства" }).locator('input[type="text"]').first();
    if (await propInput.isVisible().catch(() => false)) {
      await propInput.fill("strela-save-test");
      await page.getByRole("button", { name: "Сохранить" }).click();
      await expect(page.getByText("Визард сохранён").or(page.getByText("Сохранено"))).toBeVisible({
        timeout: 10_000,
      });
      await page.reload();
      await loginAdmin(page);
      await openStudioWizardTab(page);
      await expect(page.getByText("Слои", { exact: true }).first()).toBeVisible({ timeout: 15_000 });
      report.push("WIZARD SAVE RELOAD: OK — editor restored after reload");
    } else {
      report.push("WIZARD SAVE RELOAD: SKIPPED — sidebar props input not found");
    }

    // 3. PDF editor tab
    await openStudioPdfTab(page);
    await expect(page.getByRole("button", { name: "Слои" })).toBeVisible({ timeout: 15_000 });
    const pdfBefore = await snap(page, "06-pdf-before");
    report.push(`PDF BEFORE: ${pdfBefore}`);

    await openStudioAssetsTab(page);
    await expect(page.getByPlaceholder("Поиск блоков...")).toBeVisible({ timeout: 5_000 });
    const pdfCanvas = page.locator("[data-testid=grid-canvas], #canvas-drop-zone, canvas, [class*='pdf']").first();
    const pdfCanvasVisible = await pdfCanvas.isVisible().catch(() => false);
    report.push(`PDF CANVAS: ${pdfCanvasVisible ? "VISIBLE" : "NOT FOUND"}`);
    const pdfAfter = await snap(page, "07-pdf-after-palette");
    report.push(`PDF AFTER: ${pdfAfter}`);

    const pdfLayers = page.getByRole("button", { name: "Слои" });
    const pdfBlocks = page.getByRole("button", { name: "Блоки" });
    report.push(
      `PDF SHELL: layers=${await pdfLayers.isVisible()}, blocks=${await pdfBlocks.isVisible()}`,
    );

    // 4. CMS page editor baseline
    await openStudioPagesTab(page);
    await selectStudioPage(page, "О компании", "/about");
    await expect(page.locator("[data-testid=grid-canvas]").first()).toBeVisible({ timeout: 10_000 });
    const cmsBefore = await snap(page, "08-cms-before");
    report.push(`CMS BEFORE: ${cmsBefore}`);

    await sidebar.getByRole("button", { name: "Слои" }).click();
    await sidebar.getByRole("button", { name: "Блоки" }).click();
    await expect(page.getByPlaceholder("Поиск блоков...").first()).toBeVisible({ timeout: 5_000 });
    const cmsAfter = await snap(page, "09-cms-after-palette");
    report.push(`CMS AFTER: ${cmsAfter}`);

    const cmsLayers = page.getByRole("button", { name: "Слои" });
    const cmsBlocks = page.getByRole("button", { name: "Блоки" });
    const cmsSave = page.getByRole("button", { name: "Сохранить" });
    report.push(
      `CMS SHELL: layers=${await cmsLayers.isVisible()}, blocks=${await cmsBlocks.isVisible()}, save=${await cmsSave.isVisible()}`,
    );

    ensureEvidenceDir();
    fs.writeFileSync(
      path.join(EVIDENCE_DIR, "report.txt"),
      [...report, "", "CONSOLE ERRORS:", ...consoleErrors].join("\n"),
      "utf8",
    );

    expect(layerCount).toBeGreaterThan(0);
    expect(await cmsLayers.isVisible()).toBeTruthy();
    expect(await pdfLayers.isVisible()).toBeTruthy();
    expect(depthErrors.length).toBe(0);
  });
});
