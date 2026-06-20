import { test, expect } from "@playwright/test";
import {
  loginAdmin,
  loginStrela,
  waitStudioReady,
  openStudioPagesTab,
  openStudioPdfTab,
  openStudioWizardTab,
  openStudioAssetsTab,
  selectStudioPage,
  addBlockFromPalette,
  expectCanvasBlockCount,
  studioSidebar,
} from "./helpers/studio";

test.describe("Studio D&D", () => {
  test("page selector lists wizard pump selection page", async ({ page }) => {
    await loginAdmin(page);
    await openStudioPagesTab(page);
    const pageBtn = page.locator("header button").filter({ has: page.locator("span", { hasText: "▾" }) });
    await pageBtn.click();
    const menu = page.locator("div.absolute.top-full.z-50").filter({ hasText: "Страницы" });
    await expect(menu).toBeVisible({ timeout: 5_000 });
    await expect(menu.getByText("Подбор насосов", { exact: true }).first()).toBeVisible();
    await menu.getByText("Подбор насосов", { exact: true }).first().click();
    await expect(page.getByText("Шаги", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
  });

  test("login page editor renders auth blocks on canvas", async ({ page }) => {
    await loginAdmin(page);
    await openStudioPagesTab(page);
    await selectStudioPage(page, "Вход", "/login");
    await expect(page.locator("[data-testid=grid-canvas] [data-block-type='auth/login-form']")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.locator("[data-testid=grid-canvas] [data-block-type='auth/brand-panel']"),
    ).toBeVisible();
  });

  test("login page: select block from layers and edit title", async ({ page }) => {
    await loginAdmin(page);
    await waitStudioReady(page);
    await selectStudioPage(page, "Вход", "/login");

    const sidebar = studioSidebar(page);
    await sidebar.getByRole("button", { name: "Слои" }).click();
    await sidebar.getByText("Форма входа").first().click();

    const propsPanel = page.locator("aside").filter({ hasText: "Свойства" });
    await expect(propsPanel.getByText("Форма входа").first()).toBeVisible({ timeout: 5_000 });
    const titleInput = propsPanel.locator("label", { hasText: "Заголовок" }).locator("xpath=following-sibling::*[1]");
    await titleInput.fill("Тестовый вход");
    await expect(page.locator("[data-testid=grid-canvas] h2").filter({ hasText: "Тестовый вход" })).toBeVisible({
      timeout: 5_000,
    });
  });

  test("login page: brand panel selectable from layers", async ({ page }) => {
    await loginAdmin(page);
    await waitStudioReady(page);
    await selectStudioPage(page, "Вход", "/login");

    const sidebar = studioSidebar(page);
    await sidebar.getByRole("button", { name: "Слои" }).click();
    await sidebar.getByText("Бренд (login)").first().click();
    await expect(page.locator("aside").filter({ hasText: "Свойства" }).getByText("URL логотипа")).toBeVisible({
      timeout: 5_000,
    });
  });

  test("CMS page editor: palette and layers visible", async ({ page }) => {
    await loginAdmin(page);
    await waitStudioReady(page);
    await openStudioAssetsTab(page);
    await expect(page.getByPlaceholder("Поиск блоков...").first()).toBeVisible({ timeout: 5_000 });
  });

  test("wizard visual editor opens from page selector", async ({ page }) => {
    await loginAdmin(page);
    await openStudioWizardTab(page);
    await expect(page.getByText("Подбор насосов").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Шаги").first()).toBeVisible();
    await openStudioAssetsTab(page);
    await expect(page.getByText("Шаг: карточки").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Блоки на шаге").first()).toBeVisible({ timeout: 5_000 });
  });

  test("PDF editor: layers and palette", async ({ page }) => {
    await loginAdmin(page);
    await openStudioPdfTab(page);
    await expect(page.getByRole("button", { name: "Слои" })).toBeVisible({ timeout: 15_000 });
    await openStudioAssetsTab(page);
    await expect(page.getByPlaceholder("Поиск блоков...")).toBeVisible({ timeout: 5_000 });
  });

  test("public CMS home page renders hero", async ({ page }) => {
    await loginStrela(page);

    const site = await page.evaluate(async () => {
      const raw = localStorage.getItem("pumpstation-auth");
      const token = raw ? (JSON.parse(raw).state?.token as string | null) : null;
      const res = await fetch("/api/v1/config/site", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return res.json() as Promise<{ pages?: Array<{ route: string; blocks?: unknown[] }> }>;
    });
    const home = site.pages?.find((p) => p.route === "/home");
    expect(home?.blocks?.length).toBeGreaterThan(0);

    await page.goto("/home");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 20_000 });
  });

  test("CMS add block, save and reload persists layer", async ({ page }) => {
    await loginAdmin(page);
    await waitStudioReady(page);
    await selectStudioPage(page, "О компании", "/about");
    await expectCanvasBlockCount(page, 1);

    await addBlockFromPalette(page, "Разделитель");
    await expectCanvasBlockCount(page, 2);

    await page.getByRole("button", { name: "Сохранить" }).click();
    await expect(page.getByText("Сохранено").first()).toBeVisible({ timeout: 10_000 });

    const hasDivider = await page.evaluate(async () => {
      const raw = localStorage.getItem("pumpstation-auth");
      const token = raw ? (JSON.parse(raw).state?.token as string | null) : null;
      const res = await fetch("/api/v1/admin/profiles/default/site", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const site = await res.json();
      const about = site.pages?.find((p: { id: string }) => p.id === "about");
      return (about?.blocks?.filter((b: { type: string }) => b.type === "divider").length ?? 0) >= 2;
    });
    expect(hasDivider).toBe(true);

    await page.reload();
    await loginAdmin(page);
    await waitStudioReady(page);
    await selectStudioPage(page, "О компании", "/about");
    await expectCanvasBlockCount(page, 2);
  });
});
