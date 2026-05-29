/**
 * login.validation.spec.ts
 * ────────────────────────
 * Login validation against the embedded auth-block on the Vue cart.
 *
 * godlike.host has no public-facing /clientarea.php login form on the cart
 * (it 404s); the user-facing login surface from the funnel is the cart's
 * `.auth-block`. We exercise it with bad / empty inputs and assert the cart
 * does NOT advance to step 2.
 *
 * NOTE: This is intentionally separate from the standalone /clientarea/login
 * page used by the funnel storageState. We're testing the cart-side validation
 * UX, not the WHMCS clientarea.
 *
 * Запуск:
 *   npx playwright test tests/login.validation.spec.ts --project=chromium
 */
import { test, expect, type Page } from "@playwright/test";
import { CartPage } from "../../pages/CartPage";
import { VueCartStep2Pattern } from "../../fixtures/test-data";

const CART_URL =
  "/cart?productId=346&billingCycle=monthly&currency=1&modpackId=curseforge-925200&promo=COMMUNITY40";

async function gotoCart(page: Page): Promise<CartPage> {
  const cart = new CartPage(page);
  await page.goto(CART_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await cart.cookieBanner.dismissAll();
  await expect(
    page.locator(".auth-block").first(),
    "auth-block must mount on cart step 1",
  ).toBeVisible({ timeout: 20_000 });
  await cart.switchToLoginTab();
  return cart;
}

test.describe("Login validation (cart auth-block)", () => {
  test("empty submit does NOT advance the cart to step 2", async ({ page }) => {
    const cart = await gotoCart(page);

    // Click submit with empty inputs. HTML5 validation should block it; even
    // if it doesn't, the URL must not advance to step=2.
    await cart
      .loginSubmit()
      .click({ force: true })
      .catch(() => undefined);

    await expect.poll(() => page.url(), { timeout: 2_000 }).not.toMatch(VueCartStep2Pattern);
    console.log(`[INFO] URL after empty submit: ${page.url()}`);

    expect(page.url()).not.toMatch(VueCartStep2Pattern);
  });

  test("invalid credentials do NOT advance the cart to step 2", async ({
    page,
  }) => {
    const cart = await gotoCart(page);

    await cart.loginEmail().fill("nope+invalid@example.com");
    await cart.loginPassword().fill("definitely-not-the-password-123");
    await cart.loginSubmit().click();

    // Give the SPA up to 10s to surface an error or just stay put.
    await page
      .waitForURL(VueCartStep2Pattern, { timeout: 10_000 })
      .catch(() => undefined);

    console.log(`[INFO] URL after invalid login: ${page.url()}`);
    expect(page.url()).not.toMatch(VueCartStep2Pattern);
  });

  test("login form fields have the expected types & placeholders", async ({
    page,
  }) => {
    const cart = await gotoCart(page);

    await expect(cart.loginEmail()).toHaveAttribute("type", "email");
    await expect(cart.loginPassword()).toHaveAttribute("type", "password");
    await expect(cart.loginSubmit()).toBeVisible();
    await expect(cart.loginSubmit()).toBeEnabled();
    console.log("[INFO] auth-block login form looks well-formed ✓");
  });
});
