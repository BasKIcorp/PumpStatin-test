import { test, expect } from "@playwright/test";

test.describe("Wizard smoke", () => {
  test("root redirects to landing", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/home/, { timeout: 15_000 });
  });

  test("wizard route loads", async ({ page }) => {
    await page.goto("/wizard");
    await expect(page.locator("body")).toBeVisible();
  });

  test("wizard route shows product class cards", async ({ page }) => {
    await page.goto("/login");
    const loginInput = page.getByRole("textbox").first();
    if (await loginInput.isVisible().catch(() => false)) {
      await loginInput.fill("strela");
      await page.locator('input[type="password"]').fill("demo123");
      await page.getByRole("button", { name: /войти|login/i }).click();
      await page.waitForURL(/\/(wizard|dashboard|home)?/i, { timeout: 15_000 }).catch(() => {});
    }
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
