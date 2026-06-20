import { test, expect } from "@playwright/test";
import { loginAdmin, loginStrela, waitStudioReady, selectStudioPage } from "./helpers/studio";

test.describe("Grid constructor", () => {
  test("login page renders auth blocks from site.yaml", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('[data-block-type="auth/login-form"]')).toBeVisible({
      timeout: 15_000,
    });
  });

  test("studio grid canvas shows block layout attributes", async ({ page }) => {
    await loginAdmin(page);
    await waitStudioReady(page);
    await selectStudioPage(page, "О компании");
    await expect(page.locator("[data-testid=grid-canvas]")).toBeVisible({ timeout: 10_000 });
  });

  test("live about page has grid block with layout", async ({ page }) => {
    await loginStrela(page);
    await page.goto("/about");
    const divider = page.locator('[data-block-type="divider"]').first();
    await expect(divider).toBeVisible({ timeout: 15_000 });
    await expect(divider).toHaveAttribute("data-grid-w", "12");
  });

  test("wizard frame product-class visible after login", async ({ page }) => {
    await loginStrela(page);
    await expect(
      page.locator('[data-block-type="wizard/card-grid-strela"]').first(),
    ).toBeVisible({ timeout: 20_000 });
  });
});
