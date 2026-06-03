/**
 * funnel.seed.spec.ts
 * ───────────────────
 * End-to-end purchase funnel starting from the SEED page's BUY button.
 *
 *   /minecraft-seeds/sky-haven-island-atm-10-seed/
 *      └── click `button.single-seed-card__button[data-url]` (BUY A SERVER)
 *           → navigates to data-url:  /cart/?productId=…&seedId=…&modpackId=…
 *               └── auth-block skipped via storageState (fallback to cart login
 *                   if session expired)
 *                   → /cart?…&step=2
 *                       └── click "Next step"
 *                           → /clientarea/cart.php?a=checkout (WHMCS Lagom)
 *                               └── ASSERT payment gateways visible — STOP
 *
 * Запуск:
 *   npx playwright test tests/funnel.seed.spec.ts --project=chromium
 */
import { test, expect, type Browser, type Page } from "@playwright/test";
import { SeedPage } from "../../pages/SeedPage";
import { CartPage } from "../../pages/CartPage";
import { CheckoutPage } from "../../pages/CheckoutPage";
import {
  BASE_URL,
  Credentials,
  PaymentUrlPatterns,
  VueCartStep2Pattern,
} from "../../fixtures/test-data";

const storageStatePath = "storageState.seed.json";

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

// ─── tests ───────────────────────────────────────────────────────────────────

test.describe("Воронка покупки сида (стоп на странице оплаты)", () => {
  test.setTimeout(180_000);

  test("BUY → корзина → step 2 → страница оплаты", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
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
      await Promise.all([
        page.waitForURL(/\/cart\/?\?[^#]*productId=/, { timeout: 30_000 }),
        seed.buyServerButton().click({ force: true }),
      ]);
      await cartPage.cookieBanner.dismissAll();
      console.log(`[STEP 2] Cart URL: ${page.url()}`);
      expect(page.url()).toContain("productId=");

      // ─── Step 3: auth-step (skipped via storageState) ────────────────
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
      await ensurePastAuthStep(page, cartPage);

      await page
        .waitForURL(VueCartStep2Pattern, { timeout: 30_000 })
        .catch(() => {
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

      const continueBtn = checkoutPage.placeOrderButton();
      if (await continueBtn.count()) {
        await expect(continueBtn.first()).toBeVisible();
        console.log("[STEP 5] Final 'Continue' button visible — NOT clicking ✓");
      }
    } finally {
      await context.close();
    }
  });
});
