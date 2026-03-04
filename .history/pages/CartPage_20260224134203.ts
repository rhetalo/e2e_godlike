import { Page, expect } from '@playwright/test';

export class CartPage {
  constructor(private page: Page) {}

        async validatePromocode() {
    const activated = this.page.locator('.promocode__label-success');
    const invalid = this.page.getByText(/Invalid promocode/i);

    if (await activated.isVisible()) {
        await expect(activated).toContainText('Activated promocode');
        return 'valid';
    }

    if (await invalid.isVisible()) {
            throw new Error('Invalid promocode detected');
    }

    throw new Error('Promocode status not found');
    }
}