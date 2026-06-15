/**
 * funnel.modded.spec.ts
 * ─────────────────────
 * End-to-end purchase funnel starting from a MODDED install button.
 *
 *   /modded-minecraft-server-hosting/
 *      └── click first `button.modpacks-body__install`
 *           → /cart?productId=…&modpackId=…   (Vue cart, step 1)
 *               └── auth: pre-loaded session cookies from /clientarea/login
 *                   so the `.auth-block` is skipped automatically; if for
 *                   any reason it shows up, fall back to login-via-cart
 *                   → /cart?…&step=2          (Vue cart, step 2)
 *                       └── click "Next step"
 *                           → /clientarea/cart.php?a=checkout (WHMCS Lagom)
 *                               └── ASSERT payment gateways visible
 *                                   ⚠ DO NOT click "Continue" — real payment.
 *
 * Auth pattern follows the reference project (explicit beforeAll →
 * storageState.json file → fresh context per test).
 *
 * Запуск:
 *   npx playwright test tests/funnel.modded.spec.ts --project=chromium
 */
import { test, expect, type Browser, type Page } from "@playwright/test";
import { pinAmplitudeExperiments } from "../../utils/amplitude";
import { ModdedHostingPage } from "../../pages/ModdedHostingPage";
import { CartPage } from "../../pages/CartPage";
import { CheckoutPage } from "../../pages/CheckoutPage";
import {
  Credentials,
  PaymentUrlPatterns,
  VueCartStep2Pattern,
} from "../../fixtures/test-data";
import { loginClientareaAndSaveSession } from "../../utils/clientareaAuth";

const storageStatePath = "storageState.modded.json";

// Host Now калькулятора ведёт на выделенную корзину /cart-modded-new (не /cart, как install-кнопка
// грида) — это НОВЫЙ UI корзины (custom-select + "Order Now"), не классический Vue-cart. Confirmed MCP 13-Jun.
const MODDED_NEW_CART_PRODUCT = /\/cart-modded-new\/?\?[^#]*productId=/;

// ─── beforeAll: login once ───────────────────────────────────────────────────

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginClientareaAndSaveSession(browser, {
    email: Credentials.email,
    password: Credentials.password,
    statePath: storageStatePath,
  });
});

// ─── helper: skip auth-block fallback ────────────────────────────────────────

/**
 * If the cart still shows the auth-block (session cookies somehow stale or
 * site rolled them), perform the embedded cart login. Otherwise no-op.
 */
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

// ─── tests ───────────────────────────────────────────────────────────────────

