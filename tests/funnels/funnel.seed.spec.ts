/**
 * funnel.seed.spec.ts
 * ───────────────────
 * End-to-end purchase funnel starting from the SEED page's BUY button.
 *
 *   /minecraft-seeds/sky-haven-island-atm-10-seed/
 *      └── click `button.single-seed-card__button[data-url]` (BUY A SERVER)
 *           → navigates to data-url:  /cart-seed/?productId=…&seedId=…&modpackId=…
 *               └── auth-block skipped via storageState (fallback to cart login
 *                   if session expired)
 *                   → /cart-seed?…&step=2
 *                       └── click "Next step"
 *                           → /clientarea/cart.php?a=checkout (WHMCS Lagom)
 *                               └── ASSERT payment gateways visible — STOP
 *
 * Запуск:
 *   npx playwright test tests/funnel.seed.spec.ts --project=chromium
 */
import { test, expect, type Browser, type Page } from "@playwright/test";
import { SeedPage } from "../../pages/SeedPage";
import { SeedListPage } from "../../pages/SeedListPage";
import { CartPage } from "../../pages/CartPage";
import { CheckoutPage } from "../../pages/CheckoutPage";
import { pinAmplitudeExperiments } from "../../utils/amplitude";
import {
  BASE_URL,
  Credentials,
  PaymentUrlPatterns,
} from "../../fixtures/test-data";

const storageStatePath = "storageState.seed.json";

// Seed-воронка переехала на выделенный путь корзины /cart-seed (как VPS на /cart-vps,
// modded на /cart-modded-new). Общий VueCartStep2Pattern (/cart?...) тут больше не годится —
// используем seed-локальные паттерны. Слеш перед "?" опционален (live даёт обе формы).
const SEED_CART_PRODUCT = /\/cart-seed\/?\?[^#]*productId=/;
const SEED_CART_STEP2 = /\/cart-seed\/?\?[^#]*step=2/i;

// ─── beforeAll: login once ───────────────────────────────────────────────────

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
    console.log("[INFO] Login OK → storageState.seed.json saved");
  } catch (err) {
    console.log(`[ERROR] beforeAll login failed: ${err}`);
    throw err;
  } finally {
    await page.close();
  }
});

async function ensurePastAuthStep(page: Page, cartPage: CartPage): Promise<void> {
  const stillOnAuth = await cartPage.isAuthBlockVisible();
  if (!stillOnAuth) return;

  console.log("[INFO] auth-block visible — performing fallback cart login");
  const advanced = await cartPage.loginAndAwaitStep2(
    Credentials.email,
    Credentials.password,
  );
  expect(advanced, "expected to advance to ?step=2 after fallback login").toBeTruthy();
}

/**
 * Общий хвост seed-воронки: со страницы корзины /cart-seed (step 1) — пройти auth (через
 * storageState или fallback-логин) и Next step'ами дойти до WHMCS-страницы оплаты. Возвращает
 * число платёжных шлюзов. ⚠️ Финальный Continue НЕ кликается. Используется тестами Host Now/CTA.
 */
async function driveSeedCartToPayment(
  page: Page,
  cartPage: CartPage,
  checkoutPage: CheckoutPage,
): Promise<number> {
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
  await ensurePastAuthStep(page, cartPage);
  await page.waitForURL(SEED_CART_STEP2, { timeout: 30_000 }).catch(() => {
    console.log(`[CART] не на step=2 явно, текущий URL: ${page.url()}`);
  });
  await cartPage.cookieBanner.dismissAll();

  await expect(cartPage.nextStepButton()).toBeVisible({ timeout: 15_000 });
  await Promise.all([
    page.waitForURL(/\/cart-seed\/?\?/),
    page.getByRole("button", { name: "Next step" }).click(),
  ]);
  await Promise.all([
    page.waitForURL((url) => PaymentUrlPatterns.some((re) => re.test(url.toString())), {
      timeout: 60_000,
    }),
    cartPage.clickNextStep(),
  ]);

  expect(checkoutPage.isOnPaymentStep()).toBeTruthy();
  await expect(checkoutPage.reviewHeading()).toBeVisible();
  await expect(checkoutPage.paymentMethodHeading()).toBeVisible();
  const gateways = await checkoutPage.gatewayPanels().count();
  expect(gateways).toBeGreaterThanOrEqual(1);
  return gateways;
}

// ─── tests ───────────────────────────────────────────────────────────────────

