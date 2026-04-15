import { type Page, type Locator } from '@playwright/test';
import { HEADER } from '../utils/selectors';

/**
 * Header — global site header present on every WordPress-rendered page.
 * Contains logo, main navigation, "Host now" CTA, and admin-panels dropdown.
 * WHY a component: identical DOM across all public pages; reused by every Page Object.
 */
export class Header {
  readonly root: Locator;
  readonly logo: Locator;
  readonly nav: Locator;
  readonly hostNowButton: Locator;

  constructor(private page: Page) {
    this.root = page.locator(HEADER.root);
    this.logo = page.locator(HEADER.logo).first();
    this.nav = page.locator(HEADER.nav);
    this.hostNowButton = page.locator(HEADER.hostNowButton);
  }

  async clickHostNow(): Promise<void> {
    await this.hostNowButton.click();
  }

  async navigateToGame(gameName: string): Promise<void> {
    await this.nav.locator(HEADER.navItem, { hasText: gameName }).click();
  }

  navItem(label: string): Locator {
    return this.nav.locator(HEADER.navItem, { hasText: label });
  }
}
