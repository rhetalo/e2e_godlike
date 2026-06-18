/**
 * CartPage — Vue cart at /cart and /cart-modded-new/.
 *
 * Verified live URL shape:
 *   https://godlike.host/cart?productId=346&billingCycle=monthly&currency=1
 *     &modpackId=curseforge-925200&promo=COMMUNITY40&location=725
 *
 * The cart has 3 visible steps (driven by `?step=` in the URL):
 *
 *   step 1 (default, no `step` param)  →  product summary on the left,
 *                                         `.auth-block` on the right with
 *                                         tabs "Register" (active) / "Login"
 *                                         (skipped automatically when the
 *                                         user already has a valid session
 *                                         cookie from /clientarea/login)
 *   step 2 (?step=2)                   →  "Select Billing Cycle" + promo
 *                                         input + .order__button-order
 *                                         "Next step"
 *   step 3                             →  redirects to the WHMCS Lagom page
 *                                         /clientarea/cart.php?a=checkout
 *                                         (handled by CheckoutPage)
 *
 * The auth-block exposes its login form only after clicking the "Login" tab.
 * `.cart__input` and `.login__form-bottom__button` are stable once shown.
 */
import type { Locator } from "@playwright/test";
import { BasePage } from "./BasePage";
import { Credentials, VueCartStep2Pattern } from "../fixtures/test-data";

export class CartPage extends BasePage {
  // ─── step 1 (auth-block) ──────────────────────────────────────────────────

  authTab(name: "Register" | "Login"): Locator {
    return this.page
      .locator(".auth-block__header-inner", { hasText: name })
      .first();
  }

  isAuthBlockVisible(): Promise<boolean> {
    return this.page
      .locator(".auth-block")
      .first()
      .isVisible()
      .catch(() => false);
  }

  /** Switch to the Login tab if it isn't active yet. */
  async switchToLoginTab(): Promise<void> {
    // Если auth-block уже исчез (валидная сессия авто-проскочила на step 2) — переключать нечего.
    // Защита от флоки: вкладка Login детачится из DOM в момент авто-перехода (см. funnel.modded).
    if (!(await this.isAuthBlockVisible())) return;
    const activeLogin = this.page.locator(
      ".auth-block__header-inner__active",
      { hasText: "Login" },
    );
    if (await activeLogin.count()) return;
    await this.authTab("Login").click();
    await this.loginEmail().waitFor({ state: "visible", timeout: 10_000 });
  }

  loginEmail(): Locator {
    return this.page.locator('.auth-block input[type="email"]').first();
  }

  loginPassword(): Locator {
    return this.page.locator('.auth-block input[type="password"]').first();
  }

  loginSubmit(): Locator {
    return this.page.locator(".login__form-bottom__button").first();
  }

  loginErrorMessage(): Locator {
    return this.page
      .locator(
        '.auth-block .error, .auth-block [class*="error" i], .login__form-error, .v-snackbar',
      )
      .first();
  }

  // ─── step 1 (auth-block — Register tab, активна по умолчанию) ──────────────

  registerEmail(): Locator {
    return this.page.locator('.auth-block input[type="email"]').first();
  }

  registerUsername(): Locator {
    return this.page
      .locator('.auth-block input[name="username"], .auth-block input[type="text"]')
      .first();
  }

  /** Поля пароля Register-таба: index 0 — пароль, 1 — подтверждение. */
  registerPassword(index: 0 | 1): Locator {
    return this.page.locator('.auth-block input[type="password"]').nth(index);
  }

  registerSubmit(): Locator {
    return this.page.locator('.auth-block button[type="submit"]').first();
  }

  /** Кнопка «Accept» в модалке условий — всплывает после сабмита регистрации. */
  termsAcceptButton(): Locator {
    return this.page.locator(".terms-modal__actions-accept").first();
  }

  /**
   * Fill the embedded login form with credentials and submit.
   * Does NOT assert success — the caller decides what success looks like.
   */
  async loginViaCart(
    email: string = Credentials.email,
    password: string = Credentials.password,
  ): Promise<void> {
    await this.switchToLoginTab();
    await this.loginEmail().fill(email);
    await this.loginPassword().fill(password);
    await this.loginSubmit().click();
  }

  /**
   * Convenience: log in via the cart's auth-block and wait for the cart to
   * advance to step 2. Returns true on success, false on timeout (caller
   * decides what to assert).
   */
  async loginAndAwaitStep2(
    email: string = Credentials.email,
    password: string = Credentials.password,
    timeoutMs = 30_000,
  ): Promise<boolean> {
    await this.loginViaCart(email, password);
    try {
      await this.page.waitForURL(VueCartStep2Pattern, { timeout: timeoutMs });
      return true;
    } catch {
      return false;
    }
  }

  // ─── step 2 (billing cycle) ───────────────────────────────────────────────

  promoInput(): Locator {
    return this.page.locator("#promocode").first();
  }

  promoApplyButton(): Locator {
    return this.page.locator(".promocode__button").first();
  }

  /** "Next step" button — advances from step 2 to the WHMCS payment page. */
  nextStepButton(): Locator {
    return this.page
      .locator(".order__button-order, button:has-text('Next step')")
      .first();
  }

  async clickNextStep(): Promise<void> {
    const btn = this.nextStepButton();
    await btn.scrollIntoViewIfNeeded();
    await btn.click({ force: true });
  }
}
