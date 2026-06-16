/**
 * funnel.seed.spec.ts
 * ───────────────────
 * Воронка покупки сида до страницы оплаты (стоп до оплаты), три входа:
 *   1. BUY-A-SERVER на одиночной seed-странице → /cart-seed
 *   2. Host Now Vuetify-калькулятора одиночного сида → /cart-seed
 *   3. Create server нового калькулятора /minecraft-seeds/ → /cart-seed
 * Далее общий хвост: auth (через storageState) → Next step ×2 → WHMCS payment. ⚠ Continue НЕ жмём.
 */
import { test, expect, type Browser, type Page } from "@playwright/test";
import { SeedPage } from "../../pages/SeedPage";
import { SeedListPage } from "../../pages/SeedListPage";
import { CartPage } from "../../pages/CartPage";
import { CheckoutPage } from "../../pages/CheckoutPage";
import { pinAmplitudeExperiments } from "../../utils/amplitude";
import { Credentials, PaymentUrlPatterns } from "../../fixtures/test-data";
import { loginClientareaAndSaveSession } from "../../utils/clientareaAuth";

const storageStatePath = "storageState.seed.json";

// Seed-воронка на выделенном пути /cart-seed (как VPS на /cart-vps). Слеш перед "?" опционален.
const SEED_CART_PRODUCT = /\/cart-seed\/?\?[^#]*productId=/;
const SEED_CART_STEP2 = /\/cart-seed\/?\?[^#]*step=2/i;

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginClientareaAndSaveSession(browser, {
    email: Credentials.email,
    password: Credentials.password,
    statePath: storageStatePath,
  });
});

async function ensurePastAuthStep(page: Page, cartPage: CartPage): Promise<void> {
  if (!(await cartPage.isAuthBlockVisible())) return;
  const advanced = await cartPage.loginAndAwaitStep2(Credentials.email, Credentials.password);
  expect(advanced, "ожидали переход на ?step=2 после fallback-логина").toBeTruthy();
}

/**
 * Общий хвост seed-воронки: со страницы корзины /cart-seed (step 1) пройти auth (через
 * storageState или fallback-логин) и Next step'ами дойти до WHMCS-страницы оплаты.
 * ⚠️ Финальный Continue НЕ кликается.
 */
async function driveSeedCartToPayment(
  page: Page,
  cartPage: CartPage,
  checkoutPage: CheckoutPage,
): Promise<void> {
  // Осознанный networkidle: даём сессии из storageState примениться и SPA авто-скипнуть
  // auth-block. Без этого ловим ТРАНЗИЕНТНЫЙ auth-block и зря триггерим fallback-логин
  // (подтверждено: element-race здесь ломал «Create server»-флоу).
  // eslint-disable-next-line playwright/no-networkidle
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
  await ensurePastAuthStep(page, cartPage);
  await page.waitForURL(SEED_CART_STEP2, { timeout: 30_000 }).catch(() => {});
  await cartPage.cookieBanner.dismissAll();

  await expect(cartPage.nextStepButton()).toBeVisible({ timeout: 15_000 });
  await Promise.all([page.waitForURL(/\/cart-seed\/?\?/), cartPage.clickNextStep()]);
  await Promise.all([
    page.waitForURL((url) => PaymentUrlPatterns.some((re) => re.test(url.toString())), {
      timeout: 60_000,
    }),
    cartPage.clickNextStep(),
  ]);

  expect(checkoutPage.isOnPaymentStep()).toBeTruthy();
  await expect(checkoutPage.reviewHeading()).toBeVisible();
  await expect(checkoutPage.paymentMethodHeading()).toBeVisible();
  expect(await checkoutPage.gatewayPanels().count()).toBeGreaterThanOrEqual(1);

  // SAFETY NET: финальная Continue присутствует, но НЕ жмём.
  const continueBtn = checkoutPage.placeOrderButton();
  if (await continueBtn.count()) {
    await expect(continueBtn.first()).toBeVisible();
  }
}

test.describe("Воронка покупки сида (стоп на странице оплаты)", () => {
  test.setTimeout(180_000);

  test("@critical BUY → корзина → step 2 → страница оплаты", async ({ browser }) => {
    const context = await browser.newContext({ storageState: storageStatePath });
    // §9.10: фиксируем A/B Amplitude ДО первой страницы (иначе flash-sale перехватит клик BUY).
    await pinAmplitudeExperiments(context);
    const page = await context.newPage();
    const seed = new SeedPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);

    try {
      await test.step("seed-страница → BUY несёт data-url", async () => {
        await seed.open();
        const cartUrl = await seed.buyServerCartUrl();
        expect(cartUrl, "BUY-A-SERVER должен нести data-url").toBeTruthy();
      });

      await test.step("BUY → /cart-seed с productId", async () => {
        // Осознанный networkidle: ждём, пока инлайн-скрипт навесит обработчик BUY
        // (читает data-url → редирект). На этой капризной seed-странице это надёжнее
        // элемент-ожидания (handler-attach не наблюдаем через DOM).
        // eslint-disable-next-line playwright/no-networkidle
        await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
        const buyButton = seed.buyServerButton();
        await expect(buyButton).toBeVisible({ timeout: 15_000 });
        await buyButton.scrollIntoViewIfNeeded();
        await Promise.all([
          page.waitForURL(SEED_CART_PRODUCT, { timeout: 30_000 }),
          buyButton.click(),
        ]);
        await cartPage.cookieBanner.dismissAll();
        expect(page.url()).toContain("productId=");
      });

      await test.step("auth + Next step ×2 → страница оплаты (стоп)", async () => {
        await driveSeedCartToPayment(page, cartPage, checkoutPage);
      });
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
      await test.step("слайдер→max → Host Now → /cart-seed с тарифом", async () => {
        await seed.open();
        await seed.calculator.toMax();
        const players = Number(await seed.calculator.hiddenPlayerInput().inputValue());
        expect(players).toBeGreaterThan(0);

        await Promise.all([
          page.waitForURL(SEED_CART_PRODUCT, { timeout: 30_000 }),
          seed.hostNowSubmit().click(),
        ]);
        await cartPage.cookieBanner.dismissAll();
        const url = new URL(page.url());
        expect(url.pathname).toMatch(/\/cart-seed/);
        expect(url.searchParams.get("productId")).toMatch(/^\d+$/);
        expect(url.searchParams.get("promo")).toBeTruthy();
      });

      await test.step("auth + Next step ×2 → страница оплаты (стоп)", async () => {
        await driveSeedCartToPayment(page, cartPage, checkoutPage);
      });
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
      await test.step("выбор версии + слайдер→max → Create server → /cart-seed", async () => {
        await seedList.open();
        await seedList.calculator.selectGameVersion(0);
        await expect
          .poll(() => seedList.calculator.readPlan().then((p) => p.name), {
            timeout: 10_000,
            intervals: [300, 500, 800],
          })
          .not.toBe("—");
        await seedList.calculator.sliderToMax();

        await Promise.all([
          page.waitForURL(SEED_CART_PRODUCT, { timeout: 30_000 }),
          seedList.calculator.cta().click(),
        ]);
        await cartPage.cookieBanner.dismissAll();
        const url = new URL(page.url());
        expect(url.pathname).toMatch(/\/cart-seed/);
        expect(url.searchParams.get("productId")).toMatch(/^\d+$/);
        expect(url.searchParams.get("promo")).toBeTruthy();
      });

      await test.step("auth + Next step ×2 → страница оплаты (стоп)", async () => {
        await driveSeedCartToPayment(page, cartPage, checkoutPage);
      });
    } finally {
      await context.close();
    }
  });
});
