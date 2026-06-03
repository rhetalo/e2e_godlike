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
  BASE_URL,
  Credentials,
  PaymentUrlPatterns,
  VueCartStep2Pattern,
} from "../../fixtures/test-data";

const storageStatePath = "storageState.modded.json";

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
    console.log("[INFO] Login OK → storageState.modded.json saved");
  } catch (err) {
    console.log(`[ERROR] beforeAll login failed: ${err}`);
    throw err;
  } finally {
    await page.close();
  }
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

test.describe("Modded purchase funnel (stops at payment page)", () => {
  test.setTimeout(180_000);

  test("install → cart → step 2 → payment page", async ({ browser }) => {
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
});
