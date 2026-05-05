import { Locator, Page, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[type="email"], input[name="email"]').first();
    this.passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    this.submitButton = page.getByRole('button', { name: /Log\s*in|Sign\s*in/i }).first();
    this.errorMessage = page.locator('[class*="error"], [role="alert"]').first();
    this.forgotPasswordLink = page.getByRole('link', { name: /Forgot/i }).first();
  }

  async open(loginUrl: string): Promise<void> {
    await this.page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async assertError(): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
  }
}
