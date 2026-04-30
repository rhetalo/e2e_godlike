/**
 * CheckoutPage — WHMCS Lagom payment page.
 *
 * Verified URL:  https://godlike.host/clientarea/cart.php?a=checkout
 *
 * Sections present (verified DOM dump in the original godlike-e2e
 * inspection/payment-step3.json):
 *   h2 "Review & Checkout"   ← page title
 *   h3 "Payment Method"      ← gateway selection
 *   h3 "Payment Details"     ← gateway-specific fields
 *
 * Gateway panels (one of these is always present):
 *   .panel.panel-check.panel__gateway.godlikestripe   ← "Godlike Stripe"
 *   .panel.panel-check.panel__gateway.paypal_ppcpv    ← "PayPal"
 *   .panel.panel-check.panel__gateway.coinpayments    ← "Bitcoin & altcoins"
 *
 * Radio inputs:
 *   input.payment-methods    (also `.icheck-control.payment-methods`)
 *
 * The big "Continue" button at the bottom (`.btn.btn-primary.btn-block.btn-lg`)
 * IS the final pay action — these tests must NEVER click it.
 */
import type { Locator } from "@playwright/test";
import { BasePage } from "./BasePage";
import { PaymentUrlPatterns } from "../fixtures/test-data";

export class CheckoutPage extends BasePage {
  reviewHeading(): Locator {
    return this.page
      .locator("h1, h2, h3")
      .filter({ hasText: /Review\s*&\s*Checkout/i })
      .first();
  }

  paymentMethodHeading(): Locator {
    return this.page
      .locator("h1, h2, h3, h4")
      .filter({ hasText: /Payment\s*Method/i })
      .first();
  }

  gatewayPanels(): Locator {
    return this.page.locator(".panel__gateway");
  }

  gatewayPanel(
    slug: "godlikestripe" | "paypal_ppcpv" | "coinpayments",
  ): Locator {
    return this.page.locator(`.panel__gateway.${slug}`).first();
  }

  paymentMethodRadios(): Locator {
    return this.page.locator("input.payment-methods");
  }

  /**
   * The final "Pay" button — exposed only for the safety assertion that we
   * have NOT clicked it. Do not call .click() on it.
   */
  placeOrderButton(): Locator {
    return this.page
      .locator("button.btn-primary.btn-block.btn-lg, #btnCompleteOrder")
      .filter({ hasText: /Continue|Complete|Place|Pay/i })
      .first();
  }

  /** True iff the current URL is one of the recognised payment-step URLs. */
  isOnPaymentStep(): boolean {
    const url = this.page.url();
    return PaymentUrlPatterns.some((re) => re.test(url));
  }
}
