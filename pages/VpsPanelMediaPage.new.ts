import { type Page, type Locator } from "@playwright/test";
import { PANEL_URL, TEST_SERVER_UUID } from "../utils/auth";

/**
 * VpsPanelMediaPage — Media tab on /server/{UUID}
 * VirtFusion v4.x — Boot Order control.
 *
 * ── WHAT IS ACTUALLY ON THE MEDIA TAB (confirmed May 2026) ──────────────────
 *   1. Power management buttons (same Boot/Shutdown/PowerOff/Restart as Overview)
 *   2. Activity table — history of server actions (Poweroff, Boot, etc.)
 *   3. Boot Order section — switch between HDD and CD/DVD first-boot device
 *
 * NOTE: There is NO OS template selection on this tab.
 *       The old POM (OS templates / Rebuild / Rescue) was based on incorrect assumptions.
 *
 * ── CONFIRMED SELECTORS (from live DevTools, May 2026) ──────────────────────
 *
 * Boot Order heading:
 *   <h2 class="mb-4">Boot Order</h2>
 *
 * HDD radio tile:
 *   <div class="radio-tile">
 *     <label class="radio-tile-label">HDD</label>
 *   </div>
 *   <input class="radio-button" type="radio" value="1">
 *
 * CD/DVD radio tile:
 *   <div class="radio-tile">
 *     <label class="radio-tile-label">CD/DVD</label>
 *   </div>
 *   <input class="radio-button" type="radio" value="2">
 *
 * Apply button:
 *   <button id="server-boot-order-button" class="mt-4 btn btn-primary ...">Apply</button>
 *
 * Activity table:
 *   <table class="table table-normal mb-0">
 *     <thead><tr><th>Task</th><th>Requested</th><th>Duration</th><th>Progress</th></tr></thead>
 *     <tbody><tr><td>Poweroff</td>...<span class="badge badge-active">Complete</span></tr></tbody>
 *   </table>
 *
 * ⚠️  Do NOT click the Apply button in automated tests — it changes the boot device.
 *     Radio tile clicks are safe (selection only; no side-effect until Apply is clicked).
 */
export class VpsPanelMediaPage {
  readonly serverUrl: string;

  constructor(
    private page: Page,
    uuid: string = TEST_SERVER_UUID,
  ) {
    this.serverUrl = `${PANEL_URL}/server/${uuid}`;
  }

  // ── Boot Order Section ────────────────────────────────────────────────────

  /** "Boot Order" section heading — confirmed: <h2 class="mb-4">Boot Order</h2> */
  get bootOrderHeading(): Locator {
    return this.page.locator("h2.mb-4").filter({ hasText: "Boot Order" }).first();
  }

  /**
   * HDD radio tile container.
   * Confirmed HTML:
   *   <div class="radio-tile">...<label class="radio-tile-label">HDD</label></div>
   */
  get hddTile(): Locator {
    return this.page
      .locator(".radio-tile")
      .filter({ has: this.page.locator('.radio-tile-label:has-text("HDD")') })
      .first();
  }

  /**
   * CD/DVD radio tile container.
   * Confirmed HTML:
   *   <div class="radio-tile">...<label class="radio-tile-label">CD/DVD</label></div>
   */
  get cdDvdTile(): Locator {
    return this.page
      .locator(".radio-tile")
      .filter({ has: this.page.locator('.radio-tile-label:has-text("CD/DVD")') })
      .first();
  }

  /** HDD radio input — value="1" */
  get hddRadio(): Locator {
    return this.page.locator('input.radio-button[type="radio"][value="1"]').first();
  }

  /** CD/DVD radio input — value="2" */
  get cdDvdRadio(): Locator {
    return this.page.locator('input.radio-button[type="radio"][value="2"]').first();
  }

  /** All radio buttons in Boot Order */
  get bootOrderRadios(): Locator {
    return this.page.locator("input.radio-button[type=\"radio\"]");
  }

  /**
   * Apply button — confirmed: button#server-boot-order-button
   * ⚠️  Do NOT click in automated tests — actually changes boot order.
   */
  get applyButton(): Locator {
    return this.page.locator("button#server-boot-order-button").first();
  }

  // ── Activity Table ────────────────────────────────────────────────────────
  //
  // Confirmed HTML (from DevTools snapshot):
  //   <table class="table table-normal mb-0">
  //     <thead><tr><th>Task</th><th>Requested</th><th>Duration</th><th>Progress</th></tr></thead>
  //     <tbody>
  //       <tr><td>Poweroff</td>...<span class="badge badge-active w-100">Complete</span></tr>
  //       <tr><td>Boot</td>...</tr>
  //     </tbody>
  //   </table>

  get activityTable(): Locator {
    return this.page.locator("table.table.table-normal").first();
  }

  get activityTableHead(): Locator {
    return this.page.locator("table.table.table-normal thead").first();
  }

  /** Visible activity rows (excludes debug rows with id="debugNNNN") */
  get activityRows(): Locator {
    return this.page.locator("table.table.table-normal tbody tr:not([id^='debug'])");
  }

  get completeBadges(): Locator {
    return this.page.locator("span.badge.badge-active");
  }

  /** Returns task name strings from first column of activity table */
  async getActivityTaskNames(): Promise<string[]> {
    const count = await this.activityRows.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = (
        await this.activityRows
          .nth(i)
          .locator("td")
          .first()
          .innerText()
          .catch(() => "")
      ).trim();
      if (text) names.push(text);
    }
    return names;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Returns true if Boot Order section (heading + at least one radio tile) is visible.
   */
  async hasBootOrderSection(): Promise<boolean> {
    const heading = await this.bootOrderHeading.isVisible().catch(() => false);
    const hdd = await this.hddTile.isVisible().catch(() => false);
    return heading && hdd;
  }

  /**
   * Returns the currently selected boot device by checking which radio is checked.
   * Returns "HDD", "CD/DVD", or "unknown".
   */
  async getSelectedBootDevice(): Promise<"HDD" | "CD/DVD" | "unknown"> {
    const hddChecked = await this.hddRadio.isChecked().catch(() => false);
    if (hddChecked) return "HDD";
    const cdChecked = await this.cdDvdRadio.isChecked().catch(() => false);
    if (cdChecked) return "CD/DVD";
    return "unknown";
  }
}
