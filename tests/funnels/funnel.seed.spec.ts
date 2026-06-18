/**
 * funnel.seed.spec.ts
 * ───────────────────
 * Глубокий happy-path сид-воронки до страницы оплаты WHMCS (стоп до оплаты).
 * Один вход — Host Now Vuetify-калькулятора одиночного сида → /cart-seed → step 2 → WHMCS.
 * Далее общий хвост: auth (через storageState) → Next step ×2 → WHMCS payment. ⚠ Continue НЕ жмём.
 *
 * Проброс параметров (productId/seedId/modpackId) по входам проверяется отдельно, без глубины:
 *   - /minecraft-seeds/ (Create server)        → tests/modded/seed-list.calculator.spec.ts
 *   - одиночный сид (Host Now / BUY-A-SERVER)   → tests/modded/slider.seed.spec.ts
 * Здесь — единственный сценарий, доводящий сид-воронку до самой страницы оплаты.
 */
import { test, expect, type Browser, type Page } from "@playwright/test";
import { SeedPage } from "../../pages/SeedPage";
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

/**
 * Провести корзину за auth-block. Валидная сессия из storageState авто-проскакивает блок прямо
 * на step 2 — СНАЧАЛА даём ей это сделать (ждём step 2). Логинимся вручную ТОЛЬКО если step 2 не
 * достигнут И блок реально держится. Иначе ловим ТРАНЗИЕНТНЫЙ auth-block (мелькает даже у
 * залогиненного) и зря триггерим fallback — он падает на детаче вкладки Login в момент
 * авто-перехода (тот же класс флоки, что чинили в funnel.modded).
 */
async function ensurePastAuthStep(page: Page, cartPage: CartPage): Promise<void> {
  const reachedStep2 = await page
    .waitForURL(SEED_CART_STEP2, { timeout: 12_000 })
    .then(() => true)
    .catch(() => false);
  if (reachedStep2) return;
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
  // ensurePastAuthStep сам ждёт step 2 (детерминированный сигнал) — networkidle-костыль не нужен.
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

  test("@critical Host Now (калькулятор одиночного сида) → /cart-seed → step 2 → страница оплаты", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
      deviceScaleFactor: process.env.CI ? 1 : 0.8, // локально 80% — headed-окно мельче и влезает
    });
    // Фиксируем A/B Amplitude ДО первой страницы (иначе flash-sale перехватит сабмит Host Now).
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
});
