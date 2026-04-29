/**
 * BasePage — common navigation, waiting and shared helpers.
 *
 * All concrete Page Objects extend this class so the `page` is implicit and
 * the cookie banner / promo modal dismissals are handled in one place.
 */
import type { Locator, Page, Response } from "@playwright/test";
import { CookieBanner } from "../components/CookieBanner";

export abstract class BasePage {
  readonly page: Page;
  readonly cookieBanner: CookieBanner;

  constructor(page: Page) {
    this.page = page;
    this.cookieBanner = new CookieBanner(page);
  }

  /** Navigate to a path relative to baseURL, then dismiss obstructive overlays. */
  async goto(path: string): Promise<Response | null> {
    const response = await this.page.goto(path, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await this.cookieBanner.dismissIfPresent();
    return response;
  }

  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState("networkidle").catch(() => {
      /* networkidle can flake on noisy 3rd-party scripts; that's fine */
    });
  }

  url(): string {
    return this.page.url();
  }

  async waitForUrl(regex: RegExp, timeoutMs = 30_000): Promise<void> {
    await this.page.waitForURL(regex, { timeout: timeoutMs });
  }

  /** Site-wide header order button (visible on most pages). */
  headerOrderButton(): Locator {
    return this.page.locator(
      [
        ".site-header__order-button",
        ".navigation-right__button",
        'a[href*="/cart"]',
      ].join(", "),
    );
  }

  pageHeading(): Locator {
    return this.page.locator("h1").first();
  }
}
