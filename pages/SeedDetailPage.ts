import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { urls } from '../fixtures/testData';

export class SeedDetailPage extends BasePage {
  protected path = urls.seedAtm10;

  readonly title: Locator;
  readonly description: Locator;
  readonly seedInfoSection: Locator;
  readonly calculator: Locator;
  readonly playersSlider: Locator;
  readonly ramSlider: Locator;
  readonly totalPrice: Locator;
  readonly orderButton: Locator;
  readonly nearbyLocations: Locator;
  readonly faqSection: Locator;

  constructor(page: Page) {
    super(page);
    this.title = page.getByRole('heading', { name: /Sky Haven Island/i }).first();
    this.description = page.getByRole('heading', { name: /^Description$/i });
    this.seedInfoSection = page.getByRole('heading', { name: /Seed Information/i });
    this.calculator = page.locator('#seed-calculator');
    this.playersSlider = this.calculator.locator('input[name="fieldPlayersCount"]');
    this.ramSlider = this.calculator.locator('input[name*="Ram" i], input[name*="memory" i]').first();
    this.totalPrice = this.calculator.locator('[class*="price"], [class*="total"]').first();
    this.orderButton = this.calculator.getByRole('link', { name: /Order|Get|Buy|Rent/i }).first();
    this.nearbyLocations = page.getByRole('heading', { name: /Nearby Locations/i });
    this.faqSection = page.getByRole('heading', { name: /Seeds FAQ/i });
  }

  async setPlayers(stepIndex: number): Promise<void> {
    const handle = this.calculator.locator('.v-slider-thumb').first();
    await handle.focus();
    for (let i = 0; i < stepIndex; i++) {
      await handle.press('ArrowRight');
    }
  }

  async clickOrder(): Promise<void> {
    await this.orderButton.click();
  }

  async expectCalculatorReady(): Promise<void> {
    await expect(this.calculator).toBeVisible();
    await expect(this.calculator.getByText(/Get Your Server with this Seed/i)).toBeVisible();
  }
}
