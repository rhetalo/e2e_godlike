import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { urls } from '../fixtures/testData';

export class SeedsListPage extends BasePage {
  protected path = urls.seedsList;

  readonly heading: Locator;
  readonly seedCards: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: /Minecraft Seeds/i }).first();
    this.seedCards = page.locator('a[href*="/minecraft-seeds/"]:not([href$="/minecraft-seeds/"])');
    this.searchInput = page.getByPlaceholder(/search/i).first();
  }

  async openSeedByHrefFragment(fragment: string): Promise<void> {
    await this.seedCards.locator(`[href*="${fragment}"]`).first().click();
  }
}
