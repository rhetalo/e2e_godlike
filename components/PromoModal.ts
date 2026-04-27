import { Locator, Page } from '@playwright/test';

export class PromoModal {
  readonly page: Page;
  readonly root: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.locator('.flash-sale-modal, [class*="flash-sale-modal"]').first();
    this.closeButton = this.root.locator('[class*="close"], button[aria-label*="close" i]').first();
  }

  async dismissIfVisible(): Promise<void> {
    try {
      await this.root.waitFor({ state: 'visible', timeout: 4000 });
      if (await this.closeButton.isVisible()) {
        await this.closeButton.click();
      } else {
        await this.page.keyboard.press('Escape');
      }
    } catch { /* banner did not appear — OK */ }
  }
}
