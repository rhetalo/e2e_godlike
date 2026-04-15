import { type Page, type Locator } from '@playwright/test';
import { STOREFRONT } from '../utils/selectors';

/**
 * StorefrontTariffCard — a single pricing plan card on product pages.
 * Each card shows plan name, slots/RAM, price, and an "Add to Cart" CTA.
 * WHY a component: repeated N times per product page; interaction triggers funnel entry.
 */
export class StorefrontTariffCard {
  constructor(private readonly root: Locator) {}

  get title(): Locator {
    return this.root.locator(STOREFRONT.tariffTitle);
  }

  get price(): Locator {
    return this.root.locator(STOREFRONT.tariffPrice);
  }

  get addToCartButton(): Locator {
    return this.root.locator(STOREFRONT.tariffAddToCart);
  }

  async addToCart(): Promise<void> {
    await this.addToCartButton.click();
  }

  static all(page: Page): Locator {
    return page.locator(STOREFRONT.tariffCard);
  }

  static nth(page: Page, index: number): StorefrontTariffCard {
    return new StorefrontTariffCard(page.locator(STOREFRONT.tariffCard).nth(index));
  }

  static byName(page: Page, planName: string): StorefrontTariffCard {
    return new StorefrontTariffCard(
      page.locator(STOREFRONT.tariffCard, { hasText: planName })
    );
  }
}
