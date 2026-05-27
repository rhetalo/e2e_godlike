import { type Page, type Locator, expect } from "@playwright/test";
import { PANEL_URL, TEST_SERVER_UUID } from "../utils/auth";

/**
 * VpsPanelMediaPage — Media tab on /server/{UUID}
 * VirtFusion v4.x — Boot Order control.
 *
 * ── WHAT IS ON THE MEDIA TAB (confirmed May 2026) ────────────────────────────
 *   1. Power management buttons (same Boot/Shutdown/PowerOff/Restart as Overview)
 *   2. Activity table — history of server actions
 *   3. Boot Order section — switch between HDD and CD/DVD first-boot device
 *
 * ── CONFIRMED SELECTORS ──────────────────────────────────────────────────────
 *
 * Boot Order heading:  h2.mb-4  text="Boot Order"
 *
 * Radio inputs (click these directly — NOT the tile wrappers):
 *   HDD:    input.radio-button[type="radio"][value="1"]
 *   CD/DVD: input.radio-button[type="radio"][value="2"]
 *
 * ⚠️  Radio inputs are visually HIDDEN (custom tile UI replaces them).
 *     .check() without force:true times out because element is not visible.
 *     Always use selectHDD() / selectCDDVD() which pass force:true.
 *     Do NOT call .check() directly on hddRadio / cdDvdRadio in tests.
 *
 * Apply button:  button#server-boot-order-button
 *
 * Activity table: table.table.table-normal
 *   Debug rows:   tr:has(td[id^='debug'])  — excluded from activityRows
 *   Complete:     span.badge.badge-active  text="Complete"
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

  /** "Boot Order" section heading */
  get bootOrderHeading(): Locator {
    return this.page.locator("h2.mb-4").filter({ hasText: "Boot Order" }).first();
  }

  /**
   * HDD radio input — value="1".
   * Visually hidden by custom tile UI — use selectHDD() not .check() directly.
   */
  get hddRadio(): Locator {
    return this.page.locator('input.radio-button[type="radio"][value="1"]').first();
  }

  /**
   * CD/DVD radio input — value="2".
   * Visually hidden by custom tile UI — use selectCDDVD() not .check() directly.
   */
  get cdDvdRadio(): Locator {
    return this.page.locator('input.radio-button[type="radio"][value="2"]').first();
  }

  /**
   * Select HDD as boot device.
   * Uses force:true because the radio input is visually hidden (custom tile UI).
   */
  async selectHDD(): Promise<void> {
    await this.hddRadio.check({ force: true });
    await expect(this.hddRadio).toBeChecked({ timeout: 5_000 });
  }

  /**
   * Select CD/DVD as boot device.
   * Uses force:true because the radio input is visually hidden (custom tile UI).
   */
  async selectCDDVD(): Promise<void> {
    await this.cdDvdRadio.check({ force: true });
    await expect(this.cdDvdRadio).toBeChecked({ timeout: 5_000 });
  }

  /** Apply button — button#server-boot-order-button */
  get applyButton(): Locator {
    return this.page.locator("button#server-boot-order-button").first();
  }

  // ── Activity Table ────────────────────────────────────────────────────────
  //
  // Debug rows have id="debugNNNN" on the inner <td>, NOT on the <tr>.
  // Use :has(td[id^='debug']) to identify and exclude them.

  get activityTable(): Locator {
    return this.page.locator("table.table.table-normal").first();
  }

  /**
   * Visible task rows — excludes hidden debug rows.
   * ⚠️ id="debugNNNN" is on the <td>, not the <tr>. Use :has() to filter.
   */
  get activityRows(): Locator {
    return this.page.locator(
      "table.table.table-normal tbody tr:not(:has(td[id^='debug']))",
    );
  }

  get completeBadges(): Locator {
    return this.page.locator("span.badge.badge-active");
  }

  /** Complete badge of the most recent activity row */
  get latestTaskCompleteBadge(): Locator {
    return this.activityRows.first().locator("span.badge.badge-active");
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Returns the currently selected boot device.
   * Returns "HDD", "CD/DVD", or "unknown".
   */
  async getSelectedBootDevice(): Promise<"HDD" | "CD/DVD" | "unknown"> {
    const hddChecked = await this.hddRadio.isChecked().catch(() => false);
    if (hddChecked) return "HDD";
    const cdChecked = await this.cdDvdRadio.isChecked().catch(() => false);
    if (cdChecked) return "CD/DVD";
    return "unknown";
  }

  /**
   * Returns the number of visible task rows in the activity table.
   */
  async getActivityRowCount(): Promise<number> {
    return this.activityRows.count();
  }

  /**
   * Waits for a new row to appear in the activity table (count > rowCountBefore).
   */
  async waitForNewRow(rowCountBefore: number, timeoutMs = 30_000): Promise<void> {
    await expect
      .poll(
        async () => this.activityRows.count(),
        { timeout: timeoutMs, message: "Waiting for new activity row" },
      )
      .toBeGreaterThan(rowCountBefore);
  }

  /**
   * Waits until the most recent task shows Complete badge (progress = 100%).
   */
  async waitForLatestTaskComplete(timeoutMs = 90_000): Promise<void> {
    await expect(this.latestTaskCompleteBadge).toBeVisible({ timeout: timeoutMs });
  }

  /**
   * Returns the task name from the most recent activity row.
   */
  async getLatestTaskName(): Promise<string> {
    return (
      await this.activityRows.first().locator("td").first().innerText().catch(() => "")
    ).trim();
  }
}
