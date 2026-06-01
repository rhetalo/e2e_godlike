import { type Page, type Locator } from "@playwright/test";

/**
 * VpsPage — https://godlike.host/vps-hosting/
 * WordPress SSR page. Completely different BEM structure from game server pages.
 *
 * Plan cards: .vps-vds-dedi__plans-item (NOT .storefront__tariff)
 * Deploy button: a.deploy-btn.vps-vds-dedi__plans-item__button (link, not button element)
 * Cart URL after click: /cart-vps/?productId=...&billingCycle=...&service=managed|unmanaged
 *
 * Confirmed via debug spec 17-Apr-2026.
 */
export class VpsPage {
  static readonly url = "/vps-hosting/";

  constructor(private page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto(VpsPage.url, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
  }

  /** All plan cards on the page */
  get planCards(): Locator {
    return this.page.locator(".vps-vds-dedi__plans-item");
  }

  /** All "Deploy Now" buttons/links — scoped to cart-vps links only.
   * Excludes affiliate / UTM links that share the deploy-btn class. */
  get deployButtons(): Locator {
    return this.page.locator("a.deploy-btn[href*='/cart-vps/']");
  }

  /** First "Deploy Now" link pointing to /cart-vps/ */
  get firstDeployButton(): Locator {
    return this.page.locator("a.deploy-btn[href*='/cart-vps/']").first();
  }

  /** Plan card title */
  planTitle(index: number): Locator {
    return this.planCards
      .nth(index)
      .locator('[class*="title"], h3, h4')
      .first();
  }

  /** Click the first Deploy Now link */
  async deployFirstPlan(): Promise<void> {
    await this.firstDeployButton.click();
    await this.page.waitForURL(/\/cart-vps/, { timeout: 20_000 });
  }

  /** Click Deploy Now on a plan by its productId (from href) */
  async deployPlanById(productId: string | number): Promise<void> {
    await this.page
      .locator(`a.deploy-btn[href*="productId=${productId}"]`)
      .click();
    await this.page.waitForURL(/\/cart-vps/, { timeout: 20_000 });
  }

  /** Click the Nth Deploy Now button (0-based) */
  async deployNthPlan(index: number): Promise<void> {
    await this.deployButtons.nth(index).click();
    await this.page.waitForURL(/\/cart-vps/, { timeout: 20_000 });
  }
}
