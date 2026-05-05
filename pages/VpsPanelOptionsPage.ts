import { type Page, type Locator } from "@playwright/test";

/**
 * VpsPanelOptionsPage — Options tab on /server/{UUID}
 * VirtFusion v4.x server settings, VNC/console access.
 *
 * ALL strings confirmed from :vlang on live server page (May 2026):
 *   vlang[8]   = "Server Name"
 *   vlang[9]   = "Settings"
 *   vlang[10]  = "Save"
 *   vlang[102] = "Reset Password"
 *   vlang[103] = "User"
 *   vlang[104] = "After resetting the password, the new password will sent to your account email address. Are you sure you want to continue?"
 *   vlang[105] = "Reset"
 *   vlang[106] = "Protect Server"
 *   vlang[107] = "Enabling protection prevents this server from being rebuilt accidentally."
 *   vlang[108] = "Are you sure you want to protect this server?"
 *   vlang[109] = "Protect"
 *   vlang[141] = "Name"
 *   vlang[144] = "Hostname"                        ← exact field label
 *   vlang[145] = "optional"
 *   vlang[147] = "Timezone"
 *   vlang[168] = "Virtual Network Computing (VNC)"  ← exact VNC section title
 *   vlang[169] = "Enable/disable VNC."
 *   vlang[182] = "CD/DVD"
 *   vlang[183] = "VNC"                             ← tab/button label
 *   vlang[184] = "Unprotect"
 *   vlang[185] = "Protect"
 *   vlang[214] = "Virtual Network Computing (VNC) allows you to connect to the server..."
 *   vlang[215] = "A VNC session is currently Active"
 *   vlang[338] = "Settings updated successfully."
 *   vlang[340] = "The hostname will be updated on the system but will not be applied to the server until it is rebuilt."
 *   vlang[353] = "Settings"
 *   vlang[354] = "Boot Type"
 *   vlang[355] = "BIOS (Legacy Mode)"
 *   vlang[356] = "UEFI"
 *   vlang[376] = "Rescue"
 *
 * IMPORTANT: VirtFusion does NOT have "Delete Server" on the Options tab.
 * Server deletion is available from the /servers list page only.
 */
export class VpsPanelOptionsPage {
  constructor(private page: Page) {}

  // ── Server Name / Hostname ─────────────────────────────────────────────────

  /** "Server Name" label (vlang 8) */
  get serverNameLabel(): Locator {
    return this.page.locator('text="Server Name"').first();
  }

  /**
   * Hostname input field.
   * Label: "Hostname" (vlang 144), described as "optional" (vlang 145).
   */
  get hostnameInput(): Locator {
    return this.page.locator(
      'input[name*="hostname"], input[name*="name"], input[placeholder*="hostname" i]'
    ).first();
  }

  /** "Hostname" label text (vlang 144) */
  get hostnameLabel(): Locator {
    return this.page.locator('text="Hostname"').first();
  }

  /** Save button (vlang 10: "Save") */
  get saveButton(): Locator {
    return this.page.locator('button:has-text("Save")').first();
  }

  /** "Settings updated successfully." toast (vlang 338) */
  get settingsUpdatedToast(): Locator {
    return this.page.locator(':has-text("Settings updated successfully.")').first();
  }

  // ── Boot Type Settings ─────────────────────────────────────────────────────

  /** "Boot Type" section (vlang 354) */
  get bootTypeLabel(): Locator {
    return this.page.locator('text="Boot Type"').first();
  }

  /** "BIOS (Legacy Mode)" option (vlang 355) */
  get biosOption(): Locator {
    return this.page.locator('text="BIOS (Legacy Mode)"').first();
  }

  /** "UEFI" option (vlang 356) */
  get uefiOption(): Locator {
    return this.page.locator('text="UEFI"').first();
  }

  // ── VNC ───────────────────────────────────────────────────────────────────

  /**
   * "Virtual Network Computing (VNC)" section title (vlang 168).
   * Exact text confirmed from live :vlang prop.
   */
  get vncSectionTitle(): Locator {
    return this.page.locator('text="Virtual Network Computing (VNC)"').first();
  }

  /**
   * VNC button/link — "VNC" (vlang 183).
   * This is the compact label used in buttons/tabs.
   */
  get vncButton(): Locator {
    return this.page.locator(
      'button:has-text("VNC"), a:has-text("VNC")'
    ).first();
  }

  /**
   * "A VNC session is currently Active" (vlang 215).
   * Shown when VNC is enabled and a session exists.
   */
  get vncActiveMessage(): Locator {
    return this.page.locator(':has-text("A VNC session is currently Active")').first();
  }

  // ── Reset Password ─────────────────────────────────────────────────────────

  /**
   * "Reset Password" button (vlang 102).
   * Clicking shows a confirmation modal — safe to test (cancel after).
   */
  get resetPasswordButton(): Locator {
    return this.page.locator('button:has-text("Reset Password")').first();
  }

  /**
   * Reset password modal confirmation text (vlang 104):
   * "After resetting the password, the new password will sent to your account email address.
   *  Are you sure you want to continue?"
   */
  get resetPasswordModalText(): Locator {
    return this.page.locator(
      ':has-text("After resetting the password, the new password will sent")'
    ).first();
  }

  /** "Reset" confirm button in reset password modal (vlang 105) */
  get resetConfirmButton(): Locator {
    return this.page.locator('button:has-text("Reset")').first();
  }

  // ── Server Protection ──────────────────────────────────────────────────────

  /** "Protect Server" button (vlang 106) or "Protect" (vlang 109 / 185) */
  get protectServerButton(): Locator {
    return this.page.locator(
      'button:has-text("Protect Server"), button:has-text("Protect")'
    ).first();
  }

  /** "Unprotect" button (vlang 184) */
  get unprotectButton(): Locator {
    return this.page.locator('button:has-text("Unprotect")').first();
  }

  // ── CD/DVD & Rescue ────────────────────────────────────────────────────────

  /** "CD/DVD" button/tab (vlang 182) */
  get cdDvdButton(): Locator {
    return this.page.locator('button:has-text("CD/DVD"), a:has-text("CD/DVD")').first();
  }

  /** "Rescue" button (vlang 376) */
  get rescueButton(): Locator {
    return this.page.locator('button:has-text("Rescue"), a:has-text("Rescue")').first();
  }

  // ── Cancel ────────────────────────────────────────────────────────────────

  get cancelButton(): Locator {
    return this.page.locator('button:has-text("Cancel")').first();
  }

  // ── Tab readiness ──────────────────────────────────────────────────────────

  async waitForOptionsTab(): Promise<void> {
    await this.page.waitForTimeout(800);
    await this.page.waitForLoadState("networkidle").catch(() => null);
  }

  /**
   * Checks if Options tab content is loaded.
   * Looks for confirmed vlang strings.
   */
  async hasOptionsContent(): Promise<boolean> {
    const body = await this.page.locator("body").innerText().catch(() => "");
    return /Virtual Network Computing|VNC|Hostname|Reset Password|Boot Type|Protect/i.test(body);
  }
}