test.describe("Воронка покупки сида (стоп на странице оплаты)", () => {
  test.setTimeout(180_000);

  test("@critical BUY → корзина → step 2 → страница оплаты", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    // §9.10: фиксируем A/B Amplitude ДО первой страницы — иначе случайный вариант
    // показывает flash-sale-баннер, который перехватывает клик BUY (источник флоки).
    await pinAmplitudeExperiments(context);
    const page = await context.newPage();

    const seed = new SeedPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);

    try {
      // ─── Step 1: open the seed page ──────────────────────────────────
      await seed.open();
      console.log(`[STEP 1] Seed page loaded: ${page.url()}`);

      const cartUrl = await seed.buyServerCartUrl();
      console.log(`[STEP 1] BUY data-url: ${cartUrl}`);
      expect(cartUrl, "BUY-A-SERVER button must expose a data-url").toBeTruthy();

      // ─── Step 2: BUY → Vue cart ──────────────────────────────────────
      // Дать инлайн-скрипту навесить обработчик BUY (читает data-url → редирект):
      // ждём успокоения сети. Кликаем БЕЗ force — Playwright дождётся, что кнопка
      // видима, стабильна и не перекрыта (раньше force бил мимо и ловил reload).
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
      const buyButton = seed.buyServerButton();
      await expect(buyButton).toBeVisible({ timeout: 15_000 });
      await buyButton.scrollIntoViewIfNeeded();
      await Promise.all([
        page.waitForURL(SEED_CART_PRODUCT, { timeout: 30_000 }),
        buyButton.click(),
      ]);
      await cartPage.cookieBanner.dismissAll();
      console.log(`[STEP 2] Cart URL: ${page.url()}`);
      expect(page.url()).toContain("productId=");

      // ─── Step 3: auth-step (skipped via storageState) ────────────────
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
      await ensurePastAuthStep(page, cartPage);

      await page
        .waitForURL(SEED_CART_STEP2, { timeout: 30_000 })
        .catch(() => {
          console.log(`[STEP 3] not on step=2 explicitly, current URL: ${page.url()}`);
        });
      await cartPage.cookieBanner.dismissAll();

      // ─── Step 4: click "Next step" → WHMCS payment page ──────────────
      await expect(cartPage.nextStepButton()).toBeVisible({ timeout: 15_000 });
      console.log("[STEP 3] Next step button visible — clicking");

      await Promise.all([
      page.waitForURL(/\/cart-seed\/?\?/),
      page.getByRole('button', { name: 'Next step' }).click(),
        ]);
      console.log("[STEP 3.1] Next step button visible — clicking");

      await Promise.all([
        page.waitForURL(
          (url) =>
            PaymentUrlPatterns.some((re) => re.test(url.toString())),
          { timeout: 60_000 },
        ),
        cartPage.clickNextStep(),
      ]);
      console.log(`[STEP 4] WHMCS URL: ${page.url()}`);

      // ─── Step 5: assert we are on the payment page (and stop) ────────
      expect(checkoutPage.isOnPaymentStep()).toBeTruthy();
      await expect(checkoutPage.reviewHeading()).toBeVisible();
      await expect(checkoutPage.paymentMethodHeading()).toBeVisible();
      const gateways = await checkoutPage.gatewayPanels().count();
      console.log(`[STEP 5] Gateway panels visible: ${gateways}`);
      expect(gateways).toBeGreaterThanOrEqual(1);

      const continueBtn = checkoutPage.placeOrderButton();
      if (await continueBtn.count()) {
        await expect(continueBtn.first()).toBeVisible();
        console.log("[STEP 5] Final 'Continue' button visible — NOT clicking ✓");
      }
    } finally {
      await context.close();
    }
  });

  test("@critical Host Now (калькулятор одиночного сида) → /cart-seed → оплата", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: storageStatePath });
    await pinAmplitudeExperiments(context);
    const page = await context.newPage();

    const seed = new SeedPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);

    try {
      await seed.open();
      // двигаем слайдер тарифа в максимум → не-дефолтный тариф уезжает в воронку
      await seed.calculator.toMax();
      const players = Number(await seed.calculator.hiddenPlayerInput().inputValue());
      console.log(`[STEP 1] slider→max, hidden players=${players}`);
      expect(players).toBeGreaterThan(0);

      await Promise.all([
        page.waitForURL(SEED_CART_PRODUCT, { timeout: 30_000 }),
        seed.hostNowSubmit().click(),
      ]);
      await cartPage.cookieBanner.dismissAll();
      const url = new URL(page.url());
      console.log(`[STEP 2] Cart URL: ${page.url()}`);
      expect(url.pathname).toMatch(/\/cart-seed/);
      expect(url.searchParams.get("productId")).toMatch(/^\d+$/);
      expect(url.searchParams.get("promo")).toBeTruthy();

      const gateways = await driveSeedCartToPayment(page, cartPage, checkoutPage);
      console.log(`[STEP 5] Gateway panels visible: ${gateways}`);
    } finally {
      await context.close();
    }
  });

  test("@critical Create server (новый калькулятор /minecraft-seeds/) → /cart-seed → оплата", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: storageStatePath });
    await pinAmplitudeExperiments(context);
    const page = await context.newPage();

    const seedList = new SeedListPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);

    try {
      await seedList.open();
      // выбор версии → план/цена заполняются; слайдер → максимальный тариф
      await seedList.calculator.selectGameVersion(0);
      await expect
        .poll(() => seedList.calculator.readPlan().then((p) => p.name), {
          timeout: 10_000,
          intervals: [300, 500, 800],
        })
        .not.toBe("—");
      await seedList.calculator.sliderToMax();
      const plan = await seedList.calculator.readPlan();
      console.log(`[STEP 1] new-calc plan=${plan.name} ram=${plan.ram}`);

      await Promise.all([
        page.waitForURL(SEED_CART_PRODUCT, { timeout: 30_000 }),
        seedList.calculator.cta().click(),
      ]);
      await cartPage.cookieBanner.dismissAll();
      const url = new URL(page.url());
      console.log(`[STEP 2] Cart URL: ${page.url()}`);
      expect(url.pathname).toMatch(/\/cart-seed/);
      expect(url.searchParams.get("productId")).toMatch(/^\d+$/);
      expect(url.searchParams.get("promo")).toBeTruthy();

      const gateways = await driveSeedCartToPayment(page, cartPage, checkoutPage);
      console.log(`[STEP 5] Gateway panels visible: ${gateways}`);
    } finally {
      await context.close();
    }
  });
});
