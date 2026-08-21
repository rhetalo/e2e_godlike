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
import { Credentials, VueCartStep2Pattern, PaymentUrlPatterns } from "../fixtures/test-data";
import { AUTH, FUNNEL } from "../utils/selectors";

export class CartPage extends BasePage {
  // ─── step 1 (auth-block) ──────────────────────────────────────────────────

  authTab(name: "Register" | "Login"): Locator {
    return this.page.locator(AUTH.anyTab, { hasText: name }).first();
  }

  isAuthBlockVisible(): Promise<boolean> {
    return this.page
      .locator(AUTH.anyBlock)
      .first()
      .isVisible()
      .catch(() => false);
  }

  /** Switch to the Login tab if it isn't active yet. */
  async switchToLoginTab(): Promise<void> {
    // Если auth-block уже исчез (валидная сессия авто-проскочила на step 2) — переключать нечего.
    // Защита от флоки: вкладка Login детачится из DOM в момент авто-перехода (см. funnel.modded).
    if (!(await this.isAuthBlockVisible())) return;
    const activeLogin = this.page.locator(AUTH.anyTabActive, { hasText: "Login" });
    if (await activeLogin.count()) return;
    await this.authTab("Login").click();
    await this.loginEmail().waitFor({ state: "visible", timeout: 10_000 });
  }

  loginEmail(): Locator {
    return this.page.locator(AUTH.anyLoginEmail).first();
  }

  loginPassword(): Locator {
    return this.page.locator(AUTH.anyLoginPassword).first();
  }

  loginSubmit(): Locator {
    return this.page.locator(AUTH.anyLoginSubmit).first();
  }

  loginErrorMessage(): Locator {
    return this.page.locator(AUTH.anyLoginError).first();
  }

  // ─── step 1 (auth-block — Register tab, активна по умолчанию) ──────────────

  registerEmail(): Locator {
    return this.page.locator(AUTH.anyRegisterEmail).first();
  }

  registerUsername(): Locator {
    return this.page.locator(AUTH.anyRegisterUsername).first();
  }

  /** Поля пароля Register-таба: index 0 — пароль, 1 — подтверждение. */
  registerPassword(index: 0 | 1): Locator {
    return this.page.locator(AUTH.anyRegisterPassword).nth(index);
  }

  registerSubmit(): Locator {
    return this.page.locator(AUTH.anyRegisterSubmit).first();
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
   * Convenience: log in via the cart's auth-block and wait for the cart to move past auth.
   * Returns true on success, false on timeout (caller decides what to assert).
   *
   * DEV-402: имя оставлено прежним — на него ссылается полдесятка спеков, — но признак
   * успеха теперь шире, чем `?step=2`. У новой воронки шагов в URL нет: после логина
   * вместо auth-блока просто появляется форма заказа (.cart-page). Ждём то ИЛИ другое,
   * что первым, поэтому метод одинаково годится для обеих корзин.
   */
  async loginAndAwaitStep2(
    email: string = Credentials.email,
    password: string = Credentials.password,
    timeoutMs = 30_000,
  ): Promise<boolean> {
    await this.loginViaCart(email, password);
    try {
      await Promise.race([
        this.page.waitForURL(VueCartStep2Pattern, { timeout: timeoutMs }),
        this.page.locator(FUNNEL.root).first().waitFor({ state: "visible", timeout: timeoutMs }),
      ]);
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

  /**
   * Кнопка, уводящая корзину дальше — к WHMCS-оплате.
   *
   * DEV-402: в старой корзине это «Next step» (шаг 2 → 3 → оплата), в новой воронке шагов
   * нет вообще: одна форма и сразу «Order Now» → /clientarea/cart.php?a=checkout. Обе в
   * одном локаторе, поэтому advanceToPayment ниже работает без изменений: он крутит клики,
   * пока не окажется на /clientarea/, а сколько кликов для этого нужно — одна или три —
   * ему безразлично.
   */
  nextStepButton(): Locator {
    return this.page
      .locator(`.order__button-order, button:has-text('Next step'), ${FUNNEL.submitButton}`)
      .first();
  }

  async clickNextStep(): Promise<void> {
    // Кнопка «Next step» ре-рендерится при смене Vue-шага и детачится из DOM («not attached»);
    // force:true не ретраит actionability, поэтому одиночный клик мигал. Ретраим с РЕ-РЕЗОЛВОМ
    // локатора. Если во время ретраев ушли на WHMCS (редирект финального шага) — выходим без
    // ошибки: кнопки Next там нет. force — Vue-обработчик, нативный клик не всегда проходит.
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (this.reachedPaymentArea()) return;
      const btn = this.nextStepButton();
      try {
        await btn.waitFor({ state: "visible", timeout: 10_000 });
        await btn.click({ force: true, timeout: 10_000 });
        return;
      } catch (e) {
        lastErr = e;
      }
    }
    if (this.reachedPaymentArea()) return;
    throw lastErr;
  }

  /** True, если мы уже на WHMCS-странице оплаты (cart.php?a=checkout/complete/viewinvoice). */
  isOnPaymentStep(): boolean {
    return PaymentUrlPatterns.some((re) => re.test(this.page.url()));
  }

  /**
   * Дошли до платёжной зоны: либо точный payment-URL, либо в принципе ушли из Vue-корзины на
   * WHMCS (`/clientarea/…`). Второе надёжнее точного `?a=checkout` — не зависит от формы query
   * (валюта/трекинг-суффиксы/промежуточные хопы редиректа).
   */
  reachedPaymentArea(): boolean {
    return this.isOnPaymentStep() || this.page.url().includes("/clientarea/");
  }

  /**
   * Пройти оставшиеся Vue-шаги корзины кликами «Next step», пока не уйдём на WHMCS-оплату.
   * Между billing (step 2) и оплатой есть шаг «Configure your server» (location/тип сервера).
   *
   * ⚠️ Гоча шага Configure (подтверждено live-recon 20-Jul-2026, modded productId=346): step 3 не
   * «созревает» мгновенно — пока Vue догружает список типов сервера, шаг считается невалидным и
   * приложение ОТБРАСЫВАЕТ URL обратно на step=2 (наблюдался отскок step3→step2 через ~400 мс).
   * Прежняя версия ждала `waitForURL(u !== before)` и засчитывала этот отскок step3→step2 как
   * прогресс: на медленном CI осцилляция step2↔step3 проедала бюджет из N кликов, до оплаты дело
   * не доходило → тест «застревал на step=3» (флоки, только CI). Поэтому ждём ИМЕННО уход на
   * `/clientarea/` (bounce больше НЕ прогресс) и ретраим клик Next по реальному time-budget, а не
   * по счётчику шагов: сколько бы отскоков ни случилось, как только конфиг догрузился — клик
   * «прилипает» и уводит на оплату. `clickNextStep` сам выходит при попадании на WHMCS.
   */
  async advanceToPayment(timeoutMs = 90_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (!this.reachedPaymentArea() && Date.now() < deadline) {
      await this.clickNextStep();
      // Ждём ИМЕННО уход на WHMCS (все payment-URL — под /clientarea/), а не «URL сменился»:
      // так отскок step3→step2 не считается прогрессом (см. JSDoc выше). Таймаут короткий —
      // это лишь пауза между попытками клика в пределах общего time-budget.
      await this.page
        .waitForURL(/\/clientarea\//, { timeout: 6_000 })
        .catch(() => {});
    }
  }
}
