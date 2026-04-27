import { type Page, type Locator } from "@playwright/test";
import { PANEL_URL, TEST_SERVER_UUID } from "../utils/auth";

/**
 * ServerDetailPage — /server/{UUID}
 *
 * Vue component: <client-server-manage>
 *
 * URL format confirmed: /server/9c49ed96-56f4-41c8-bc5f-a8d44c21a486
 * Works fine in browser with session cookies.
 *
 * ALL strings below confirmed from :vlang props on the live server detail page.
 *
 * Tab names (vlang 71–77):
 *   "Overview", "Media", "Options", "Network", "Storage", "Backups", "Sharing"
 *
 * Server states (vlang 78–80):
 *   "Stopped", "Running", "Paused"
 */
export class ServerDetailPage {
  static readonly url = `${PANEL_URL}/server/${TEST_SERVER_UUID}`;

  constructor(private readonly page: Page) {}

  // ── Navigation ────────────────────────────────────────────────────────────

  /**
   * Navigate directly to the test server's detail page.
   * Works in browser with session cookies (Playwright handles this correctly).
   */
  async goto(): Promise<void> {
    await this.page.goto(ServerDetailPage.url, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await this.waitForLoad();
  }

  // ── Tab Navigation ────────────────────────────────────────────────────────
  // Tab names CONFIRMED from :vlang[71-77] on live page

  async clickTab(tabName: "Overview" | "Media" | "Options" | "Network" | "Storage" | "Backups" | "Sharing"): Promise<void> {
    const tab = this.page
      .locator(`button:has-text("${tabName}"), a:has-text("${tabName}"), [class*="nav-link"]:has-text("${tabName}")`)
      .first();
    await tab.waitFor({ state: "visible", timeout: 10_000 });
    await tab.click();
    await this.page.waitForTimeout(800);
  }

  /** Returns text of all visible tab-like navigation elements */
  async getVisibleTabNames(): Promise<string[]> {
    const tabs = this.page.locator(
      '[class*="nav-link"], [class*="nav-item"] a, [role="tab"], [class*="tab-btn"]'
    );
    const count = await tabs.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const txt = await tabs.nth(i).innerText().catch(() => "");
      if (txt.trim()) names.push(txt.trim());
    }
    return names;
  }

  // ── Server Status ──────────────────────────────────────────────────────────
  // States: "Stopped" (78), "Running" (79), "Paused" (80)

  get statusBadge(): Locator {
    return this.page.locator(
      '[class*="status-badge"], [class*="server-status"], [class*="state-badge"], [class*="badge"]'
    ).first();
  }

  async getStatus(): Promise<string> {
    return this.statusBadge.innerText().catch(() => "unknown");
  }

  // ── Power Controls ────────────────────────────────────────────────────────
  // Confirmed action names from live dash-app.js

  get restartButton(): Locator {
    // vlang[94]: "Restart Server" — but button text may be just "Restart"
    return this.page.locator(
      'button[data-action="restart_server"], button:has-text("Restart")'
    ).first();
  }

  get powerOffButton(): Locator {
    // vlang[120]: "Power Off Server"
    return this.page.locator(
      'button[data-action="poweroff_server"], button:has-text("Power Off")'
    ).first();
  }

  get shutdownButton(): Locator {
    // vlang[123]: "Shutdown Server"
    return this.page.locator(
      'button[data-action="shutdown_server"], button:has-text("Shutdown")'
    ).first();
  }

  get bootButton(): Locator {
    return this.page.locator(
      'button[data-action="boot_server"], button:has-text("Boot")'
    ).first();
  }

  // ── Media Tab — OS Install / Rebuild ─────────────────────────────────────
  // Confirmed from :vlang on live page

  /**
   * The main action button on the Media tab.
   * "Rebuild" (vlang[196]) — when server has an existing OS
   * "Install" (vlang[173]) — fresh install
   */
  get buildOrRebuildButton(): Locator {
    return this.page.locator(
      'button:has-text("Rebuild"), button:has-text("Install")'
    ).first();
  }

  /** OS template selection items */
  get templateOptions(): Locator {
    return this.page.locator(
      '[class*="template-option"], [class*="os-option"], [data-template-id], ' +
      '[class*="media-item"], [class*="distro"]'
    );
  }

  /** Select a template by partial OS name */
  async selectTemplate(osName: string): Promise<void> {
    const option = this.templateOptions
      .filter({ hasText: new RegExp(osName, "i") })
      .first();
    await option.waitFor({ state: "visible", timeout: 15_000 });
    await option.click();
    await this.page.waitForTimeout(400);
  }

  // ── Confirmation Modals ───────────────────────────────────────────────────

  get confirmModal(): Locator {
    return this.page.locator('[class*="modal"], [role="dialog"]').first();
  }

  /**
   * Confirm button in the rebuild modal.
   * vlang[119]: "Continue" (used after "Are you sure you want to rebuild this server?")
   */
  get rebuildConfirmButton(): Locator {
    return this.page.locator(
      'button:has-text("Continue"), button:has-text("Install Now")'
    ).first();
  }

  /**
   * Install confirm button.
   * vlang[130]: "Install Now" (used after "Are you sure you want to install X on this server?")
   */
  get installNowButton(): Locator {
    return this.page.locator('button:has-text("Install Now")').first();
  }

  /**
   * Cancel button in modals.
   * vlang[3]: "Cancel", vlang[140]: "Cancel Rebuild"
   */
  get cancelButton(): Locator {
    return this.page.locator(
      '[class*="modal"] button:has-text("Cancel"), [role="dialog"] button:has-text("Cancel")'
    ).first();
  }

  // ── Notifications ─────────────────────────────────────────────────────────

  get successAlert(): Locator {
    return this.page.locator(
      '[class*="alert-success"], [class*="toast-success"]'
    ).first();
  }

  get errorAlert(): Locator {
    return this.page.locator(
      '[class*="alert-danger"], [class*="alert-error"], [class*="toast-error"]'
    ).first();
  }

  // ── Readiness ─────────────────────────────────────────────────────────────

  /** Wait for the server detail page to fully render */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForLoadState("networkidle").catch(() => null);
    // "Loading Server Data..." (confirmed: vlang in chunk 108)
    const loading = this.page.locator(':has-text("Loading Server Data")');
    try {
      await loading.waitFor({ state: "hidden", timeout: 15_000 });
    } catch {
      // May not appear — that's fine
    }
  }

  /** Dump visible page text for debugging */
  async getPageText(): Promise<string> {
    return this.page.evaluate(() => document.body.innerText).catch(() => "");
  }
}
