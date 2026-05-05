import { type Page, type Locator } from '@playwright/test';
import { CreditBalanceSelector } from '../components/CreditBalanceSelector';
import { PaymentMethodSelector } from '../components/PaymentMethodSelector';
import { StripeCardFields } from '../components/StripeCardFields';
import { CHECKOUT } from '../utils/selectors';

/**
 * Cart Step 3 — WHMCS Checkout with payment methods.
 *
 * Page load order:
 *   1. WHMCS server-renders the form (#frmCheckout)
 *   2. iCheck initialises radio buttons (credit balance + payment method)
 *   3. Stripe Elements JS injects card-entry iframes asynchronously
 *   4. PayPal SDK loads its button iframe on demand
 *
 * State dependencies:
 *   - Credit balance radio must be set to "skip" before payment gateways are visible
 *   - Stripe radio must be selected before card iframes become interactable
 */
export class CheckoutPage {
  readonly creditBalance: CreditBalanceSelector;
  readonly payment: PaymentMethodSelector;
  readonly stripeCard: StripeCardFields;

  constructor(private page: Page) {
    this.creditBalance = new CreditBalanceSelector(page);
    this.payment = new PaymentMethodSelector(page);
    this.stripeCard = new StripeCardFields(page);
  }

  /* ---------- Navigation ---------- */

  async goto(): Promise<void> {
    await this.page.goto('/clientarea/cart.php?a=checkout');
  }

  /* ---------- Readiness waits ---------- */

  async waitForCheckoutReady(): Promise<void> {
    await this.page.locator(CHECKOUT.form).waitFor({ state: 'attached', timeout: 20_000 });
  }

  /** Full sequence: skip credit → select Stripe → wait for iframes. */
  async revealStripeFields(): Promise<void> {
    await this.creditBalance.skipCredit();
    await this.payment.selectStripe();
    await this.stripeCard.waitForReady();
  }

  /* ---------- Locators ---------- */

  get form(): Locator {
    return this.page.locator(CHECKOUT.form);
  }

  get stepIndicator(): Locator {
    return this.page.locator(CHECKOUT.stepIndicator);
  }

  get orderSummary(): Locator {
    return this.page.locator(CHECKOUT.orderSummary).first();
  }

  get submitButton(): Locator {
    return this.page.locator(CHECKOUT.submitButton);
  }

  get paymentGatewaysContainer(): Locator {
    return this.page.locator('#paymentGatewaysContainer');
  }

  get paypalContainer(): Locator {
    return this.page.locator(CHECKOUT.paypalContainer);
  }

  get paypalAlert(): Locator {
    return this.page.locator(CHECKOUT.paypalAlert);
  }
}
