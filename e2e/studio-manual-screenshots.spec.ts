import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  loginAdmin,
  openStudioPagesTab,
  openStudioPdfTab,
  openStudioWizardTab,
  selectStudioPage,
  studioSidebar,
  waitForPdfPreviewReady,
  waitForPdfStudioReady,
} from "./helpers/studio";

const OUT_DIR = path.join(process.cwd(), "docs", "studio-manual", "screenshots");

function ensureDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function shot(page: import("@playwright/test").Page, name: string) {
  ensureDir();
  const filePath = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  return filePath;
}

test.describe("Studio manual screenshots", () => {
  test("capture editor screens", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });

    await loginAdmin(page);
    await shot(page, "01-admin-profiles");

    await page.goto("/admin/profiles/default");
    await expect(page.getByRole("button", { name: "Фронт" })).toBeVisible({ timeout: 20_000 });
    await shot(page, "02-studio-tabs");

    await openStudioPagesTab(page);
    await selectStudioPage(page, "Главная", "/home");
    await expect(page.locator("[data-testid=grid-canvas]").first()).toBeVisible({ timeout: 15_000 });
    await shot(page, "03-cms-home-canvas");

    const sidebar = studioSidebar(page);
    await sidebar.getByRole("button", { name: "Блоки" }).click();
    await shot(page, "04-block-palette");

    await openStudioWizardTab(page);
    await expect(page.getByText("Подбор насосов").first()).toBeVisible({ timeout: 15_000 });
    await shot(page, "05-wizard-canvas");

    await sidebar.getByRole("button", { name: "Слои" }).click();

    const stepCard = page.getByText("Линейка гидромодулей", { exact: false }).first();
    if (await stepCard.isVisible().catch(() => false)) {
      await stepCard.click();
      await page.waitForTimeout(500);
    }

    const sidebarLayer = sidebar.getByText("Сайдбар Strela", { exact: true }).first();
    if (await sidebarLayer.isVisible().catch(() => false)) {
      await sidebarLayer.click();
      await page.waitForTimeout(500);
      await shot(page, "06-wizard-sidebar-props");
    } else {
      const canvasSidebar = page.locator('[data-block-type="wizard/funnel-sidebar"]').first();
      if (await canvasSidebar.isVisible().catch(() => false)) {
        await canvasSidebar.click();
        await page.waitForTimeout(500);
        await shot(page, "06-wizard-sidebar-props");
      }
    }

    const cardLayer = sidebar.getByText("Карточка подбора", { exact: true }).first();
    if (await cardLayer.isVisible().catch(() => false)) {
      await cardLayer.click();
      await page.waitForTimeout(500);
      await shot(page, "07-wizard-card-props");
    } else {
      const canvasCard = page.locator('[data-block-type="wizard/selection-card"]').first();
      if (await canvasCard.isVisible().catch(() => false)) {
        await canvasCard.click();
        await page.waitForTimeout(500);
        await shot(page, "07-wizard-card-props");
      }
    }

    const formStep = page.getByText("Подбор насосной установки", { exact: false }).first();
    if (await formStep.isVisible().catch(() => false)) {
      await formStep.scrollIntoViewIfNeeded();
      await formStep.click();
      await page.waitForTimeout(800);
    } else {
      for (const label of ["Тип установки", "Подбор насосной установки"]) {
        const row = page.getByText(label, { exact: false }).first();
        if (await row.isVisible().catch(() => false)) {
          await row.click();
          await page.waitForTimeout(500);
        }
      }
    }
    await sidebar.getByRole("button", { name: "Слои" }).click();
    const headerLayer = sidebar.getByText("Шапка формы подбора", { exact: true }).first();
    if (await headerLayer.isVisible().catch(() => false)) {
      await headerLayer.click();
      await page.waitForTimeout(500);
      await shot(page, "07-wizard-header-props");
    }

    await openStudioPdfTab(page);
    await waitForPdfStudioReady(page);
    await page.keyboard.press("Escape");
    await expect(page.getByText("PDF шаблон").first()).toBeVisible({ timeout: 10_000 }).catch(() => undefined);
    await shot(page, "08-pdf-editor");

    await page.getByRole("button", { name: "Превью" }).click();
    await waitForPdfPreviewReady(page);
    await shot(page, "09-preview-button");
  });
});
