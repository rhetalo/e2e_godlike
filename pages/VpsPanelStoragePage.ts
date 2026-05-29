import { type Page, type Locator } from "@playwright/test";

/**
 * VpsPanelStoragePage — Storage tab on /server/{UUID}
 * VirtFusion v4.x disk / storage information.
 *
 * ── CONFIRMED HTML (from live DevTools, May 2026) ───────────────────────────
 *
 * STORAGE TAB PANE:
 *   <div id="pills-storage" role="tabpanel">
 *
 * DISK CARD (inside the tab pane):
 *   <h4>Drive: A</h4>                          ← drive identifier (letter varies)
 *   <span class="badge badge-warning">Primary</span>
 *   <span class="mt-3" style="font-size:1rem;">30 GB</span>
 *
 * NOTES:
 *   • The tab is informational only — no actionable controls.
 *   • Contains the standard Activity table (shared across all tabs).
 *   • Drive letter (A, B, …) varies by server; selectors use :has-text.
 *   • All locators are scoped to #pills-storage to avoid matching
 *     nav-link text or other tabs' content.
 */
export class VpsPanelStoragePage {
  constructor(private page: Page) {}

  /** Storage tab pane — used to scope child locators */
  get tabPane(): Locator {
    return this.page.locator("#pills-storage");
  }

  /** Drive heading inside the disk card: <h4>Drive: A</h4> */
  get driveHeading(): Locator {
    return this.tabPane.locator("h4:has-text('Drive:')").first();
  }

  /** Primary badge: <span class="badge badge-warning">Primary</span> */
  get primaryBadge(): Locator {
    return this.tabPane.locator(".badge:has-text('Primary')").first();
  }

  /** Disk size label: <span>30 GB</span> */
  get diskSizeLabel(): Locator {
    return this.tabPane.locator("span:has-text('GB')").first();
  }

  async waitForStorageTab(): Promise<void> {
    await this.page.waitForLoadState("networkidle").catch(() => null);
  }
}
