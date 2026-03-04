import { Page } from '@playwright/test';

export class CartPage {
    constructor(public page: Page) {}

    async validatePromocode(): Promise<{ status: 'activated' | 'invalid'; code?: string }> {
    const success = this.page.locator('.promocode__label-success');
    const error = this.page.locator('.promocode__label-error');

    const result = await Promise.race([
        success.waitFor({ state: 'visible', timeout: 5000 }).then(() => 'success').catch(() => null),
        error.waitFor({ state: 'visible', timeout: 5000 }).then(() => 'error').catch(() => null)
    ]);

    if (result === 'success') {
        const text = await success.textContent();
        if (!text) throw new Error('Promocode text is empty');
        
        const code = text.split(':')[1]?.trim().replace(')', '');
        if (!code) throw new Error('Cannot extract promocode from text');

        console.log(`Promocode activated: ${code}`);
        return { status: 'activated', code };
    } else if (result === 'error') {
        console.log('Promocode invalid');
        return { status: 'invalid' };
    } else {
        throw new Error('Promocode status not found');
    }
    }
}