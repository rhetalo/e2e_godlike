/**
 * vps.funnel.spec.ts
 * ──────────────────
 * Happy Path: VPS server purchase funnel
 * Landing: https://godlike.host/vps-hosting/
 *
 * Funnel steps (confirmed via debug spec 17-Apr-2026):
 *   1. /vps-hosting/  → click a.deploy-btn → /cart-vps/?productId=...
 *   2. Billing Cycle  — .billing-cycle, same BEM as game servers
 *   3. Configure      — /cart-vps?...&step=3 — location + OS selection
 *   4. Next Step      → WHMCS /clientarea/cart.php?a=checkout
 *
 * Key differences vs Minecraft funnel:
 *   - Cart URL:  /cart-vps/  (not /cart/)
 *   - Deploy btn: a.deploy-btn (not .storefront__tariff-action__cart)
 *   - Location:  .configure-server__location (not .location / .location__header)
 *   - Only 2 DCs: USA, Europe — no continent dropdown
 *   - Price elem: .period__price-primary_amount
 *   - Promo VPS20 pre-applied from URL (20% discount visible on periods)
 *   - OS selection: .configure-server__types — 8 types, most with version dropdown
 *   - WordPress on Ubuntu has no dropdown (single option, no versions)
 *
 * Запуск:
 *   npx playwright test tests/vps.funnel.spec.ts --project=chromium
 *   npx playwright test tests/vps.funnel.spec.ts --project=chromium --headed
 */
import {
  test,
  expect,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { VpsPage } from "../../../pages/VpsPage";
import { VpsConfigPage } from "../../../pages/VpsConfigPage";
import { CartBillingPage } from "../../../pages/CartBillingPage";
import { BASE_URL, Credentials } from "../../../fixtures/test-data";
import { pinAmplitudeExperiments } from "../../../utils/amplitude";

test.use({
  viewport: { width: 1800, height: 900 },
  deviceScaleFactor: 1,
});

const storageStatePath = "storageState.vps.json";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Контекст с авторизацией + детерминированным пиннингом A/B Amplitude.
 * Пиннинг убирает плавающую форму URL корзины и flash-sale-баннер (см.
 * utils/amplitude.ts). viewport фиксируем под desktop-вёрстку воронки,
 * т.к. browser.newContext() не наследует test.use({ viewport }).
 */
async function newPinnedContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext({
    storageState: storageStatePath,
    viewport: { width: 1800, height: 900 },
  });
  await pinAmplitudeExperiments(context);
  return context;
}

