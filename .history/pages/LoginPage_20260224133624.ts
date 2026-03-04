import { Page } from '@playwright/test';

export class LoginPage {
    constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/clientarea/login');
  }

  async login(email: string, password: string) {
    await this.page.locator('#inputEmail').fill(email);
    await this.page.locator('#inputPassword').fill(password);
    await this.page.locator('#login').click();
  }
}