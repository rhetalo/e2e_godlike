import { type Page, type Locator } from "@playwright/test";

/**
 * VpsPanelStoragePage — Storage tab on /server/{UUID}
 * VirtFusion v4.x disk / storage management.
 *
 * ALL strings confirmed from :vlang on live server page (May 2026):
 *   vlang[199] = "Storage:"
 *   vlang[206] = "Drive:"           ← exact disk label
 *   vlang[207] = "Primary"          ← primary disk designation
 *   vlang[308] = "HDD"              ← disk type
 *   vlang[186] = "Memory"
 *   vlang[187] = "of"
 *   vlang[188] = "Used"
 *   vlang[189] = "Free"
 *   vlang[200] = "Traffic:"
 *   vlang[277] = "Disk enabled successfully. A restart is required to complete the process."
 *   vlang[278] = "Disk disabled successfully. A restart is required to complete the process."
 */
export class VpsPanelStoragePage {
  constructor(private page: Page) {}

  // ── Disk Labels (confirmed vlang) ─────────────────────────────────────────

  /** "Drive:" label (vlang 206) — confirmed exact text */
  get driveLabel(): Locator {
    return this.page.locator('text="Drive:"').first();
  }

  /** "Primary" disk designation (vlang 207) */
  get primaryDiskLabel(): Locator {
    return this.page.locator('text="Primary"').first();
  }

  /** "HDD" disk type indicator (vlang 308) */
  get hddLabel(): Locator {
    return this.page.locator('text="HDD"').first();
  }

  /** "Storage:" label (vlang 199) */
  get storageLabel(): Locator {
    return this.page.locator('text="Storage:"').first();
  }

  /** "Used" indicator (vlang 188) */
  get usedLabel(): Locator {
    return this.page.locator('text="Used"').first();
  }

  /** "Free" indicator (vlang 189) */
  get freeLabel(): Locator {
    return this.page.locator('text="Free"').first();
  }

  // ── Disk info elements ────────────────────────────────────────────────────

  /** Any GB size display (numeric + "GB" text) */
  get diskSizeGb(): Locator {
    return this.page.locator(':has-text("GB")').first();
  }

  /** Usage bar / progress bar if present */
  get usageBar(): Locator {
    return this.page.locator('[role="progressbar"], [class*="progress"]').first();
  }

  // ── Tab readiness ──────────────────────────────────────────────────────────

  async waitForStorageTab(): Promise<void> {
    await this.page.waitForLoadState("networkidle").catch(() => null);
  }

  /**
   * Get disk size text from the page.
   * Returns first "NNN GB" pattern found, or empty string.
   */
  async getDiskInfoText(): Promise<string> {
    const body = await this.page.locator("body").innerText().catch(() => "");
    const gbMatch = body.match(/\d+\s*GB/i);
    return gbMatch ? gbMatch[0] : "";
  }

  /**
   * Checks if Storage tab has loaded real content.
   * Looks for confirmed vlang strings.
   */
  async hasStorageContent(): Promise<boolean> {
    const body = await this.page.locator("body").innerText().catch(() => "");
    return /Drive:|Primary|HDD|Storage:|GB|disk/i.test(body);
  }
}
