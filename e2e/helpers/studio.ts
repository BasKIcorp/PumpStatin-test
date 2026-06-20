import { expect, type Page } from "@playwright/test";

export async function loginAdmin(page: Page) {
  await page.goto("/login");
  const adminBtn = page.locator('[data-block-type="auth/admin-entry"] button');
  if (await adminBtn.isVisible().catch(() => false)) {
    await adminBtn.click();
  } else {
    await page.getByRole("textbox").first().fill("admin");
    await page.locator('input[type="password"]').fill("demo123");
    await page.getByRole("button", { name: /^Войти$/i }).click();
  }
  await expect(page).toHaveURL(/\/admin/, { timeout: 20_000 });
}

export async function loginStrela(page: Page) {
  await page.goto("/login");
  await page.getByRole("textbox").first().fill("strela");
  await page.locator('input[type="password"]').fill("demo123");
  await page.getByRole("button", { name: /^Войти$/i }).click();
  await page.waitForURL(
    (url) => {
      const path = new URL(url).pathname;
      return path === "/home" || path === "/wizard";
    },
    { timeout: 20_000 },
  );
}

export async function openStudioPagesTab(page: Page) {
  await page.goto("/admin/profiles/default");
  await expect(page.getByRole("button", { name: "Фронт" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Страницы" }).click();
}

export async function openStudioPdfTab(page: Page) {
  await page.goto("/admin/profiles/default");
  await expect(page.getByRole("button", { name: "PDF" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "PDF" }).click();
}

export async function openStudioWizardTab(page: Page) {
  await page.goto("/admin/profiles/default");
  await expect(page.getByRole("button", { name: "Фронт" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Страницы" }).click();
  await selectStudioPage(page, "Подбор насосов", "/wizard");
}

export async function waitStudioReady(page: Page) {
  await openStudioPagesTab(page);
  await expect(page.getByRole("button", { name: "Слои" })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("[data-testid=grid-canvas], #canvas-drop-zone").first()).toBeVisible({
    timeout: 15_000,
  });
}

export function studioSidebar(page: Page) {
  return page.locator("aside").filter({ has: page.getByRole("button", { name: "Блоки" }) });
}

export async function openStudioAssetsTab(page: Page) {
  await page.getByRole("button", { name: "Блоки" }).click();
}

export async function selectStudioPage(page: Page, title: string, route?: string) {
  const pageBtn = page.locator("header button").filter({ has: page.locator("span", { hasText: "▾" }) });
  await expect(pageBtn).toBeVisible({ timeout: 10_000 });
  await pageBtn.click();
  const menu = page.locator("div.absolute.top-full.z-50").filter({ hasText: "Страницы" });
  await expect(menu).toBeVisible({ timeout: 5_000 });
  const row = route
    ? menu.locator("div.group").filter({ hasText: route })
    : menu.locator("div.group").filter({ hasText: title });
  await row.first().click();
  await expect(page.locator("[data-testid=grid-canvas]").first()).toBeVisible({ timeout: 10_000 });
}

export async function expectLayerVisible(page: Page, label: string) {
  const sidebar = studioSidebar(page);
  await sidebar.getByRole("button", { name: "Слои" }).click();
  await expect(sidebar.getByText(label, { exact: true }).first()).toBeVisible({ timeout: 10_000 });
}

export async function addBlockFromPalette(page: Page, label: string) {
  const sidebar = studioSidebar(page);
  await sidebar.getByRole("button", { name: "Блоки" }).click();
  await sidebar.locator('button[type="button"]').filter({ hasText: label }).click();
}

export async function expectCanvasBlockCount(page: Page, count: number) {
  await expect(page.locator("[data-testid=grid-canvas] [data-block-type]")).toHaveCount(count, {
    timeout: 10_000,
  });
}

export async function expectCanvasBlock(page: Page, blockType: string) {
  await expect(
    page.locator("[data-testid=grid-canvas]").locator(`[data-block-type="${blockType}"]`).first(),
  ).toBeVisible({ timeout: 10_000 });
}

export async function siteAboutHasDivider(page: Page) {
  return page.evaluate(async () => {
    const raw = localStorage.getItem("pumpstation-auth");
    const token = raw ? (JSON.parse(raw).state?.token as string | null) : null;
    const res = await fetch("/api/v1/admin/profiles/default/site", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const site = await res.json();
    const about = site.pages?.find((p: { id: string }) => p.id === "about");
    return about?.blocks?.some((b: { type: string }) => b.type === "divider") ?? false;
  });
}
