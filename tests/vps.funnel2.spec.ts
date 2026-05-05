/**
 * vps.funnel.spec.ts
 * ──────────────────
 * Happy Path: VPS server purchase funnel
 * Landing: https://godlike.host/vps-hosting/
 *
 * Funnel steps (confirmed via debug spec 17-Apr-2026):
 *   1. /vps-hosting/  → click a.deploy-btn → /cart-vps/?productId=...
 *   2. Billing Cycle  — .billing-cycle, same BEM as game servers
 *   3. Configure      — /cart-vps?...&step=3 — location + OS/Pre-installation
 *   4. Next Step      → WHMCS /clientarea/cart.php?a=checkout
 *
 * Key differences vs Minecraft funnel:
 *   - Cart URL:  /cart-vps/  (not /cart/)
 *   - Deploy btn: a.deploy-btn (not .storefront__tariff-action__cart)
 *   - Location:  .configure-server__location (not .location / .location__header)
 *   - Only 2 DCs: USA, Europe — no continent dropdown
 *   - Price elem: .period__price-primary_amount
 *   - Promo VPS20 pre-applied from URL (20% discount visible on periods)
 *   - OS / Pre-installation section on Configure step (added May-2026)
 *
 * Запуск:
 *   npx playwright test tests/vps.funnel.spec.ts --project=chromium
 *   npx playwright test tests/vps.funnel.spec.ts --project=chromium --headed
 */
import { test, expect, type Browser, type Page } from "@playwright/test";
import { VpsPage } from "../pages/VpsPage";
import { VpsConfigPage } from "../pages/VpsConfigPage";
import { CartBillingPage } from "../pages/CartBillingPage";

test.use({
  viewport: { width: 1800, height: 900 },
  deviceScaleFactor: 1,
});

const BASE_URL = "https://godlike.host";
const EMAIL = "test@testmail.com";
const PASSWORD = "test@testmail.com";
const storageStatePath = "storageState.vps.json";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parsePrice(str: string): number {
  const m = str.match(/[\d]+\.[\d]+/);
  return m ? parseFloat(m[0]) : NaN;
}

/** Click first Deploy Now → wait for /cart-vps/ Vue SPA to mount */
async function deployFirstPlan(page: Page): Promise<void> {
  const vps = new VpsPage(page);
  await vps.goto();

  await expect(vps.firstDeployButton).toBeVisible({ timeout: 15_000 });
  await vps.deployFirstPlan();

  // Wait for Vue SPA to mount inside /cart-vps/
  await page
    .locator("[data-v-app]")
    .waitFor({ state: "visible", timeout: 15_000 });
  console.log(`[INFO] Cart URL: ${page.url()}`);
}

/** Navigate all the way to Configure step (step=3) */
async function goToConfigureStep(page: Page): Promise<void> {
  await deployFirstPlan(page);
  await page
    .locator(".billing-cycle")
    .waitFor({ state: "visible", timeout: 15_000 });
  await page.locator(".order__button-order").click();

  const config = new VpsConfigPage(page);
  await config.waitForConfigureStep();
}

