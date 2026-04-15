import { type Page } from '@playwright/test';
import { BillingCycleSelector } from '../components/BillingCycleSelector';
import { PromoCodeInput } from '../components/PromoCodeInput';
import { OrderSummary } from '../components/OrderSummary';
import { BILLING } from '../utils/selectors';

/**
 * Cart Step 2 — Billing cycle selection, promo code, order review.
 * Still inside the Vue SPA.
 */
export class CartBillingPage {
  readonly billing: BillingCycleSelector;
  readonly promo: PromoCodeInput;
  readonly order: OrderSummary;

  constructor(private page: Page) {
    this.billing = new BillingCycleSelector(page);
    this.promo = new PromoCodeInput(page);
    this.order = new OrderSummary(page);
  }

  async waitForStep2(): Promise<void> {
    await this.page.locator(BILLING.cycleContainer).waitFor({ state: 'visible' });
  }

  async proceedToCheckout(): Promise<void> {
    await this.order.clickNextStep();
    // Step 3 navigates to WHMCS checkout.
    // Use domcontentloaded — the load event can be delayed 30+ seconds
    // because PayPal SDK and Stripe Elements load asynchronously.
    await this.page.waitForURL(/clientarea\/cart\.php/, {
      timeout: 30_000,
      waitUntil: 'domcontentloaded',
    });
  }
}
