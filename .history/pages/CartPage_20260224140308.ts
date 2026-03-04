import { Page } from '@playwright/test';

export class CartPage {
  constructor(public page: Page) {} // <-- явная типизация
    /**
   * Проверяет статус промокода на странице
   * @returns {Promise<{status: 'activated' | 'invalid', code?: string}>}
   */
    async validatePromocode() {
    const success = this.page.locator('.promocode__label-success');
    const error = this.page.locator('.promocode__label-error');

    // Ждем появления одного из двух вариантов
    const result = await Promise.race([
        success.waitFor({ state: 'visible', timeout: 5000 }).then(() => 'success').catch(() => null),
        error.waitFor({ state: 'visible', timeout: 5000 }).then(() => 'error').catch(() => null)
    ]);

    if (result === 'success') {
        const text = await success.textContent();
      const code = text.split(':')[1].trim().replace(')', ''); // извлекаем промокод
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