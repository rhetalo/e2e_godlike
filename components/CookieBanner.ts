/**
 * CookieBanner — obstruction dismisser.
 *
 * Despite the name, this component handles every non-functional overlay that
 * can otherwise intercept clicks on godlike.host and vf-panel.godlike.host:
 *
 *   1. Cookie / GDPR consent banners (multiple WordPress plugins).
 *   2. The "$1/GB Flash Sale" promotional modal — appears on Vue hosting pages
 *      a few hundred ms after first paint.
 *   3. The "I accept and continue" terms modal — pops up during the cart flow.
 *   4. Weekend / sale promotion banners — appear on vf-panel and public site
 *      during promotional campaigns (weekends, holidays).
 *
 * All methods are best-effort — if the overlay isn't on the page, nothing
 * happens. Never throws.
 *
 * ── HOW TO ADD A NEW BANNER ────────────────────────────────────────────────
 *
 * When a new overlay appears:
 *   1. Open DevTools (F12) → Elements
 *   2. Find the modal/banner root element → right-click → Copy → Copy selector
 *   3. Find the close/dismiss button → same process
 *   4. Add the selectors to PROMO_BANNER_SELECTORS and PROMO_CLOSE_SELECTORS below
 *   5. `setupBannerHandlers(page)` will pick them up automatically
 *
 * ── WEEKEND / CAMPAIGN BANNER SELECTORS ────────────────────────────────────
 *
 * ⚠️  Update these when you see a new promo banner in DevTools:
 *
 *   PROMO_BANNER_SELECTORS  — root element of the banner (used by addLocatorHandler)
 *   PROMO_CLOSE_SELECTORS   — close/dismiss button inside the banner
 */
import type { Locator, Page } from "@playwright/test";

const COOKIE_ACCEPT_SELECTORS: readonly string[] = [
  "#wt-cli-accept-all-btn",
  "#cookie_action_close_header",
  "#cn-accept-cookie",
  'button:has-text("Accept all")',
  'button:has-text("Accept All")',
  'button:has-text("Accept")',
  'button:has-text("I agree")',
];

/**
 * Root selectors for promotional / sale banners.
 *
 * ── ADD REAL SELECTOR HERE when a new banner appears ──────────────────────
 *
 * Example (from DevTools):
 *   .promo-overlay          — if the banner has class "promo-overlay"
 *   #weekend-sale-modal     — if it has id "weekend-sale-modal"
 *   [data-modal="promo"]    — if it has a data attribute
 *
 * Current confirmed selectors:
 *   .flash-sale-modal        — "$1/GB Flash Sale" on Vue hosting pages
 *   .flash-sale-modal__wrapper
 */
const PROMO_BANNER_SELECTORS: readonly string[] = [
  // ── Confirmed (May 2026) ──────────────────────────────────────────────────
  ".flash-sale-modal",
  ".flash-sale-modal__wrapper",

  // ── Generic patterns — catches most campaign banners ─────────────────────
  '[class*="promo-modal"]',
  '[class*="sale-modal"]',
  '[class*="promo-banner"]',
  '[class*="sale-banner"]',
  '[class*="promo-overlay"]',
  '[id*="promo-modal"]',
  '[id*="sale-modal"]',
  '[id*="promo-popup"]',
  '[id*="sale-popup"]',

  // ── ⚠️  ADD YOUR REAL SELECTOR HERE ──────────────────────────────────────
  // Example: '.my-weekend-promo-banner',
];

/**
 * Close button selectors — tried in order, first match wins.
 *
 * ── ADD REAL CLOSE SELECTOR HERE when a new banner appears ────────────────
 */
const PROMO_CLOSE_SELECTORS: readonly string[] = [
  // ── Confirmed (May 2026) ──────────────────────────────────────────────────
  ".flash-sale-modal__close",

  // ── Generic close button patterns ─────────────────────────────────────────
  '[class*="promo-modal"] .btn-close',
  '[class*="promo-modal"] button.close',
  '[class*="promo-modal"] [aria-label="Close"]',
  '[class*="sale-modal"] .btn-close',
  '[class*="sale-modal"] button.close',
  '[class*="sale-modal"] [aria-label="Close"]',
  '[class*="promo-banner"] .btn-close',
  '[class*="promo-banner"] button.close',
  '[class*="promo-overlay"] .btn-close',

  // Bootstrap generic close inside any visible modal-like container
  '[class*="promo"] [data-bs-dismiss]',
  '[class*="sale"] [data-bs-dismiss]',

  // ── ⚠️  ADD YOUR REAL CLOSE SELECTOR HERE ────────────────────────────────
  // Example: '.my-weekend-promo-banner .close-btn',
];

/**
 * CSS injected to permanently hide promo banners after close attempt.
 * Prevents re-appearance without reloading the page.
 */
const PROMO_HIDE_CSS = `
  .flash-sale-modal, .flash-sale-modal__wrapper,
  [class*="promo-modal"], [class*="sale-modal"],
  [class*="promo-banner"], [class*="sale-banner"],
  [class*="promo-overlay"], [id*="promo-modal"],
  [id*="sale-modal"], [id*="promo-popup"], [id*="sale-popup"] {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
    opacity: 0 !important;
  }
`;

export class CookieBanner {
  constructor(private readonly page: Page) {}

  // ── Locators ──────────────────────────────────────────────────────────────

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
   * Root element of any known promotional/sale banner.
   * Used by setupBannerHandlers() as the addLocatorHandler trigger.
   */
  promoBannerRoot(): Locator {
    return this.page.locator(PROMO_BANNER_SELECTORS.join(", ")).first();
  }

  /**
   * Close button inside any known promotional/sale banner.
   */
  promoBannerClose(): Locator {
    return this.page.locator(PROMO_CLOSE_SELECTORS.join(", ")).first();
  }

  // ── Dismissal methods ─────────────────────────────────────────────────────

  /**
   * Dismiss the promo / weekend-sale banner.
   *
   * Strategy:
   *   1. Try clicking the close button (up to 3 attempts — banner can re-appear)
   *   2. Inject CSS to permanently hide all matching elements
   *
   * Never throws.
   */
  async dismissPromo(): Promise<void> {
    for (let i = 0; i < 3; i++) {
      const close = this.promoBannerClose();
      if (await close.isVisible({ timeout: 600 }).catch(() => false)) {
        await close.click({ force: true }).catch(() => undefined);
        await this.page.waitForTimeout(150);
      } else {
        break;
      }
    }
    await this.page.addStyleTag({ content: PROMO_HIDE_CSS }).catch(() => undefined);
  }

  /**
   * Run all dismissals at once. Each branch is wrapped in `.catch` because
   * none of these overlays are guaranteed to exist on every page.
   *
   * Order:
   *   1. Cookie banner (one-shot)
   *   2. Flash-sale / promo modal (up to 3 retries + CSS kill)
   *   3. Weekend / campaign banner (close + CSS kill)
   *   4. Terms modal (one-shot)
   */
  async dismissAll(): Promise<void> {
    // 1. Cookie banner
    const cookieBtn = this.acceptCookieButton();
    if (await cookieBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await cookieBtn.click({ trial: false }).catch(() => undefined);
    }

    // 2. Flash-sale modal (legacy selector) — up to 3 retries + CSS
    for (let i = 0; i < 3; i++) {
      const close = this.flashSaleClose();
      if (await close.isVisible({ timeout: 600 }).catch(() => false)) {
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

    // 3. Weekend / campaign / generic promo banners
    await this.dismissPromo();

    // 4. Terms modal
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
