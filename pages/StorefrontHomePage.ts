/**
 * StorefrontHomePage — главная godlike.host как вход в воронку покупки.
 *
 * Инкапсулирует навигацию «главная → View all plans → Add to Cart», которая раньше
 * инлайнилась raw-локаторами в registration-flow и funnel-спеках. Переиспользуется
 * этими тестами вместо дублирования storefront-навигации.
 */
import type { Locator } from "@playwright/test";
import { BasePage } from "./BasePage";
import { STOREFRONT } from "../utils/selectors";
import { Urls } from "../fixtures/test-data";

export class StorefrontHomePage extends BasePage {
  async open(): Promise<void> {
    await this.goto(Urls.home);
  }

  viewAllPlansLink(): Locator {
    return this.page.locator(STOREFRONT.viewAllPlans).first();
  }

  firstAddToCartButton(): Locator {
    return this.page.locator(STOREFRONT.tariffAddToCart).first();
  }

  /** Перейти к списку тарифов и добавить первый в корзину (вход в воронку). */
  async addFirstTariffToCart(): Promise<void> {
    const plans = this.viewAllPlansLink();
    await plans.waitFor({ state: "visible", timeout: 20_000 });
    await plans.click();
    const add = this.firstAddToCartButton();
    await add.waitFor({ state: "visible", timeout: 20_000 });
    await add.click();
  }
}
