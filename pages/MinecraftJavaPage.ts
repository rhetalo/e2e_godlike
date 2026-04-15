import { type Page } from '@playwright/test';
import { Header } from '../components/Header';
import { StorefrontTariffCard } from '../components/StorefrontTariffCard';
import { STOREFRONT } from '../utils/selectors';

export class MinecraftJavaPage {
  readonly header: Header;
  readonly url = '/minecraft-java-servers-hosting/';

  constructor(private page: Page) {
    this.header = new Header(page);
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url);
  }

  tariffCard(planName: string): StorefrontTariffCard {
    return StorefrontTariffCard.byName(this.page, planName);
  }

  get allTariffCards() {
    return StorefrontTariffCard.all(this.page);
  }

  async addPlanToCart(planName: string): Promise<void> {
    await this.tariffCard(planName).addToCart();
  }
}
