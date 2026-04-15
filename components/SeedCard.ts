import { type Locator, type Page } from '@playwright/test';
import { SEEDS } from '../utils/selectors';

/**
 * SeedCard — a Minecraft seed card on the seeds listing page.
 * WHY a component: repeated card with image + title; used for content tests.
 */
export class SeedCard {
  constructor(private readonly root: Locator) {}

  get title(): Locator {
    return this.root.locator(SEEDS.cardTitle);
  }

  get image(): Locator {
    return this.root.locator(SEEDS.cardImage);
  }

  get link(): Locator {
    return this.root.locator(SEEDS.cardLink);
  }

  static all(page: Page): Locator {
    return page.locator(SEEDS.card);
  }
}