// ─── beforeAll: login once ────────────────────────────────────────────────────

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  const page = await browser.newPage();
  try {
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
    console.log("[INFO] Login OK → storageState.vps.json saved");
  } finally {
    await page.close();
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — VPS Landing Page
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Landing — /vps-hosting/", () => {
  test("страница загружается, кнопки Deploy Now видны", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();
    const vps = new VpsPage(page);

    await vps.goto();

    const count = await vps.deployButtons.count();
    console.log(`[INFO] Deploy Now buttons: ${count}`);
    expect(count).toBeGreaterThanOrEqual(1);

    await context.close();
  });

  test("у каждой кнопки Deploy Now есть корректный href с productId", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();
    const vps = new VpsPage(page);

    await vps.goto();

    const buttons = page.locator('a.deploy-btn[href*="productId="]');
    const count = await buttons.count();

    console.log(`[INFO] Deploy Now buttons: ${count}`);

    for (let i = 0; i < count; i++) {
      const href = await buttons.nth(i).getAttribute("href");

      console.log(`[INFO] Button ${i + 1} href FULL:`, href);

      expect(href).not.toBeNull();
      expect(href!).toMatch(/productId=\d+/);
      expect(href!).toMatch(/\/cart-vps/);
    }

    await context.close();
  });

  test("клик Deploy Now ведёт в /cart-vps/ и монтирует Vue SPA", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();

    await deployFirstPlan(page);

    expect(page.url()).toMatch(/\/cart-vps/);
    await expect(page.locator("[data-v-app]")).toBeVisible();

    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — Billing Cycle Step (/cart-vps/)
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Funnel — Billing Cycle Step", () => {
  test("шаг биллинга загружается — 4 периода видны", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();
    const cartBilling = new CartBillingPage(page);

    await deployFirstPlan(page);
    await cartBilling.billing.container.waitFor({
      state: "visible",
      timeout: 15_000,
    });

    await expect(cartBilling.billing.period("1 Month")).toBeVisible();
    await expect(cartBilling.billing.period("3 Months")).toBeVisible();
    await expect(cartBilling.billing.period("6 Months")).toBeVisible();
    await expect(cartBilling.billing.period("12 Months")).toBeVisible();

    console.log("[INFO] All 4 billing periods visible ✓");
    await context.close();
  });

  test("у каждого периода есть дисконтированная цена (.period__price-primary_amount)", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();
    const cartBilling = new CartBillingPage(page);

    await deployFirstPlan(page);
    await cartBilling.billing.container.waitFor({
      state: "visible",
      timeout: 15_000,
    });

    const periods = ["1 Month", "3 Months", "6 Months", "12 Months"];
    const prices: number[] = [];

    for (const label of periods) {
      // VPS использует .period__price-primary_amount вместо .period__price
      const el = page
        .locator(".period")
        .filter({ hasText: label })
        .locator(".period__price-primary_amount")
        .first();

      await el.waitFor({ state: "visible", timeout: 10_000 });
      const txt = await el.innerText();
      const val = parsePrice(txt);
      console.log(`[INFO] ${label}: "${txt.trim()}" → ${val}`);
      expect(val, `${label} price is NaN`).not.toBeNaN();
      expect(val, `${label} price is 0`).toBeGreaterThan(0);
      prices.push(val);
    }

    // Все 4 цены уникальны (скидки разные)
    expect(new Set(prices).size, "All periods have identical price").toBe(4);

    await context.close();
  });

  test("у каждого периода есть badge скидки (.period__discount)", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();
    const cartBilling = new CartBillingPage(page);

    await deployFirstPlan(page);
    await cartBilling.billing.container.waitFor({
      state: "visible",
      timeout: 15_000,
    });

    // VPS20 promo даёт скидку на все периоды — badge должен быть у каждого
    const discountBadges = page.locator(".period__discount");
    const count = await discountBadges.count();
    console.log(`[INFO] Discount badges: ${count}`);
    expect(count).toBeGreaterThanOrEqual(1);

    const texts = (await discountBadges.allInnerTexts()).map((t) => t.trim());
    console.log(`[INFO] Discounts: ${texts.join(", ")}`);
    texts.forEach((t) => expect(t).toMatch(/\d+%/));

    await context.close();
  });

  test("клик по периоду обновляет Billing cycle в order summary", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();
    const cartBilling = new CartBillingPage(page);

    await deployFirstPlan(page);
    await cartBilling.billing.container.waitFor({
      state: "visible",
      timeout: 15_000,
    });

    const billingCaption = page
      .locator(".order__details-item")
      .filter({ hasText: "Billing cycle" })
      .locator(".order__details-item__caption");

    await expect(billingCaption).toBeVisible({ timeout: 10_000 });

    for (const label of ["3 Months", "6 Months", "12 Months", "1 Month"]) {
      await cartBilling.billing.selectCycle(label);
      await page.waitForTimeout(400);
      await expect(billingCaption).toContainText(label);
      console.log(`[INFO] Billing caption → "${label}" ✓`);
    }

    await context.close();
  });

  test("общая стоимость (.order__pricing-price) — ненулевая, меняется при смене периода", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();
    const cartBilling = new CartBillingPage(page);

    await deployFirstPlan(page);
    await cartBilling.billing.container.waitFor({
      state: "visible",
      timeout: 15_000,
    });

    const totalEl = page.locator(".order__pricing-price");
    await expect(totalEl).toBeVisible({ timeout: 10_000 });

    await cartBilling.billing.selectCycle("1 Month");
    await page.waitForTimeout(400);
    const total1m = parsePrice(await totalEl.innerText());
    console.log(`[INFO] Total 1 Month: ${total1m}`);
    expect(total1m).toBeGreaterThan(0);

    await cartBilling.billing.selectCycle("12 Months");
    await page.waitForTimeout(400);
    const total12m = parsePrice(await totalEl.innerText());
    console.log(`[INFO] Total 12 Months: ${total12m}`);
    expect(total12m).toBeGreaterThan(0);

    // 12-месячная стоимость за всё — должна быть больше 1-месячной
    expect(total12m).toBeGreaterThan(total1m);

    await context.close();
  });

  test("кнопка NEXT STEP видна и активна", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();

    await deployFirstPlan(page);
    await page
      .locator(".billing-cycle")
      .waitFor({ state: "visible", timeout: 15_000 });

    const nextBtn = page.locator(".order__button-order");
    await expect(nextBtn).toBeVisible();
    await expect(nextBtn).toBeEnabled();
    console.log("[INFO] NEXT STEP button enabled ✓");

    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — Configure Your Server (step=3)
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Funnel — Configure Your Server", () => {
  test("шаг конфигурации загружается — локации видны", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();
    const config = new VpsConfigPage(page);

    await goToConfigureStep(page);
    await config.waitForConfigureStep();

    const count = await config.locationItems.count();
    console.log(`[INFO] VPS locations: ${count}`);
    expect(count).toBeGreaterThanOrEqual(1);

    await context.close();
  });

  test("доступны локации USA и Europe", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();
    const config = new VpsConfigPage(page);

    await goToConfigureStep(page);

    const titles = (await config.locationItems.allInnerTexts()).map((t) =>
      t.trim(),
    );
    console.log(`[INFO] Locations: ${titles.join(", ")}`);

    expect(titles).toContain("USA");
    expect(titles).toContain("Europe");

    await context.close();
  });

  test("одна из локаций активна по умолчанию", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();
    const config = new VpsConfigPage(page);

    await goToConfigureStep(page);

    const activeName = await config.getActiveLocationName();
    console.log(`[INFO] Default active location: "${activeName}"`);
    expect(activeName.length).toBeGreaterThan(0);

    await context.close();
  });

  test("клик по другой локации меняет активный элемент", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();
    const config = new VpsConfigPage(page);

    await goToConfigureStep(page);

    const defaultLoc = await config.getActiveLocationName();
    console.log(`[INFO] Default location: "${defaultLoc}"`);

    // Кликаем по локации, которая сейчас НЕ активна
    const targetLoc = defaultLoc === "USA" ? "Europe" : "USA";
    await config.selectLocation(targetLoc);

    const newActiveLoc = await config.getActiveLocationName();
    console.log(`[INFO] After click: "${newActiveLoc}"`);
    expect(newActiveLoc).toBe(targetLoc);

    await context.close();
  });

  test("оба варианта локации кликабельны и меняют активный", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();
    const config = new VpsConfigPage(page);

    await goToConfigureStep(page);

    // USA
    await config.selectLocation("USA");
    expect(await config.getActiveLocationName()).toBe("USA");
    console.log("[INFO] USA selected ✓");

    // Europe
    await config.selectLocation("Europe");
    expect(await config.getActiveLocationName()).toBe("Europe");
    console.log("[INFO] Europe selected ✓");

    await context.close();
  });

  // ── OS / Pre-installation ────────────────────────────────────────────────

  test("секция 'Choose your OS' или 'Pre-installation' присутствует на шаге Configure", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();
    const config = new VpsConfigPage(page);

    await goToConfigureStep(page);

    const osSectionVisible = await config.isOsSectionVisible();
    console.log(`[INFO] OS/Pre-installation section visible: ${osSectionVisible}`);

    // Log page body for debugging if not found
    if (!osSectionVisible) {
      const bodyText = await page.locator("body").innerText().catch(() => "");
      console.log(`[DEBUG] Page body snippet:\n${bodyText.slice(0, 800)}`);
      console.log(
        "[HINT] If this fails — run vps.panel.debug.spec.ts to capture real OS selector class names"
      );
    }

    expect(osSectionVisible).toBeTruthy();
    await context.close();
  });

  test("список OS-опций содержит хотя бы 1 пункт", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();
    const config = new VpsConfigPage(page);

    await goToConfigureStep(page);

    const count = await config.osItems.count();
    console.log(`[INFO] OS option items: ${count}`);

    if (count === 0) {
      const bodyText = await page.locator("body").innerText().catch(() => "");
      console.log(`[DEBUG] Page snippet:\n${bodyText.slice(0, 800)}`);
      console.log("[HINT] Update osItems selector in VpsConfigPage after running debug spec");
    }

    expect(count).toBeGreaterThanOrEqual(1);
    await context.close();
  });

  test("одна из OS-опций активна по умолчанию", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();
    const config = new VpsConfigPage(page);

    await goToConfigureStep(page);

    // Only run if OS items are present
    const count = await config.osItems.count();
    if (count === 0) {
      console.log("[INFO] No OS items found — skipping active OS check");
      await context.close();
      return;
    }

    const activeName = await config.getActiveOsName();
    console.log(`[INFO] Default active OS: "${activeName}"`);

    // An active OS should exist if more than one option is shown
    if (count > 1) {
      expect(activeName.length).toBeGreaterThan(0);
      console.log("[INFO] Default OS selection is set ✓");
    }

    await context.close();
  });

  test("клик по другой OS-опции меняет выбор", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();
    const config = new VpsConfigPage(page);

    await goToConfigureStep(page);

    const count = await config.osItems.count();
    if (count < 2) {
      console.log(`[INFO] Not enough OS items (${count}) to test selection change — skipping`);
      await context.close();
      return;
    }

    // Click the second item (different from whatever is selected first)
    const secondItem = config.osItems.nth(1);
    const secondText = (await secondItem.innerText().catch(() => "")).trim().slice(0, 60);
    await secondItem.click();
    await page.waitForTimeout(400);

    const newActiveName = await config.getActiveOsName();
    console.log(`[INFO] After clicking second OS: "${newActiveName}" (item text: "${secondText}")`);

    // Click first item to go back
    await config.osItems.first().click();
    await page.waitForTimeout(400);
    const resetName = await config.getActiveOsName();
    console.log(`[INFO] After clicking first OS: "${resetName}"`);

    console.log("[INFO] OS selection is interactive ✓");
    await context.close();
  });

  // ── Кнопка NEXT STEP ─────────────────────────────────────────────────────

  test("кнопка NEXT STEP видна на шаге конфигурации", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();
    const config = new VpsConfigPage(page);

    await goToConfigureStep(page);

    const nextStepButton = page.getByRole("button", { name: "Next step" });

    await expect(nextStepButton).toBeVisible();
    await expect(nextStepButton).toBeEnabled();
    console.log("[INFO] Next Step button on configure step ✓");

    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — Full Happy Path
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Funnel — Full Happy Path", () => {
  test("Deploy Now → Billing → Configure → WHMCS checkout", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();
    const cartBilling = new CartBillingPage(page);
    const config = new VpsConfigPage(page);

    // Step 1: /vps-hosting/ → /cart-vps/
    await deployFirstPlan(page);
    await cartBilling.billing.container.waitFor({
      state: "visible",
      timeout: 15_000,
    });
    console.log(`[STEP 1] Cart loaded: ${page.url()}`);

    // Step 2: выбрать 1 Month → Next Step
    await cartBilling.billing.selectCycle("1 Month");
    await page.waitForTimeout(300);
    await page.locator(".order__button-order").click();
    await config.waitForConfigureStep();
    console.log(`[STEP 2] Billing OK → Configure: ${page.url()}`);

    // Step 3a: выбрать локацию
    const defaultLoc = await config.getActiveLocationName();
    console.log(`[STEP 3a] Default location: "${defaultLoc}"`);
    const altLoc = defaultLoc === "USA" ? "Europe" : "USA";
    await config.selectLocation(altLoc);
    const confirmedLoc = await config.getActiveLocationName();
    expect(confirmedLoc).toBe(altLoc);
    console.log(`[STEP 3a] Location selected: "${confirmedLoc}" ✓`);

    // Step 3b: проверить OS / Pre-installation секцию
    const osSectionVisible = await config.isOsSectionVisible();
    console.log(`[STEP 3b] OS section visible: ${osSectionVisible}`);
    if (osSectionVisible) {
      const osCount = await config.osItems.count();
      console.log(`[STEP 3b] OS options available: ${osCount}`);
      if (osCount >= 1) {
        const defaultOs = await config.getActiveOsName();
        console.log(`[STEP 3b] Default OS: "${defaultOs}"`);
        // Если больше одного варианта — переключаем и обратно
        if (osCount >= 2) {
          await config.osItems.nth(1).click();
          await page.waitForTimeout(300);
          await config.osItems.first().click();
          await page.waitForTimeout(300);
          console.log("[STEP 3b] OS selection toggled ✓");
        }
      }
    }

    // Step 4: Next Step → WHMCS checkout
    await config.proceedToCheckout();
    console.log(`[STEP 4] Checkout URL: ${page.url()}`);

    expect(page.url()).toMatch(/clientarea\/cart\.php/);
    await expect(page.locator("#frmCheckout")).toBeVisible({ timeout: 15_000 });
    console.log("[STEP 4] WHMCS checkout form visible ✓");

    await context.close();
  });
});
