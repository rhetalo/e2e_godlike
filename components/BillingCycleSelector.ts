import { type Page, type Locator } from '@playwright/test';
import { BILLING } from '../utils/selectors';

/**
 * BillingCycleSelector — billing period picker on Step 2 of the cart.
 * Shows 1/3/6/12-month options with per-month prices and savings.
 * WHY a component: encapsulates cycle selection logic; reused in billing tests.
 */
export class BillingCycleSelector {
  readonly container: Locator;

  constructor(private page: Page) {
    this.container = page.locator(BILLING.cycleContainer);
  }

  period(label: string): Locator {
    return this.container.locator(BILLING.period, { hasText: label });
  }

  async selectCycle(label: string): Promise<void> {
    await this.period(label).click();
  }

  activePeriod(): Locator {
    return this.container.locator(BILLING.periodActive);
  }
}
