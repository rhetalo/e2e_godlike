import { Locator, Page, expect } from '@playwright/test';

export class CartPage {
  readonly page: Page;
  readonly root: Locator;
  readonly summary: Locator;
  readonly totalPrice: Locator;
  readonly checkoutButton: Locator;
  readonly emailInput: Locator;
  readonly promoCodeInput: Locator;
  readonly applyPromoButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.locator('main, [class*="cart"]').first();
    this.summary = page.locator('[class*="summary"], [class*="order"]').first();
    this.totalPrice = page.locator('[class*="total"]').first();
    this.checkoutButton = page.getByRole('button', { name: /Checkout|Pay|Continue|Place Order/i }).first();
    this.emailInput = page.locator('input[type="email"], input[name*="mail" i]').first();
    this.promoCodeInput = page.locator('input[name*="promo" i], input[placeholder*="promo" i]').first();
    this.applyPromoButton = page.getByRole('button', { name: /Apply/i }).first();
    this.errorMessage = page.locator('[class*="error"], [role="alert"]').first();
  }

  async assertOnCart(): Promise<void> {
    await expect(this.page).toHaveURL(/\/cart/);
  }

  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  async applyPromo(code: string): Promise<void> {
    await this.promoCodeInput.fill(code);
    await this.applyPromoButton.click();
  }
}
