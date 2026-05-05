import { type Page } from '@playwright/test';
import { Header } from '../components/Header';
import { SeedCard } from '../components/SeedCard';
import { SEEDS } from '../utils/selectors';

export class MinecraftSeedsPage {
  readonly header: Header;
  readonly url = '/minecraft-seeds/';

  constructor(private page: Page) {
    this.header = new Header(page);
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url);
  }

  get heroTitle() {
    return this.page.locator(SEEDS.heroTitle);
  }

  get trendingGrid() {
    return this.page.locator(SEEDS.trendingGrid);
  }

  get allCards() {
    return SeedCard.all(this.page);
  }
}
