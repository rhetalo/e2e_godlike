import { type Page, type Locator } from "@playwright/test";
import { PANEL_URL } from "../utils/auth";

/**
 * VpsPanelDashboardPage — https://vf-panel.godlike.host/dashboard
 * VirtFusion v4.x main dashboard after login.
 *
 * Contains:
 *   - Navigation sidebar/header with Servers, Dashboard links
 *   - Server cards/list (can also go to /servers for full list)
 *   - User account info
 *
 * Confirmed from vlang JS chunks: navigation links "Dashboard", "Servers", "Logout"
 */
export class VpsPanelDashboardPage {
  static readonly url = `${PANEL_URL}/dashboard`;
  static readonly serversUrl = `${PANEL_URL}/servers`;

  constructor(private page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto(VpsPanelDashboardPage.url, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await this.page.waitForLoadState("networkidle").catch(() => null);
  }

  async gotoServers(): Promise<void> {
    await this.page.goto(VpsPanelDashboardPage.serversUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await this.page.waitForLoadState("networkidle").catch(() => null);
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  get navServersLink(): Locator {
    return this.page.locator('a:has-text("Servers")').first();
  }

  get navDashboardLink(): Locator {
    return this.page.locator('a:has-text("Dashboard")').first();
  }

  get navLogoutLink(): Locator {
    return this.page.locator('a:has-text("Logout")').first();
  }

  /** Any navigation/sidebar container */
  get navContainer(): Locator {
    return this.page.locator('nav, [class*="sidebar"], [class*="navbar"], [class*="header"]').first();
  }

  // ── Server Cards ──────────────────────────────────────────────────────────

  /**
   * Server cards on dashboard — VirtFusion renders them as <client-servers>
   * or as individual card elements. Try multiple patterns.
   */
  get serverCards(): Locator {
    return this.page.locator(
      '[class*="server-card"], [class*="vm-card"], [class*="card"], client-servers'
    );
  }

  /** "Manage" button/link on any server card */
  get manageButtons(): Locator {
    return this.page.locator('button:has-text("Manage"), a:has-text("Manage")');
  }

  /** "Servers" link in the main content or nav that leads to /servers list */
  get serversPageLink(): Locator {
    return this.page.locator(`a[href*="/servers"]`).first();
  }

  // ── User Info ─────────────────────────────────────────────────────────────

  /** User name / email shown in header or sidebar */
  get userInfo(): Locator {
    return this.page.locator(
      '[class*="user"], [class*="account"], [class*="profile"]'
    ).first();
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  /** Click "Servers" in nav and wait for /servers page */
  async navigateToServers(): Promise<void> {
    await this.navServersLink.click();
    await this.page.waitForURL(/\/servers/, {
      timeout: 15_000,
      waitUntil: "domcontentloaded",
    });
    await this.page.waitForLoadState("networkidle").catch(() => null);
  }

  /** Click first Manage button and wait for server detail page */
  async openFirstServer(): Promise<void> {
    await this.manageButtons.first().click();
    await this.page.waitForURL(/\/server\//, {
      timeout: 15_000,
      waitUntil: "domcontentloaded",
    });
    await this.page.waitForLoadState("networkidle").catch(() => null);
  }
}
