import { test, expect } from "@playwright/test";
import path from "node:path";
import {
  loginAdmin,
  openStudioPdfTab,
  openStudioWizardTab,
  studioSidebar,
} from "./helpers/studio";

const outDir = path.join(process.cwd(), "context", "ui-probes");

test.describe.configure({ mode: "serial" });

test.describe("Studio visual probes", () => {
  test("wizard + PDF + transform panel screenshots", async ({ page }) => {
    await loginAdmin(page);
    await openStudioWizardTab(page);
    await page.screenshot({ path: path.join(outDir, "wizard-steps.png"), fullPage: true });

    const canvas = page.locator("[data-testid=grid-canvas]").first();
    await expect(canvas).toBeVisible({ timeout: 10_000 });
    const sidebarBlock = canvas.locator('[data-block-type="wizard/funnel-sidebar"]').first();
    if (await sidebarBlock.isVisible().catch(() => false)) {
      await sidebarBlock.click({ force: true });
      await expect(page.getByText("Трансформация").first()).toBeVisible({ timeout: 5_000 });
      await page.screenshot({ path: path.join(outDir, "wizard-sidebar-transform.png"), fullPage: true });
      const rotateHandle = page.getByLabel("Повернуть блок", { exact: true });
      if (await rotateHandle.isVisible().catch(() => false)) {
        await expect(rotateHandle).toBeVisible();
      }
    }

    await openStudioPdfTab(page);
    await expect(page.getByRole("button", { name: "Слои" })).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: path.join(outDir, "pdf-editor.png"), fullPage: true });

    const sidebar = studioSidebar(page);
    await sidebar.getByRole("button", { name: "Блоки" }).click();
    await expect(page.getByPlaceholder("Поиск блоков...")).toBeVisible({ timeout: 5_000 });
  });
});
