import { Page } from '@playwright/test';

export class TariffPage {
    constructor(private page: Page) {}

    getTariffs() {
    return this.page.locator('a.button.storefront__tariff-action__cart');
    }

    async clickTariff(index: number) {
    await this.getTariffs().nth(index).click();
    }

    async getTariffCount() {
    return await this.getTariffs().count();
    }
}