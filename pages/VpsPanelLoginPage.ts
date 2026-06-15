import { type Page, type Locator } from "@playwright/test";
import { PANEL_URL, EMAIL, PASSWORD } from "../utils/auth";

/**
 * VpsPanelLoginPage — https://vf-panel.godlike.host/login
 * VirtFusion v4.x SPA login screen.
 *
 * Confirmed selectors (from debug spec + live page):
 *   - Email:    input[type="email"]
 *   - Password: input[type="password"]
 *   - Submit:   button:has-text("Login")
 *   - Error:    text matching invalid credentials message
 *
 * After successful login → SPA navigates to /dashboard
 */
export class VpsPanelLoginPage {
  static readonly url = `${PANEL_URL}/login`;

  constructor(private page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto(VpsPanelLoginPage.url, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
  }

  get heading(): Locator {
    return this.page.locator("h1, h2").first();
  }

  get emailInput(): Locator {
    return this.page.locator('input[type="email"]').first();
  }

  get passwordInput(): Locator {
    return this.page.locator('input[type="password"]').first();
  }

  get loginButton(): Locator {
    return this.page.locator('button:has-text("Login")').first();
  }

  /** VirtFusion error text shown on invalid credentials */
  get errorMessage(): Locator {
    return this.page.locator(
      ':has-text("Please enter valid credentials"), [class*="alert-danger"], [class*="alert-error"], [class*="error"]'
    ).first();
  }

  get poweredByText(): Locator {
    return this.page.locator(':has-text("VirtFusion")').first();
  }

  async fillEmail(email: string): Promise<void> {
    await this.emailInput.waitFor({ state: "visible", timeout: 10_000 });
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  async submit(): Promise<void> {
    await this.loginButton.click();
  }

  /** Login with default test credentials and wait for /dashboard */
  async loginAsTestUser(): Promise<void> {
    await this.goto();
    await this.fillEmail(EMAIL);
    await this.fillPassword(PASSWORD);
    await Promise.all([
      this.page.waitForURL(/\/dashboard/, {
        timeout: 30_000,
        waitUntil: "domcontentloaded",
      }),
      this.submit(),
    ]);
  }

  /** Login with custom credentials — does NOT assert success */
  async loginWith(email: string, password: string): Promise<void> {
    await this.goto();
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }
}
