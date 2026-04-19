/**
 * vps.debug.spec.ts
 * ─────────────────
 * ЗАПУСТИТЬ ПЕРВЫМ перед vps.funnel.spec.ts
 * Цель: собрать реальные CSS-классы и атрибуты с живого DOM
 * Запуск: npx playwright test tests/vps.debug.spec.ts --project=chromium --headed
 *
 * После запуска скопируй консольный вывод и обнови:
 *   - pages/VpsPage.ts   (если селекторы Deploy Now отличаются)
 *   - pages/VpsConfigPage.ts  (OS-блок и аддоны)
 *   - selectors.ts       (добавь VPS-раздел)
 */
import { test, expect, type Page } from "@playwright/test";

const BASE_URL = "https://godlike.host";
const EMAIL = "test@testmail.com";
const PASSWORD = "test@testmail.com";
const storageStatePath = "storageState.vps.json";

// ─── Helper: dump all elements matching a partial class name ───────────────
async function dumpElements(page: Page, partialClass: string, label: string) {
  const els = await page.locator(`[class*="${partialClass}"]`).all();
  console.log(`\n[DUMP: ${label}] ${els.length} elements`);
  for (const el of els.slice(0, 30)) {
    const cls = await el.getAttribute("class").catch(() => "");
    const tag = await el.evaluate((e) => e.tagName.toLowerCase());
    const txt = (await el.innerText().catch(() => "")).trim().slice(0, 60);
    const vis = await el.isVisible();
    if (vis) console.log(`  <${tag}> class="${cls}" text="${txt}"`);
  }
}

// ─── beforeAll: логин и сохранение storageState ───────────────────────────
test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/clientarea/login`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.fill("#inputEmail", EMAIL);
  await page.fill("#inputPassword", PASSWORD);
  await Promise.all([
    page.waitForURL("**/clientarea/clientarea.php", { timeout: 60_000 }),
    page.click("#login"),
  ]);
  await page.context().storageState({ path: storageStatePath });
  console.log("[INFO] storageState.vps.json saved");
  await page.close();
});

// ─── 1. Dump VPS landing ───────────────────────────────────────────────────
test("DEBUG: dump VPS landing page plan cards", async ({ browser }) => {
  const context = await browser.newContext({ storageState: storageStatePath });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/vps-hosting/`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });

  // Dump plan cards
  await dumpElements(page, "storefront__tariff", "tariff cards");
  await dumpElements(page, "tariff-action", "action buttons");

  // Dump all buttons and links with Deploy/Order/Cart text
  const btns = await page.locator("a, button").all();
  console.log("\n[DUMP: all CTA links/buttons]");
  for (const btn of btns) {
    const txt = (await btn.innerText().catch(() => "")).trim();
    const href = await btn.getAttribute("href").catch(() => "");
    const cls = await btn.getAttribute("class").catch(() => "");
    if (/deploy|order|cart|buy|start/i.test(txt) && txt.length < 40) {
      console.log(`  text="${txt}" href="${href}" class="${cls}"`);
    }
  }

  await page.screenshot({ path: "debug-vps-landing.png", fullPage: true });
  console.log("[INFO] Screenshot: debug-vps-landing.png");
  await context.close();
});

// ─── 2. Navigate to cart after Deploy Now ─────────────────────────────────
test("DEBUG: dump billing step after Deploy Now", async ({ browser }) => {
  const context = await browser.newContext({ storageState: storageStatePath });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/vps-hosting/`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });

  // Try .storefront__tariff-action__cart first, fall back to link text
  const deployBtn = page.locator(".storefront__tariff-action__cart").first();

  const isVisible = await deployBtn.isVisible().catch(() => false);
  if (isVisible) {
    console.log(
      "[INFO] Deploy button found via .storefront__tariff-action__cart",
    );
    await deployBtn.click();
  } else {
    console.log("[WARN] Fallback: clicking first link matching /deploy now/i");
    await page
      .getByRole("link", { name: /deploy now/i })
      .first()
      .click();
  }

  // Wait for Vue SPA cart
  await page.waitForURL(/\/cart/, { timeout: 20_000 });
  await page
    .locator("[data-v-app]")
    .waitFor({ state: "visible", timeout: 15_000 });

  console.log(`[INFO] Cart URL: ${page.url()}`);

  // Dump billing step
  await dumpElements(page, "billing", "billing cycle");
  await dumpElements(page, "period", "period items");
  await dumpElements(page, "order__", "order summary");

  await page.screenshot({ path: "debug-vps-billing.png", fullPage: true });
  console.log("[INFO] Screenshot: debug-vps-billing.png");
  await context.close();
});

// ─── 3. Dump Configure step ───────────────────────────────────────────────
test("DEBUG: dump VPS configure step DOM", async ({ browser }) => {
  const context = await browser.newContext({ storageState: storageStatePath });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/vps-hosting/`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });

  const deployBtn = page.locator(".storefront__tariff-action__cart").first();
  const isVisible = await deployBtn.isVisible().catch(() => false);
  if (isVisible) {
    await deployBtn.click();
  } else {
    await page
      .getByRole("link", { name: /deploy now/i })
      .first()
      .click();
  }

  await page.waitForURL(/\/cart/, { timeout: 20_000 });
  await page
    .locator(".billing-cycle")
    .waitFor({ state: "visible", timeout: 15_000 });

  // Advance to configure step
  await page.locator(".order__button-order").click();
  await page.waitForTimeout(1500);

  console.log(`[INFO] After Next Step URL: ${page.url()}`);

  // Dump configure step elements
  const headings = await page.locator("h1, h2, h3").allInnerTexts();
  console.log("[DUMP: Headings]", headings);

  // OS / Image selection
  await dumpElements(page, "os", "OS selection");
  await dumpElements(page, "image", "image/template");
  await dumpElements(page, "system", "system options");
  await dumpElements(page, "location", "location items");
  await dumpElements(page, "addon", "addons");
  await dumpElements(page, "extra", "extras");
  await dumpElements(page, "option", "options");

  // Dump ALL visible text blocks to see what's on the page
  console.log("\n[DUMP: all .order__details-item labels]");
  const summaryItems = await page.locator(".order__details-item").all();
  for (const item of summaryItems) {
    const txt = (await item.innerText().catch(() => ""))
      .trim()
      .replace(/\n+/g, " | ");
    console.log(`  "${txt}"`);
  }

  // All radio inputs
  console.log("\n[DUMP: all radio inputs]");
  const radios = await page.locator("input[type='radio']").all();
  for (const r of radios) {
    const id = await r.getAttribute("id");
    const name = await r.getAttribute("name");
    const val = await r.getAttribute("value");
    console.log(`  id="${id}" name="${name}" value="${val}"`);
  }

  // All clickable divs with class
  await dumpElements(page, "select", "selects/dropdowns");
  await dumpElements(page, "plan", "plan items");

  await page.screenshot({ path: "debug-vps-configure.png", fullPage: true });
  console.log("[INFO] Screenshot: debug-vps-configure.png");

  await context.close();
});
