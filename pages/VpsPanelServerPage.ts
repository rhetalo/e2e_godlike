import { type Page, type Locator } from "@playwright/test";
import { PANEL_URL, TEST_SERVER_UUID } from "../utils/auth";

/**
 * VpsPanelServerPage — https://vf-panel.godlike.host/server/{UUID}
 * VirtFusion v4.x server detail management page.
 *
 * Structure:
 *   - Server name + status badge
 *   - Power action buttons: Boot, Shutdown, Power Off, Restart
 *   - Tab navigation: Overview | Media | Options | Network | Storage | Backups | Sharing
 *   - Tab content (changes per active tab)
 *
 * ALL tab names confirmed from :vlang attribute on <client-server-manage> (vlang keys 71–77).
 * ALL power button data-actions confirmed from live dash-app.js.
 */
export class VpsPanelServerPage {
  readonly url: string;

  constructor(private page: Page, uuid: string = TEST_SERVER_UUID) {
    this.url = `${PANEL_URL}/server/${uuid}`;
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await this.page.waitForLoadState("networkidle").catch(() => null);
  }

  // ── Server Identity ───────────────────────────────────────────────────────

  /** Server name heading */
  get serverName(): Locator {
    return this.page.locator("h1, h2, h3, [class*='server-name'], [class*='vm-name']").first();
  }

  /** Status badge (Running / Stopped / Paused) */
  get statusBadge(): Locator {
    return this.page.locator(
      '[class*="status"], [class*="badge"], [class*="state"], [class*="label"]'
    ).first();
  }

  /** Check if status text contains the expected state */
  async getStatusText(): Promise<string> {
    return (await this.statusBadge.innerText().catch(() => "")).trim();
  }

  // ── Power Controls ────────────────────────────────────────────────────────

  /**
   * Boot / Start button
   * Confirmed: data-action="boot_server" or text "Boot"
   */
  get bootButton(): Locator {
    return this.page.locator(
      'button[data-action="boot_server"], button:has-text("Boot")'
    ).first();
  }

  /**
   * Shutdown button (graceful shutdown)
   * Confirmed: data-action="shutdown_server" or text "Shutdown" (vlang[123])
   */
  get shutdownButton(): Locator {
    return this.page.locator(
      'button[data-action="shutdown_server"], button:has-text("Shutdown")'
    ).first();
  }

  /**
   * Power Off button (hard power off)
   * Confirmed: data-action="poweroff_server" or text "Power Off" (vlang[120])
   */
  get powerOffButton(): Locator {
    return this.page.locator(
      'button[data-action="poweroff_server"], button:has-text("Power Off")'
    ).first();
  }

  /**
   * Restart button
   * Confirmed: data-action="restart_server" or text "Restart" (vlang[94])
   */
  get restartButton(): Locator {
    return this.page.locator(
      'button[data-action="restart_server"], button:has-text("Restart")'
    ).first();
  }

  /** All power action buttons as a group */
  get allPowerButtons(): Locator {
    return this.page.locator(
      'button[data-action="boot_server"], button[data-action="shutdown_server"], button[data-action="poweroff_server"], button[data-action="restart_server"]'
    );
  }

  // ── Tab Navigation ────────────────────────────────────────────────────────

  /** Tab by label text — confirmed from vlang props */
  tab(label: "Overview" | "Media" | "Options" | "Network" | "Storage" | "Backups" | "Sharing"): Locator {
    return this.page
      .locator(`button:has-text("${label}"), a:has-text("${label}"), [role="tab"]:has-text("${label}")`)
      .first();
  }

  /** Currently active tab indicator */
  get activeTab(): Locator {
    return this.page.locator(
      '[class*="active"][class*="tab"], [class*="tab"][class*="active"], [class*="nav-link"][class*="active"], [aria-selected="true"]'
    ).first();
  }

  /** Click a tab by label and wait for content to settle */
  async clickTab(label: "Overview" | "Media" | "Options" | "Network" | "Storage" | "Backups" | "Sharing"): Promise<void> {
    await this.tab(label).click();
    await this.page.waitForTimeout(800);
    await this.page.waitForLoadState("networkidle").catch(() => null);
  }

  // ── Overview tab content ──────────────────────────────────────────────────

  /** IP address display on Overview */
  get ipAddress(): Locator {
    return this.page.locator('[class*="ip"], [class*="network"]').first();
  }

  /** OS info shown on Overview */
  get osInfo(): Locator {
    return this.page.locator('[class*="os"], [class*="template"]').first();
  }

  /** Server specs block (CPU, RAM, disk info) */
  get serverSpecs(): Locator {
    return this.page.locator('[class*="spec"], [class*="resource"], [class*="info"]').first();
  }

  // ── Confirmation Modal (shared across power actions) ──────────────────────

  /**
   * Confirmation modal/dialog — appears after clicking power buttons
   * that require confirmation.
   */
  get confirmModal(): Locator {
    return this.page.locator('[class*="modal"], [role="dialog"]').first();
  }

  get confirmCancelButton(): Locator {
    return this.page.locator('button:has-text("Cancel")').first();
  }

  get confirmProceedButton(): Locator {
    return this.page.locator('button:has-text("Continue"), button:has-text("Confirm"), button:has-text("Yes")').first();
  }

  /** Wait for and then close a confirmation modal via Cancel */
  async cancelConfirmModal(timeoutMs = 5_000): Promise<boolean> {
    try {
      await this.confirmModal.waitFor({ state: "visible", timeout: timeoutMs });
      await this.confirmCancelButton.click();
      await this.confirmModal.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => null);
      return true;
    } catch {
      return false;
    }
  }

  // ── Alert / Toast ─────────────────────────────────────────────────────────

  get successAlert(): Locator {
    return this.page.locator('[class*="alert-success"], [class*="toast-success"]').first();
  }

  get errorAlert(): Locator {
    return this.page.locator('[class*="alert-danger"], [class*="alert-error"], [class*="toast-error"]').first();
  }

  get anyAlert(): Locator {
    return this.page.locator('[class*="alert"], [class*="toast"], [role="alert"]').first();
  }
}
