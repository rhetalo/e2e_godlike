import { type Page, type Locator, expect } from "@playwright/test";

/**
 * VpsConfigPage — "Configure Your Server" step in VPS cart.
 * URL: /cart-vps?...&step=3
 * Still inside the Vue SPA at /cart-vps/.
 *
 * VPS configure structure:
 *   - Location:  .configure-server__location / .configure-server__location-active
 *   - Only 2 locations: USA, Europe (no continent dropdown)
 *   - OS Types:  .configure-server__types > .configure-server__type
 *   - Active OS: .configure-server__type-active
 *   - OS title:  .configure-server__type_title
 *   - Versions:  .custom-dropdown / .custom-dropdown__item
 *   - WordPress on Ubuntu has no dropdown (single option)
 */
export class VpsConfigPage {
  constructor(private page: Page) {}

  // ── Location Selection ────────────────────────────────────────────────────

  /** All location option cards (USA, Europe) */
  get locationItems(): Locator {
    return this.page.locator(".configure-server__location");
  }

  /** Currently active/selected location card */
  get activeLocation(): Locator {
    return this.page.locator(".configure-server__location-active");
  }

  /** Click a location by its label text */
  async selectLocation(name: string): Promise<void> {
    // hasText — подстрока, и активная карточка несёт тот же класс `configure-server__location`
    // → по имени может совпасть НЕСКОЛЬКО (активная + базовая, возможен responsive-дубль/несколько
    // «USA»-регионов). Берём ВИДИМУЮ карточку с ТОЧНЫМ именем и первую — иначе strict-violation
    // «resolved to 2 elements». (В части окружений локаций с «USA» две; live 17-Jul-2026.)
    await this.page
      .locator(".configure-server__location:visible")
      .filter({ hasText: new RegExp(`^\\s*${name}\\s*$`) })
      .first()
      .click();
    // Детерминированный сигнал применения: выбранная локация стала активной.
    await expect(this.activeLocation).toContainText(name);
  }

  /** Get text of the currently selected location */
  async getActiveLocationName(): Promise<string> {
    return (await this.activeLocation.innerText()).trim();
  }

  // ── OS / Pre-installation Type Selection ─────────────────────────────────

  /** Container for all OS type cards */
  get osTypesContainer(): Locator {
    return this.page.locator(".configure-server__types");
  }

  /** All OS type cards */
  get osTypeItems(): Locator {
    return this.page.locator(".configure-server__type");
  }

  /** Currently active/selected OS type card */
  get activeOsType(): Locator {
    return this.page.locator(".configure-server__type-active");
  }

  /** Get the title of the currently active OS type */
  async getActiveOsTypeName(): Promise<string> {
    return (
      await this.activeOsType
        .locator(".configure-server__type_title")
        .innerText()
    ).trim();
  }

  /** Click an OS type card by its exact title text (`.configure-server__type_title`) */
  async selectOsType(name: string): Promise<void> {
    await this.page
      .locator(".configure-server__type")
      .filter({
        has: this.page.locator(".configure-server__type_title", {
          hasText: new RegExp(`^${name}$`),
        }),
      })
      .click();
    // Детерминированный сигнал: выбранный тип ОС стал активным.
    await expect(
      this.activeOsType.locator(".configure-server__type_title"),
    ).toHaveText(new RegExp(`^${name}$`));
  }

  // ── OS Version Dropdown ───────────────────────────────────────────────────

  /**
   * Version dropdown — only visible when the selected OS type has multiple
   * versions. WordPress on Ubuntu has no dropdown.
   */
  get osDropdown(): Locator {
    return this.page.locator(".custom-dropdown");
  }

  /** Clickable header of the dropdown (opens/closes the list) */
  get osDropdownSelected(): Locator {
    return this.page.locator(".custom-dropdown__selected");
  }

  /** Currently displayed version label inside the dropdown header */
  get osDropdownSelectedText(): Locator {
    return this.page.locator(".custom-dropdown__selected-content span");
  }

  /** All version items inside the open dropdown list */
  get osDropdownItems(): Locator {
    return this.page.locator(".custom-dropdown__item");
  }

  /** Get text of the currently selected OS version */
  async getCurrentOsVersion(): Promise<string> {
    return (await this.osDropdownSelectedText.innerText()).trim();
  }

  /** Open the OS version dropdown by clicking its header */
  async openOsDropdown(): Promise<void> {
    await this.osDropdownSelected.click();
    // Дропдаун открыт, когда отрисованы пункты версий.
    await this.osDropdownItems.first().waitFor({ state: "visible", timeout: 5_000 });
  }

  /**
   * Select an OS version by its label text.
   * Opens the dropdown first, then clicks the matching item.
   */
  async selectOsVersion(version: string): Promise<void> {
    await this.openOsDropdown();
    await this.page
      .locator(".custom-dropdown__item")
      .filter({ hasText: version })
      .click();
    // Выбор отражается в заголовке дропдауна.
    await expect(this.osDropdownSelectedText).toContainText(version);
  }

  // ── Order Summary ─────────────────────────────────────────────────────────

  /** "Billing cycle" caption in order summary */
  get billingCaption(): Locator {
    return this.page
      .locator(".order__details-item")
      .filter({ hasText: "Billing cycle" })
      .locator(".order__details-item__caption");
  }

  /** "Location" caption in order summary */
  get orderLocation(): Locator {
    return this.page
      .locator(".order__details-item")
      .filter({ hasText: "Location" })
      .locator(".order__details-item__caption");
  }

  /** "Server type" caption in order summary */
  get orderServerType(): Locator {
    return this.page
      .locator(".order__details-item")
      .filter({ hasText: "Server type" })
      .locator(".order__details-item__caption");
  }

  /** Total price shown in order block */
  get orderTotal(): Locator {
    return this.page.locator(".order__pricing-price");
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  /** Next Step button */
  get nextStepButton(): Locator {
    return this.page.locator(".order__button");
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

  /** Wait for configure step to be fully rendered (locations + OS types) */
  async waitForConfigureStep(): Promise<void> {
    await this.page
      .locator(".configure-server__locations")
      .waitFor({ state: "visible", timeout: 15_000 });
    await this.locationItems
      .first()
      .waitFor({ state: "visible", timeout: 10_000 });
    await this.osTypesContainer.waitFor({ state: "visible", timeout: 10_000 });
  }
}