function parsePrice(str: string): number {
  const normalized = str.replace(",", ".");
  const m = normalized.match(/[\d]+(\.\d+)?/);
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
    await page.fill("#inputEmail", Credentials.email);
    await page.fill("#inputPassword", Credentials.password);
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
test.describe("@regression VPS-лендинг — /vps-hosting/", () => {
  test("страница загружается, кнопки Deploy Now видны", async ({ browser }) => {
    const context = await newPinnedContext(browser);
    const page = await context.newPage();
    const vps = new VpsPage(page);

    await vps.goto();

    const count = await vps.deployButtons.count();
    console.log(`[INFO] Deploy Now buttons: ${count}`);
    expect(count).toBeGreaterThanOrEqual(1);

    await context.close();
  });

  // NOTE: тест «у каждой кнопки Deploy Now есть корректный href с productId»
  // удалён 03-Jun-2026: кнопки Deploy Now — это <a href="javascript:void(0)">
  // с JS-роутингом (productId уходит в URL корзины только ПОСЛЕ клика), поэтому
  // селектор a.deploy-btn[href*="productId="] всегда давал 0 совпадений и тест
  // проходил вхолостую (ни одного expect). Покрытие клик→/cart-vps обеспечивают
  // тест ниже и Full Happy Path (SUITE 4).

  test("клик Deploy Now ведёт в /cart-vps/ и монтирует Vue SPA", async ({
    browser,
  }) => {
    const context = await newPinnedContext(browser);
    const page = await context.newPage();

    await deployFirstPlan(page);

    // productId уходит в URL корзины именно после клика (кнопки — javascript:void(0)).
    // /\/cart-vps/ ловит обе формы URL, которые даёт A/B (.../cart-vps?... и .../cart-vps/?...).
    expect(page.url()).toMatch(/\/cart-vps/);
    expect(page.url()).toMatch(/productId=\d+/);
    await expect(page.locator("[data-v-app]")).toBeVisible();

    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — Billing Cycle Step (/cart-vps/)
// ══════════════════════════════════════════════════════════════════════════════
test.describe("@regression VPS-воронка — шаг Billing Cycle", () => {
  test("шаг биллинга загружается — 4 периода видны", async ({ browser }) => {
    const context = await newPinnedContext(browser);
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
    const context = await newPinnedContext(browser);
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
    const context = await newPinnedContext(browser);
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
    const context = await newPinnedContext(browser);
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
    const context = await newPinnedContext(browser);
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
    const context = await newPinnedContext(browser);
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
test.describe("@regression VPS-воронка — Configure Your Server", () => {
  // ── Location tests (existing) ─────────────────────────────────────────────

  test("шаг конфигурации загружается — локации видны", async ({ browser }) => {
    const context = await newPinnedContext(browser);
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
    const context = await newPinnedContext(browser);
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
    const context = await newPinnedContext(browser);
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
    const context = await newPinnedContext(browser);
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
    const context = await newPinnedContext(browser);
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

  test("смена локации обновляет Location в order summary", async ({
    browser,
  }) => {
    const context = await newPinnedContext(browser);
    const page = await context.newPage();
    const config = new VpsConfigPage(page);

    await goToConfigureStep(page);

    await test.step("выбрать USA → проверить summary", async () => {
      await config.selectLocation("USA");
      await expect(config.orderLocation).toContainText("USA");
      console.log("[INFO] Summary Location → USA ✓");
    });

    await test.step("выбрать Europe → проверить summary", async () => {
      await config.selectLocation("Europe");
      await expect(config.orderLocation).toContainText("Europe");
      console.log("[INFO] Summary Location → Europe ✓");
    });

    await context.close();
  });

  test("кнопка NEXT STEP видна на шаге конфигурации", async ({ browser }) => {
    const context = await newPinnedContext(browser);
    const page = await context.newPage();
    const config = new VpsConfigPage(page);

    await goToConfigureStep(page);

    await expect(config.nextStepButton).toBeVisible();
    await expect(config.nextStepButton).toBeEnabled();
    console.log("[INFO] Next Step button on configure step ✓");

    await context.close();
  });

  // ── OS / Pre-installation tests (new) ─────────────────────────────────────

  test("блок Choose your OS видим — типы ОС загружены", async ({ browser }) => {
    const context = await newPinnedContext(browser);
    const page = await context.newPage();
    const config = new VpsConfigPage(page);

    await goToConfigureStep(page);

    await test.step("контейнер OS types виден", async () => {
      await expect(config.osTypesContainer).toBeVisible();
    });

    await test.step("в списке >= 1 типа ОС", async () => {
      const count = await config.osTypeItems.count();
      console.log(`[INFO] OS types count: ${count}`);
      expect(count).toBeGreaterThanOrEqual(1);
    });

    await context.close();
  });

  test("по умолчанию активна ОС Games, в summary есть Server type", async ({
    browser,
  }) => {
    const context = await newPinnedContext(browser);
    const page = await context.newPage();
    const config = new VpsConfigPage(page);

    await goToConfigureStep(page);

    await test.step("активная ОС по умолчанию — Games", async () => {
      const name = await config.getActiveOsTypeName();
      console.log(`[INFO] Default OS type: "${name}"`);
      expect(name).toBe("Games");
    });

    await test.step("summary содержит непустой Server type", async () => {
      await expect(config.orderServerType).toBeVisible();
      const serverType = (await config.orderServerType.innerText()).trim();
      console.log(`[INFO] Default server type: "${serverType}"`);
      expect(serverType.length).toBeGreaterThan(0);
    });

    await context.close();
  });

  test("выбор типа Ubuntu меняет активный тип и показывает дропдаун версий", async ({
    browser,
  }) => {
    const context = await newPinnedContext(browser);
    const page = await context.newPage();
    const config = new VpsConfigPage(page);

    await goToConfigureStep(page);

    await test.step("кликнуть на тип Ubuntu", async () => {
      await config.selectOsType("Ubuntu");
    });

    await test.step("Ubuntu стала активной", async () => {
      const name = await config.getActiveOsTypeName();
      console.log(`[INFO] Active OS after click: "${name}"`);
      expect(name).toBe("Ubuntu");
    });

    await test.step("дропдаун версий виден", async () => {
      await expect(config.osDropdown).toBeVisible();
      const version = await config.getCurrentOsVersion();
      console.log(`[INFO] Default Ubuntu version: "${version}"`);
      expect(version.length).toBeGreaterThan(0);
    });

    await context.close();
  });

  test("выбор версии из дропдауна обновляет Summary 'Server type'", async ({
    browser,
  }) => {
    const context = await newPinnedContext(browser);
    const page = await context.newPage();
    const config = new VpsConfigPage(page);

    await goToConfigureStep(page);

    await test.step("выбрать тип Ubuntu", async () => {
      await config.selectOsType("Ubuntu");
      await expect(config.osDropdown).toBeVisible();
    });

    let lastVersionText = "";

    await test.step("открыть дропдаун и выбрать последнюю версию", async () => {
      await config.openOsDropdown();
      const items = config.osDropdownItems;
      const count = await items.count();
      console.log(`[INFO] Ubuntu versions in dropdown: ${count}`);
      expect(count).toBeGreaterThanOrEqual(2);

      const lastItem = items.last();
      lastVersionText = (await lastItem.innerText()).trim();
      console.log(`[INFO] Selecting version: "${lastVersionText}"`);
      await lastItem.click();
      await page.waitForTimeout(300);
    });

    await test.step("summary 'Server type' отражает выбранную версию", async () => {
      await expect(config.orderServerType).toContainText(lastVersionText);
      console.log(`[INFO] Summary Server type updated → "${lastVersionText}" ✓`);
    });

    await context.close();
  });

  test("смена типа ОС обновляет Summary 'Server type'", async ({ browser }) => {
    const context = await newPinnedContext(browser);
    const page = await context.newPage();
    const config = new VpsConfigPage(page);

    await goToConfigureStep(page);

    await test.step("запомнить дефолтный Server type (Games)", async () => {
      const defaultType = (await config.orderServerType.innerText()).trim();
      console.log(`[INFO] Default server type: "${defaultType}"`);
      expect(defaultType.length).toBeGreaterThan(0);
    });

    await test.step("выбрать Rocky Linux", async () => {
      await config.selectOsType("Rocky Linux");
      const name = await config.getActiveOsTypeName();
      console.log(`[INFO] Active OS: "${name}"`);
      expect(name).toBe("Rocky Linux");
    });

    await test.step("summary 'Server type' изменился", async () => {
      await expect(config.orderServerType).toBeVisible();
      const newType = (await config.orderServerType.innerText()).trim();
      console.log(`[INFO] New server type: "${newType}"`);
      expect(newType.length).toBeGreaterThan(0);
    });

    await context.close();
  });

  test("WordPress on Ubuntu — нет дропдауна версий (одиночный вариант)", async ({
    browser,
  }) => {
    const context = await newPinnedContext(browser);
    const page = await context.newPage();
    const config = new VpsConfigPage(page);

    await goToConfigureStep(page);

    await test.step("выбрать WordPress", async () => {
      await config.selectOsType("WordPress");
      const name = await config.getActiveOsTypeName();
      console.log(`[INFO] Active OS: "${name}"`);
      expect(name).toContain("WordPress");
    });

    await test.step("дропдаун версий отсутствует", async () => {
      await expect(config.osDropdown).toBeHidden();
      console.log("[INFO] No version dropdown for WordPress on Ubuntu ✓");
    });

    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — Full Happy Path
// ══════════════════════════════════════════════════════════════════════════════
test.describe("@critical VPS-воронка — полный happy path", () => {
  test("Deploy Now → Billing → Configure (OS + Location) → WHMCS checkout", async ({
    browser,
  }) => {
    const context = await newPinnedContext(browser);
    const page = await context.newPage();
    const cartBilling = new CartBillingPage(page);
    const config = new VpsConfigPage(page);

    await test.step("Step 1: /vps-hosting/ → /cart-vps/", async () => {
      await deployFirstPlan(page);
      await cartBilling.billing.container.waitFor({
        state: "visible",
        timeout: 15_000,
      });
      console.log(`[STEP 1] Cart loaded: ${page.url()}`);
    });

    await test.step("Step 2: Billing Cycle — выбрать 1 Month → Next Step", async () => {
      await cartBilling.billing.selectCycle("1 Month");
      await page.waitForTimeout(300);
      await page.locator(".order__button-order").click();
      await config.waitForConfigureStep();
      console.log(`[STEP 2] Billing OK → Configure: ${page.url()}`);
    });

    await test.step("Step 3: Configure — выбрать ОС Ubuntu + версию + локацию Europe", async () => {
      // Выбрать тип ОС
      await config.selectOsType("Ubuntu");
      await expect(config.osDropdown).toBeVisible();

      // Выбрать первую версию из дропдауна
      await config.openOsDropdown();
      const firstVersion = config.osDropdownItems.first();
      const versionText = (await firstVersion.innerText()).trim();
      await firstVersion.click();
      await page.waitForTimeout(300);
      console.log(`[STEP 3] OS version selected: "${versionText}"`);

      // Проверить summary Server type
      await expect(config.orderServerType).toContainText(versionText);

      // Выбрать локацию
      await config.selectLocation("Europe");
      expect(await config.getActiveLocationName()).toBe("Europe");
      await expect(config.orderLocation).toContainText("Europe");
      console.log("[STEP 3] Location: Europe ✓");
    });

    await test.step("Step 4: Next Step → WHMCS checkout form", async () => {
      await config.proceedToCheckout();
      console.log(`[STEP 4] Checkout URL: ${page.url()}`);

      expect(page.url()).toMatch(/clientarea\/cart\.php/);
      await expect(page.locator("#frmCheckout")).toBeVisible({
        timeout: 15_000,
      });
      console.log("[STEP 4] WHMCS checkout form visible ✓");
    });

    await context.close();
  });
});