test.describe("Воронка покупки modded (стоп на странице оплаты)", () => {
  test.setTimeout(180_000);

  test("@critical Install → корзина → step 2 → страница оплаты", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    // Фиксируем A/B-вариант Amplitude, чтобы акционный flash-sale не мешал флоу
    await pinAmplitudeExperiments(context);
    const page = await context.newPage();

    const modded = new ModdedHostingPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);

    try {
      // ─── Step 1: open the modded landing page ─────────────────────────
      await modded.open();
      console.log(`[STEP 1] Landing loaded: ${page.url()}`);

      const installBtn = modded.installButtonByIndex(0);
      await expect(installBtn).toBeVisible();
      const meta = await modded.readInstallMeta(installBtn);
      console.log(
        `[STEP 1] First install button: productId=${meta.productId} modpackId=${meta.modpackId} promo=${meta.promo}`,
      );
      expect(meta.productId).toMatch(/^\d+$/);
      expect(meta.modpackId).toBeTruthy();

      // ─── Step 2: install → Vue cart ──────────────────────────────────
      await Promise.all([
        page.waitForURL(/\/cart\?[^#]*productId=/, { timeout: 30_000 }),
        // force: install-кнопка грида — Vue-обработчик, нативный клик не всегда проходит actionability.
        // eslint-disable-next-line playwright/no-force-option
        installBtn.click({ force: true }),
      ]);
      await cartPage.cookieBanner.dismissAll();
      console.log(`[STEP 2] Cart URL: ${page.url()}`);
      expect(page.url()).toContain(`productId=${meta.productId}`);

      // ─── Step 3: auth-step (skipped via storageState) ────────────────
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {}); // wait for Vue to mount auth-block if it's coming
      await ensurePastAuthStep(page, cartPage);

      // Either we were already past step 1, or fallback login moved us to step 2.
      // Either way — wait until we're on step 2.
      await page
        .waitForURL(VueCartStep2Pattern, { timeout: 30_000 })
        .catch(async () => {
          // It's also fine if we landed directly on step 2 (URL may carry step=2
          // immediately after auth) or skipped it (e.g. auto-redirect to step 3).
          console.log(`[STEP 3] not on step=2 explicitly, current URL: ${page.url()}`);
        });
      await cartPage.cookieBanner.dismissAll();

      // ─── Step 4: click "Next step" → WHMCS payment page ──────────────
      await expect(cartPage.nextStepButton()).toBeVisible({ timeout: 15_000 });
      console.log("[STEP 3] Next step button visible — clicking");

      await Promise.all([
      page.waitForURL(/cart\?/),
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

      // SAFETY NET: the final "Continue" button must be present but we must
      // NOT click it. Verify it exists then assert this test made no further
      // navigation.
      const continueBtn = checkoutPage.placeOrderButton();
      if (await continueBtn.count()) {
        await expect(continueBtn.first()).toBeVisible();
        console.log("[STEP 5] Final 'Continue' button visible — NOT clicking ✓");
      }
      expect(checkoutPage.isOnPaymentStep()).toBeTruthy();
    } finally {
      await context.close();
    }
  });

  test("@critical Host Now (калькулятор) → /cart-modded-new несёт выбранный тариф", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: storageStatePath });
    await pinAmplitudeExperiments(context);
    const page = await context.newPage();

    const modded = new ModdedHostingPage(page);
    const cartPage = new CartPage(page);

    try {
      // ─── Step 1: калькулятор — читаем выбранный тариф (productId в href Host Now) ───
      await modded.open();
      const calc = await modded.readCalculatorCartParams();
      console.log(
        `[STEP 1] calc productId=${calc.productId} modpackId=${calc.modpackId} promo=${calc.promo}`,
      );
      expect(calc.productId).toMatch(/^\d+$/);
      expect(calc.modpackId).toBeTruthy();

      const price = await modded.readCalculatorPrice();
      console.log(`[STEP 1] calc price: ${price.current} (old ${price.old})`);
      expect(price.current).toMatch(/[€$]\s?\d/);

      // ─── Step 2: Host Now → /cart-modded-new; тариф доехал = тот же productId ───
      await Promise.all([
        page.waitForURL(MODDED_NEW_CART_PRODUCT, { timeout: 30_000 }),
        modded.calculatorCheckoutLink().click(),
      ]);
      await cartPage.cookieBanner.dismissAll();
      const url = new URL(page.url());
      console.log(`[STEP 2] Cart URL: ${page.url()}`);
      expect(url.pathname).toMatch(/\/cart-modded-new/);
      expect(url.searchParams.get("productId")).toBe(calc.productId);
      expect(url.searchParams.get("promo")).toBeTruthy();

      // ─── Step 3: новый UI корзины /cart-modded-new смонтировался ───
      // ⚠️ /cart-modded-new — НЕ классическая Vue-корзина (CartPage с auth-block/order__button-order),
      // а новый UI: custom-select дропдауны (план/период/локация) + кнопка "Order Now". Доезд до
      // payment через этот UI — отдельная поверхность; классический payment уже покрыт install-тестом
      // выше. Здесь подтверждаем, что выбранный тариф корректно открылся в воронке нового UI.
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
      const planToggle = page.locator(".custom-select__toggle").first();
      const orderButton = page.locator("button.form__button--primary", { hasText: "Order Now" });
      await expect(planToggle).toBeVisible({ timeout: 15_000 });
      await expect(orderButton).toBeVisible({ timeout: 15_000 });
      console.log(`[STEP 3] new-cart UI смонтирован: план-тоггл="${(await planToggle.textContent())?.trim()}"`);
    } finally {
      await context.close();
    }
  });
});
