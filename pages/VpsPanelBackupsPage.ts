import { type Page, type Locator } from "@playwright/test";

/**
 * VpsPanelBackupsPage — Backups tab on /server/{UUID}
 * VirtFusion v4.x backup management.
 *
 * ALL strings confirmed from :vlang on live server page (May 2026):
 *   vlang[1]  = "Delete Backup"
 *   vlang[2]  = "Are you sure you want to delete this backup?"
 *   vlang[3]  = "Cancel"
 *   vlang[4]  = "Delete"
 *   vlang[5]  = "Restore from Backup"
 *   vlang[6]  = "Are you sure you want to restore the server using this backup?"
 *   vlang[7]  = "Restore"
 *   vlang[48] = "Backup"
 *   vlang[49] = "Backups are copies of the servers primary disk..."
 *   vlang[50] = "There are"
 *   vlang[51] = "slots for backups."
 *   vlang[59] = "Create Backup Now"         ← exact button text
 *   vlang[60] = "Schedule"
 *   vlang[61] = "Created"
 *   vlang[62] = "Size"
 *   vlang[63] = "Status"
 *   vlang[64] = "Available"
 *   vlang[65] = "Restoring"
 *   vlang[66] = "Creating"
 */
export class VpsPanelBackupsPage {
  constructor(private page: Page) {}

  // ── Tab heading ────────────────────────────────────────────────────────────

  /** "Backup" section heading (vlang 48) */
  get backupHeading(): Locator {
    return this.page.locator('text="Backup"').first();
  }

  /** Description text confirming backup tab loaded (vlang 49) */
  get backupDescription(): Locator {
    return this.page.locator(
      ':has-text("Backups are copies of the servers primary disk")'
    ).first();
  }

  /** Backup slot info (vlang 50-51: "There are X slots for backups.") */
  get backupSlotInfo(): Locator {
    return this.page.locator(':has-text("slots for backups")').first();
  }

  // ── Backup List ────────────────────────────────────────────────────────────

  /** Table/list column: "Status" (vlang 63) */
  get statusColumn(): Locator {
    return this.page.locator('text="Status"').first();
  }

  /** Table/list column: "Size" (vlang 62) */
  get sizeColumn(): Locator {
    return this.page.locator('text="Size"').first();
  }

  /** Table/list column: "Created" (vlang 61) */
  get createdColumn(): Locator {
    return this.page.locator('text="Created"').first();
  }

  /** "Available" status text on a backup item (vlang 64) */
  get availableStatus(): Locator {
    return this.page.locator('text="Available"').first();
  }

  /**
   * All backup list items (table rows).
   * VirtFusion renders backups client-side — multiple selectors tried in order.
   */
  get backupItems(): Locator {
    return this.page.locator(
      '[class*="backup-item"], [class*="backup-row"], tbody tr, [class*="backup-list"] li, [class*="backup-list-item"]'
    );
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * "Create Backup Now" button (vlang 59) — exact text confirmed from live page.
   * Previously this was "Create Backup" / "Take Snapshot" — now corrected.
   */
  get createBackupButton(): Locator {
    return this.page.locator('button:has-text("Create Backup Now")').first();
  }

  /** "Schedule" button/section (vlang 60) */
  get scheduleButton(): Locator {
    return this.page.locator('button:has-text("Schedule"), text="Schedule"').first();
  }

  /** Restore button on a backup item (vlang 7) */
  get restoreButton(): Locator {
    return this.page.locator('button:has-text("Restore")').first();
  }

  /** Delete backup button (vlang 4) */
  get deleteBackupButton(): Locator {
    return this.page.locator('button:has-text("Delete")').first();
  }

  // ── Confirm Modals ─────────────────────────────────────────────────────────

  /**
   * Delete backup confirmation text (vlang 2):
   * "Are you sure you want to delete this backup?"
   */
  get deleteBackupModalText(): Locator {
    return this.page.locator(
      ':has-text("Are you sure you want to delete this backup?")'
    ).first();
  }

  /**
   * Restore confirmation text (vlang 6):
   * "Are you sure you want to restore the server using this backup?"
   */
  get restoreBackupModalText(): Locator {
    return this.page.locator(
      ':has-text("Are you sure you want to restore the server using this backup?")'
    ).first();
  }

  get cancelButton(): Locator {
    return this.page.locator('button:has-text("Cancel")').first();
  }

  // ── Tab readiness ──────────────────────────────────────────────────────────

  async waitForBackupsTab(): Promise<void> {
    await this.page.waitForTimeout(800);
    await this.page.waitForLoadState("networkidle").catch(() => null);
  }

  /** Whether the "Create Backup Now" button is visible */
  async isCreateBackupAvailable(): Promise<boolean> {
    return this.createBackupButton.isVisible().catch(() => false);
  }

  /**
   * Checks if backup tab has loaded real content.
   * Looks for slot info or any backup-related text.
   */
  async hasBackupContent(): Promise<boolean> {
    const body = await this.page.locator("body").innerText().catch(() => "");
    return /backup|Backup|slots for backups/i.test(body);
  }
}
