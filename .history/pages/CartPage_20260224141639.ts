// CartPage.ts
import { Page } from '@playwright/test';

export class CartPage {
    constructor(public page: Page) {}

    /**
   * Проверяет статус промокода на странице
   * @returns {Promise<{status: 'activated' | 'invalid'; code?: string}>}
   */
    async validatePromocode(): Promise<{ status: 'activated' | 'invalid'; code?: string }> {
    // Проверяем валидный промокод
    const successText = await this.page.locator('.promocode__label-success').textContent();
    if (successText && successText.includes('Activated promocode:')) {
      // Извлекаем промокод после двоеточия
        const code = successText.split(':')[1]?.trim().replace(')', '');
        return { status: 'activated', code };
    }

    // Проверяем невалидный промокод
    const errorText = await this.page.locator('.promocode__label-error').textContent();
    if (errorText && errorText.includes('Invalid promocode')) {
        return { status: 'invalid' };
    }

    // Если ни один элемент не найден
    throw new Error('Promocode status not found');
    }
}