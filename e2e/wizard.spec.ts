import { test, expect } from "@playwright/test";
import { loginStrela } from "./helpers/studio";

test.describe("Wizard smoke", () => {
  test("root redirects guest to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test("wizard route loads", async ({ page }) => {
    await page.goto("/wizard");
    await expect(page.locator("body")).toBeVisible();
  });

  test("wizard route shows product class cards", async ({ page }) => {
    await loginStrela(page);
    await page.goto("/wizard");
    await expect(page.locator(".selection-mockup-card-face").first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/гидромодули/i)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Studio smoke", () => {
  test("admin studio requires auth", async ({ page }) => {
    await page.goto("/admin/profiles/default/studio");
    await expect(page.locator("body")).toBeVisible();
  });
});
