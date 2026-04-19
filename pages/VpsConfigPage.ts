import { type Page, type Locator } from "@playwright/test";

/**
 * VpsConfigPage — "Configure Your Server" step in VPS cart.
 * URL: /cart-vps?...&step=3
 * Still inside the Vue SPA at /cart-vps/.
 *
 * VPS configure is fundamentally different from Minecraft configure:
 *   - Location: .configure-server__location (NOT .location or .location__header)
 *   - Only 2 locations: USA, Europe (NO continent dropdown)
 *   - Active location: .configure-server__location-active
 *   - No server type (Paper/Purpur/Spigot)
 *   - No OS selection found on step=3 (may be on a separate step or plan-dependent)
 *
 * Confirmed via debug spec 17-Apr-2026.
 */
export class VpsConfigPage {
  constructor(private page: Page) {}

  // ── Location Selection ────────────────────────────────────────────────────

  /** All location options (USA, Europe) */
  get locationItems(): Locator {
    return this.page.locator(".configure-server__location");
  }

  /** Currently active/selected location */
  get activeLocation(): Locator {
    return this.page.locator(".configure-server__location-active");
  }

  /** Click a location by its label text */
  async selectLocation(name: string): Promise<void> {
    await this.page
      .locator(".configure-server__location")
      .filter({ hasText: name })
      .click();
    await this.page.waitForTimeout(400);
  }

  /** Get text of the currently selected location */
  async getActiveLocationName(): Promise<string> {
    return (await this.activeLocation.innerText()).trim();
  }

  // ── Order Summary ─────────────────────────────────────────────────────────

  /** "Billing cycle" caption in order summary */
  get billingCaption(): Locator {
    return this.page
      .locator(".order__details-item")
      .filter({ hasText: "Billing cycle" })
      .locator(".order__details-item__caption");
  }

  /** Total price shown in order block */
  get orderTotal(): Locator {
    return this.page.locator(".order__pricing-price");
  }

  /** Next Step button */
  get nextStepButton(): Locator {
    return this.page.getByRole("button", { name: "Next step" });
  }

  /** Click Next Step and wait for WHMCS checkout */
  async proceedToCheckout(): Promise<void> {
    await this.nextStepButton.click();
    await this.page.waitForURL(/clientarea\/cart\.php/, {
      timeout: 30_000,
      waitUntil: "domcontentloaded",
    });
  }

  // ── Page readiness ────────────────────────────────────────────────────────

  /** Wait for configure step to be fully rendered */
  async waitForConfigureStep(): Promise<void> {
    await this.page
      .locator(".configure-server__locations")
      .waitFor({ state: "visible", timeout: 15_000 });
    await this.locationItems
      .first()
      .waitFor({ state: "visible", timeout: 10_000 });
  }
}
