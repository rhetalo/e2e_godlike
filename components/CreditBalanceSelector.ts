import { type Page, type Locator } from '@playwright/test';
import { CREDIT_BALANCE } from '../utils/selectors';

/**
 * CreditBalanceSelector — iCheck-styled radio group on checkout.
 * Controls whether existing account credit is applied to the order.
 * When "Do not apply" is selected, the payment gateways section becomes visible.
 *
 * WHY a component: iCheck library replaces native radios with styled <ins> elements.
 * Clicking the <ins class="iCheck-helper"> inside the wrapping <label> is the only
 * reliable trigger for iCheck event handlers.
 * This encapsulates that quirk so tests never touch iCheck internals.
 */
export class CreditBalanceSelector {
  readonly applyLabel: Locator;
  readonly skipLabel: Locator;

  constructor(private page: Page) {
    this.applyLabel = page.locator(CREDIT_BALANCE.applyLabel);
    this.skipLabel = page.locator(CREDIT_BALANCE.skipLabel);
  }

  /** Select "Apply credit balance" — hides payment gateways. */
  async applyCredit(): Promise<void> {
    // iCheck uses <ins class="iCheck-helper"> as the clickable target
    await this.applyLabel.locator('ins').click();
  }

  /** Select "Do not apply credit" — reveals payment gateways. */
  async skipCredit(): Promise<void> {
    // iCheck uses <ins class="iCheck-helper"> as the clickable target
    await this.skipLabel.locator('ins').click();
  }
}
