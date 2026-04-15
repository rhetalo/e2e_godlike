import { type Page, type Locator } from "@playwright/test";

export class PaymentMethodSelector {
  constructor(private page: Page) {}

  async selectStripe(): Promise<void> {
    await this.page
      .locator('label:has(input[name="paymentmethod"][value="stripe"])')
      .locator("ins")
      .click();
  }

  async selectPayPal(): Promise<void> {
    await this.page
      .locator('label:has(input[name="paymentmethod"][value="paypal_ppcpv"])')
      .locator("ins")
      .click();
  }

  async selectCrypto(): Promise<void> {
    await this.page
      .locator('label:has(input[name="paymentmethod"][value="coinpayments"])')
      .locator("ins")
      .click();
  }

  get stripeRadio(): Locator {
    return this.page.locator('input[name="paymentmethod"][value="stripe"]');
  }

  get paypalRadio(): Locator {
    return this.page.locator(
      'input[name="paymentmethod"][value="paypal_ppcpv"]',
    );
  }

  get cryptoRadio(): Locator {
    return this.page.locator(
      'input[name="paymentmethod"][value="coinpayments"]',
    );
  }
}
