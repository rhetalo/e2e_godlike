import { type Page } from '@playwright/test';
import { Header } from '../components/Header';
import { GAME_SERVERS } from '../utils/selectors';

export class GameServersPage {
  readonly header: Header;
  readonly url = '/game-servers-en/';

  constructor(private page: Page) {
    this.header = new Header(page);
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url);
  }

  get gameLinks() {
    return this.page.locator(GAME_SERVERS.gameLink);
  }

  filterTab(label: string) {
    return this.page.locator(GAME_SERVERS.filterTabs).locator('*', { hasText: label });
  }
}
