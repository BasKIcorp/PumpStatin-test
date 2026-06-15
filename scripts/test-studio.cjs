const { chromium } = require("playwright");
const path = require("path");

const BASE = "http://localhost:5173";
const SHOTS = path.join(__dirname, "..", "evidence", "studio-test");
const fs = require("fs");

async function shot(page, name) {
  await page.waitForTimeout(500);
  const p = path.join(SHOTS, `${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  console.log(`  📸 ${name}.png`);
}

async function run() {
  fs.mkdirSync(SHOTS, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "ru-RU",
  });
  const page = await context.newPage();

  // 1. Login page
  console.log("\n1. Login page:");
  await page.goto(BASE, { waitUntil: "networkidle" });
  await shot(page, "01-login");
  console.log(`   URL: ${page.url()}`);

  // 2. Login as admin
  console.log("\n2. Login as admin:");
  const textInputs = page.locator('input:not([type="hidden"]):not([type="checkbox"])');
  const count = await textInputs.count();
  console.log(`   Inputs found: ${count}`);
  
  if (count >= 2) {
    await textInputs.nth(0).fill("admin");
    await textInputs.nth(1).fill("demo123");
  }
  
  const loginBtn = page.locator('button[type="submit"], a:has-text("Войти")');
  if (await loginBtn.isVisible()) {
    await loginBtn.click();
  }
  
  await page.waitForTimeout(2000);
  console.log(`   URL after login: ${page.url()}`);
  await shot(page, "02-after-login");

  // 3. Admin profiles list
  console.log("\n3. Admin /profiles:");
  await page.goto(`${BASE}/admin/profiles`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await shot(page, "03-admin-profiles");

  // Check for "Конструктор" links
  const constructorLinks = await page.locator('a:has-text("Конструктор")').count();
  console.log(`   "Конструктор" links: ${constructorLinks}`);

  // 4. Open studio for default profile (correct ID!)
  console.log("\n4. Studio for profile 'default':");
  await page.goto(`${BASE}/admin/profiles/default`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await shot(page, "04-studio-loaded");

  const studioBody = await page.locator("body").innerText();
  console.log(`   Studio loaded: ${studioBody.includes("Конструктор") ? "✅" : "❌"}`);

  // Check all 5 tabs
  const tabLabels = ["Стили", "Страницы", "Layout", "Визард", "PDF"];
  for (const tab of tabLabels) {
    const tabBtn = page.locator(`button:has-text("${tab}")`);
    const exists = await tabBtn.isVisible().catch(() => false);
    console.log(`   Tab "${tab}": ${exists ? "✅" : "❌"}`);
  }

  // 5. Theme tab (Стили - should be active by default)
  console.log("\n5. Theme editor:");
  await page.waitForTimeout(300);
  await shot(page, "05-theme-editor");
  const colorPickers = await page.locator('input[type="color"]').count();
  console.log(`   Color pickers: ${colorPickers}`);

  // 6. Pages tab
  console.log("\n6. Pages tab:");
  await page.locator('button:has-text("Страницы")').click();
  await page.waitForTimeout(500);
  await shot(page, "06-pages-tab");
  const hasWizard = await page.getByText("Подбор").first().isVisible().catch(() => false);
  console.log(`   "Подбор" page: ${hasWizard ? "✅" : "❌"}`);

  // 7. Layout tab
  console.log("\n7. Layout tab:");
  await page.locator('button:has-text("Layout")').click();
  await page.waitForTimeout(500);
  await shot(page, "07-layout-editor");
  const hasMenu = await page.getByText("Меню шапки").isVisible().catch(() => false);
  console.log(`   Menu editor: ${hasMenu ? "✅" : "❌"}`);

  // 8. PDF tab
  console.log("\n8. PDF tab:");
  await page.locator('button:has-text("PDF")').click();
  await page.waitForTimeout(500);
  await shot(page, "08-pdf-placeholder");
  const hasPdf = await page.getByText("Конструктор PDF").isVisible().catch(() => false);
  console.log(`   PDF placeholder: ${hasPdf ? "✅" : "❌"}`);

  // 9. Main wizard
  console.log("\n9. Main page (wizard):");
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await shot(page, "09-main-wizard");
  const wizardText = await page.locator("body").innerText();
  const hasWizardContent = wizardText.includes("Подбор") || wizardText.includes("Выйти");
  console.log(`   Wizard page: ${hasWizardContent ? "✅" : "❌"}`);

  await browser.close();
  console.log("\n✅ Tests complete. Screenshots in evidence/studio-test/");
}

run().catch((err) => {
  console.error("❌ Test failed:", err.message);
  process.exit(1);
});
