import { type Page, type Locator } from '@playwright/test';
import { AUTH } from '../utils/selectors';

/**
 * AuthBlock — Register / Login panel inside the Vue cart SPA (Step 1).
 * Includes social-login buttons and email/password form.
 * WHY a component: shared between /cart and /mobile-cart; drives auth state for the funnel.
 */
export class AuthBlock {
  readonly loginTab: Locator;
  readonly registerTab: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;

  constructor(private page: Page) {
    const app = page.locator(AUTH.vueApp);
    this.loginTab = app.locator(AUTH.loginTab);
    this.registerTab = app.locator(AUTH.registerTab);
    this.emailInput = app.locator('input[type="email"]');
    this.passwordInput = app.locator('input[type="password"]').first();
    this.loginButton = app.locator(AUTH.loginButton);
  }

  async switchToLogin(): Promise<void> {
    await this.loginTab.click();
    await this.loginButton.waitFor({ state: 'visible' });
  }

  async login(email: string, password: string): Promise<void> {
    await this.switchToLogin();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
