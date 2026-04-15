import { type Page, type Locator } from '@playwright/test';
import { PROMO } from '../utils/selectors';

/**
 * PromoCodeInput — promo/coupon field + apply button on Step 2.
 * WHY a component: validates promo logic (valid/invalid); self-contained UI widget.
 */
export class PromoCodeInput {
  readonly input: Locator;
  readonly applyButton: Locator;
  readonly successLabel: Locator;
  readonly errorLabel: Locator;

  constructor(private page: Page) {
    this.input = page.locator(PROMO.input);
    this.applyButton = page.locator(PROMO.applyButton);
    this.successLabel = page.locator(PROMO.successLabel);
    this.errorLabel = page.locator(PROMO.errorLabel);
  }

  async applyCode(code: string): Promise<void> {
    await this.input.clear();
    await this.input.fill(code);
    await this.applyButton.click();
  }
}
