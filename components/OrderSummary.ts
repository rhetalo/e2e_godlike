import { type Page, type Locator } from '@playwright/test';
import { ORDER_SUMMARY } from '../utils/selectors';

/**
 * OrderSummary — plan, billing cycle, total shown on Step 2 of the cart.
 * WHY a component: displays computed pricing that tests must verify.
 */
export class OrderSummary {
  readonly container: Locator;
  readonly nextStepButton: Locator;

  constructor(private page: Page) {
    this.container = page.locator(ORDER_SUMMARY.container).first();
    this.nextStepButton = page.locator(ORDER_SUMMARY.nextStepButton);
  }

  async clickNextStep(): Promise<void> {
    await this.nextStepButton.click();
  }
}
