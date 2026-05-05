import { type Page, type Locator } from "@playwright/test";
import { PANEL_URL } from "../utils/auth";

/**
 * VpsPanelServersListPage — /servers
 *
 * Vue component: <client-servers>
 *
 * Confirmed live facts:
 *  - "Manage" button navigates to server detail (SPA client-side routing via Turbo/Vue Router)
 *  - "Delete" button opens a modal:
 *      title:  "Delete Server"
 *      body:   "Are you sure you want to delete this server?"
 *      cancel: "Cancel"
 *      success toast: "Server deleted successfully."
 *  - Direct URL /server/{id} redirects to /dashboard — must use "Manage" click
 */
export class VpsPanelServersListPage {
  static readonly url = `${PANEL_URL}/servers`;

  constructor(private readonly page: Page) {}

  // ── Server rows ──────────────────────────────────────────────────────────

  /**
   * All rows/cards in the servers list.
   * VirtFusion renders each VPS as a row or card inside <client-servers>.
   * We identify rows by the presence of both "Manage" and "Delete" actions.
   */
  get serverRows(): Locator {
    return this.page.locator(
      '[class*="server-row"], [class*="server-item"], [class*="server-card"], ' +
      'tr:has(button:has-text("Manage")), div:has(button:has-text("Manage")), ' +
      'li:has(button:has-text("Manage")), div:has(a:has-text("Manage"))'
    );
  }

  /** "Manage" button/link on a specific row (0-indexed) */
  manageButton(index: number): Locator {
    return this.serverRows
      .nth(index)
      .locator('button:has-text("Manage"), a:has-text("Manage")')
      .first();
  }

  /** "Delete" button on a specific row (0-indexed) */
  deleteButton(index: number): Locator {
    return this.serverRows
      .nth(index)
      .locator('button:has-text("Delete"), a:has-text("Delete")')
      .first();
  }

  // ── Delete modal ─────────────────────────────────────────────────────────

  /** The delete confirmation modal (appears after clicking "Delete" on a row) */
  get deleteModal(): Locator {
    return this.page.locator('[class*="modal"], [role="dialog"]').first();
  }

  /** Modal title — confirmed text: "Delete Server" */
  get deleteModalTitle(): Locator {
    return this.page.locator('[class*="modal"] :has-text("Delete Server"), [role="dialog"] :has-text("Delete Server")').first();
  }

  /** Modal body — confirmed text: "Are you sure you want to delete this server?" */
  get deleteModalBody(): Locator {
    return this.page.locator(':has-text("Are you sure you want to delete this server?")').first();
  }

  /** Cancel button inside modal — confirmed text: "Cancel" */
  get deleteModalCancelButton(): Locator {
    return this.page.locator(
      '[class*="modal"] button:has-text("Cancel"), [role="dialog"] button:has-text("Cancel")'
    ).first();
  }

  /** Confirm/Delete button inside modal */
  get deleteModalConfirmButton(): Locator {
    return this.page.locator(
      '[class*="modal"] button:has-text("Delete"), [role="dialog"] button:has-text("Delete"), ' +
      '[class*="modal"] button:has-text("Confirm"), [role="dialog"] button:has-text("Confirm")'
    ).first();
  }

  // ── Toast notifications ──────────────────────────────────────────────────

  /** Success toast — confirmed text: "Server deleted successfully." */
  get successToast(): Locator {
    return this.page.locator(':has-text("Server deleted successfully")').first();
  }

  /** Error toast — confirmed text: "Server could not be deleted." */
  get errorToast(): Locator {
    return this.page.locator(':has-text("Server could not be deleted")').first();
  }

  // ── Page content ─────────────────────────────────────────────────────────

  /** Wait indicator while Vue is still loading servers */
  get loadingIndicator(): Locator {
    return this.page.locator('[class*="loading"], [class*="spinner"]').first();
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto(VpsPanelServersListPage.url, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    // Wait for Vue <client-servers> to render
    await this.page.waitForLoadState("networkidle").catch(() => null);
  }

  /** Returns the number of server rows visible */
  async getServerCount(): Promise<number> {
    try {
      // Give Vue up to 10s to populate the list
      await this.serverRows.first().waitFor({ state: "visible", timeout: 10_000 });
      return await this.serverRows.count();
    } catch {
      return 0;
    }
  }

  /**
   * Click "Manage" on the specified server row to open server detail.
   * VirtFusion uses SPA client-side routing — Turbo/Vue Router will navigate
   * without a full page load.
   */
  async openServerDetail(index: number): Promise<void> {
    const btn = this.manageButton(index);
    await btn.waitFor({ state: "visible", timeout: 10_000 });
    await btn.click();
    // Wait for SPA navigation — either URL changes or networkidle
    await this.page.waitForTimeout(1_500);
    await this.page.waitForLoadState("networkidle").catch(() => null);
  }

  /**
   * Click "Delete" on the specified server row to open the delete modal.
   */
  async clickDelete(index: number): Promise<void> {
    const btn = this.deleteButton(index);
    await btn.waitFor({ state: "visible", timeout: 10_000 });
    await btn.click();
    // Wait for modal to appear
    await this.deleteModal.waitFor({ state: "visible", timeout: 10_000 });
  }
}
