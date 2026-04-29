/**
 * CookieBanner — obstruction dismisser.
 *
 * Despite the name, this component handles every non-functional overlay that
 * can otherwise intercept clicks on godlike.host:
 *
 *   1. Cookie / GDPR consent banners (multiple WordPress plugins).
 *   2. The "$1/GB Flash Sale" promotional modal that appears on the Vue
 *      hosting pages a few hundred ms after first paint.
 *   3. The "I accept and continue" terms modal that pops up during the cart
 *      flow.
 *
 * All methods are best-effort — if the overlay isn't on the page, nothing
 * happens.
 */
import type { Locator, Page } from "@playwright/test";

const COOKIE_ACCEPT_SELECTORS: readonly string[] = [
  // Common WordPress cookie plugins
  "#wt-cli-accept-all-btn",
  "#cookie_action_close_header",
  "#cn-accept-cookie",
  // Generic
  'button:has-text("Accept all")',
  'button:has-text("Accept All")',
  'button:has-text("Accept")',
  'button:has-text("I agree")',
];

export class CookieBanner {
  constructor(private readonly page: Page) {}

  acceptCookieButton(): Locator {
    return this.page.locator(COOKIE_ACCEPT_SELECTORS.join(", ")).first();
  }

  flashSaleClose(): Locator {
    return this.page.locator(".flash-sale-modal__close").first();
  }

  termsAccept(): Locator {
    return this.page.locator(".terms-modal__actions-accept").first();
  }

  /**
   * Run all dismissals at once. Each branch is wrapped in `.catch` because
   * none of these overlays are guaranteed to exist on every page.
   */
  async dismissAll(): Promise<void> {
    // 1. Cookie banner
    const cookieBtn = this.acceptCookieButton();
    if (await cookieBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await cookieBtn.click({ trial: false }).catch(() => undefined);
    }

    // 2. Flash-sale modal — sometimes re-appears, retry up to 3x and then
    //    inject CSS to keep it dead.
    for (let i = 0; i < 3; i++) {
      const close = this.flashSaleClose();
      if (await close.isVisible({ timeout: 800 }).catch(() => false)) {
        await close.click({ force: true }).catch(() => undefined);
        await this.page.waitForTimeout(150);
      } else {
        break;
      }
    }
    await this.page
      .addStyleTag({
        content: `.flash-sale-modal__wrapper, .flash-sale-modal {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }`,
      })
      .catch(() => undefined);

    // 3. Terms modal — appears on the cart after clicking Next step.
    const terms = this.termsAccept();
    if (await terms.isVisible({ timeout: 800 }).catch(() => false)) {
      await terms.click({ force: true }).catch(() => undefined);
    }
  }

  /** Backwards-compat alias used by some call sites. */
  async dismissIfPresent(): Promise<boolean> {
    await this.dismissAll();
    return true;
  }
}
