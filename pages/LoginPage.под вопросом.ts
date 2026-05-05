import { type Page, type Locator } from "@playwright/test";
import { PANEL_URL } from "../utils/auth";

/**
 * LoginPage — VirtFusion VPS Panel login
 * URL: https://vf-panel.godlike.host/login
 *
 * VirtFusion is a Vue.js SPA. The login form renders client-side,
 * so we wait for the form to be visible before interacting.
 */
export class LoginPage {
  static readonly url = `${PANEL_URL}/login`;

  constructor(private readonly page: Page) {}

  // ── Locators ────────────────────────────────────────────────────────────

  get emailInput(): Locator {
    return this.page
      .locator('input[type="email"], input[name="email"], #email')
      .first();
  }

  get passwordInput(): Locator {
    return this.page
      .locator('input[type="password"], input[name="password"], #password')
      .first();
  }

  get submitButton(): Locator {
    return this.page
      .locator('button[type="submit"], button:has-text("Login")')
      .first();
  }

  get errorMessage(): Locator {
    return this.page
      .locator('.alert-danger, [class*="error"], [class*="alert--danger"]')
      .first();
  }

  get pageTitle(): Locator {
    return this.page.locator("h1, h2, [class*='title']").first();
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto(LoginPage.url, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await this.emailInput.waitFor({ state: "visible", timeout: 20_000 });
  }

  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Full login flow: navigate → fill → submit → wait for redirect.
   * Returns the URL after successful login.
   */
  async login(email: string, password: string): Promise<string> {
    await this.goto();
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();

    await this.page.waitForURL(/\/(servers|dashboard|$)/, {
      timeout: 30_000,
      waitUntil: "domcontentloaded",
    });

    return this.page.url();
  }

  async isErrorVisible(): Promise<boolean> {
    try {
      await this.errorMessage.waitFor({ state: "visible", timeout: 5_000 });
      return true;
    } catch {
      return false;
    }
  }
}
