import { type Page } from '@playwright/test';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { StorefrontTariffCard } from '../components/StorefrontTariffCard';
import { STOREFRONT } from '../utils/selectors';

export class LandingPage {
  readonly header: Header;
  readonly footer: Footer;
  readonly url = '/';

  constructor(private page: Page) {
    this.header = new Header(page);
    this.footer = new Footer(page);
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url);
  }

  tariffCard(planName: string): StorefrontTariffCard {
    return StorefrontTariffCard.byName(this.page, planName);
  }

  get variantTabs() {
    return this.page.locator(STOREFRONT.variantTab);
  }

  async selectVariant(label: string): Promise<void> {
    await this.page.locator(STOREFRONT.variantTab, { hasText: label }).click();
  }

  async addFirstPlanToCart(): Promise<void> {
    await StorefrontTariffCard.nth(this.page, 0).addToCart();
  }
}
