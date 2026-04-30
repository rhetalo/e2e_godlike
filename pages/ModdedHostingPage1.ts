import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { urls } from '../fixtures/testData';

export class ModdedHostingPage extends BasePage {
  protected path = urls.moddedHosting;

  readonly heroHeading: Locator;
  readonly planCalculator: Locator;
  readonly modpackSearchInput: Locator;
  readonly modpackCards: Locator;
  readonly billingCycleSelector: Locator;
  readonly orderNowButton: Locator;
  readonly priceLabel: Locator;
  readonly faqSection: Locator;

  constructor(page: Page) {
    super(page);
    this.heroHeading = page.getByRole('heading', { name: /Modded Minecraft Server Hosting/i }).first();
    this.planCalculator = page.locator('#plan-calculator');
    this.modpackSearchInput = this.planCalculator.getByPlaceholder(/search/i).first();
    this.modpackCards = this.planCalculator.locator('[class*="modpack"], [class*="plan-calculator__item"]');
    this.billingCycleSelector = this.planCalculator.locator('[class*="billing"], [class*="period"]').first();
    this.orderNowButton = this.planCalculator.getByRole('link', { name: /Order|Buy|Get Started|Configure/i }).first();
    this.priceLabel = this.planCalculator.locator('[class*="price"]').first();
    this.faqSection = page.getByRole('heading', { name: /Modded Server Hosting FAQs/i });
  }

  async chooseModpackByName(name: string | RegExp): Promise<void> {
    const card = this.planCalculator.getByText(name).first();
    await card.scrollIntoViewIfNeeded();
    await card.click();
  }

  async selectBillingCycle(cycle: 'monthly' | 'quarterly' | 'biannually' | 'annually'): Promise<void> {
    const tab = this.planCalculator.getByRole('tab', { name: new RegExp(cycle, 'i') });
    if (await tab.count()) {
      await tab.first().click();
      return;
    }
    await this.planCalculator.getByText(new RegExp(cycle, 'i')).first().click();
  }

  async clickOrderNow(): Promise<void> {
    await this.orderNowButton.click();
  }

  async getOrderUrl(): Promise<string> {
    const href = await this.orderNowButton.getAttribute('href');
    return href ?? '';
  }
}
