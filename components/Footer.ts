import { type Page, type Locator } from '@playwright/test';
import { FOOTER } from '../utils/selectors';

/**
 * Footer — global site footer. Links to product pages, legal, socials.
 * WHY a component: identical on every page, useful for link-presence assertions.
 */
export class Footer {
  readonly root: Locator;

  constructor(private page: Page) {
    this.root = page.locator(FOOTER.root);
  }

  link(text: string): Locator {
    return this.root.locator('a', { hasText: text });
  }
}
