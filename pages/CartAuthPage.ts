import { type Page } from '@playwright/test';
import { AuthBlock } from '../components/AuthBlock';
import { AUTH } from '../utils/selectors';
import { buildCartUrl } from '../utils/url-builder';
import type { CartQueryParams } from '../data/promo-codes';

/**
 * Cart Step 1 — Authentication.
 * Vue SPA mounted at [data-v-app]; shows Register/Login before proceeding.
 */
export class CartAuthPage {
  readonly auth: AuthBlock;

  constructor(private page: Page) {
    this.auth = new AuthBlock(page);
  }

  async goto(params?: Partial<CartQueryParams>): Promise<void> {
    await this.page.goto(buildCartUrl(params));
  }

  async waitForApp(): Promise<void> {
    await this.page.locator(AUTH.vueApp).waitFor({ state: 'attached' });
  }

  /**
   * Check if the auth form is currently visible (user not logged in).
   * When already authenticated, the Vue app skips Step 1 and goes to Step 2.
   */
  async isAuthFormVisible(): Promise<boolean> {
    // Wait for the app to settle and determine which step is shown
    await this.page.waitForTimeout(1500);
    const authWrapper = this.page.locator(AUTH.wrapper);
    return authWrapper.isVisible().catch(() => false);
  }

  async loginAndProceed(email: string, password: string): Promise<void> {
    await this.waitForApp();

    // Check if user is already authenticated — if so, skip login
    const needsLogin = await this.isAuthFormVisible();
    if (!needsLogin) {
      // Already on step 2 — wait for URL to contain step=2 if it doesn't yet
      const currentUrl = this.page.url();
      if (!currentUrl.includes('step=2')) {
        await this.page.waitForURL(/step=2/, { timeout: 10_000 }).catch(() => {
          // URL may already show step 2 without the param being explicit
        });
      }
      return;
    }

    await this.auth.login(email, password);
    // After login the Vue app transitions to step 2; wait for URL change
    await this.page.waitForURL(/step=2/, { timeout: 15_000 });
  }
}
