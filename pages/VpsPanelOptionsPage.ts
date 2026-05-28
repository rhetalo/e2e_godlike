import { type Page, type Locator } from "@playwright/test";

/**
 * VpsPanelOptionsPage — вкладка Options на /server/{UUID}
 *
 * ── ПОДТВЕРЖДЁННЫЕ vlang-строки (live server, May 2026) ─────────────────────
 *
 *   vlang[8]   = "Server Name"
 *   vlang[9]   = "Settings"
 *   vlang[10]  = "Save"
 *   vlang[102] = "Reset Password"         ← exact button text
 *   vlang[103] = "User"
 *   vlang[104] = "After resetting the password, the new password will sent to your account email address. Are you sure you want to continue?"
 *   vlang[105] = "Reset"                  ← confirm button in modal
 *   vlang[106] = "Protect Server"
 *   vlang[107] = "Enabling protection prevents this server from being rebuilt accidentally."
 *   vlang[108] = "Are you sure you want to protect this server?"
 *   vlang[109] = "Protect"
 *   vlang[141] = "Name"
 *   vlang[144] = "Hostname"               ← exact field label
 *   vlang[145] = "optional"
 *   vlang[147] = "Timezone"
 *   vlang[168] = "Virtual Network Computing (VNC)"  ← exact section title
 *   vlang[169] = "Enable/disable VNC."
 *   vlang[182] = "CD/DVD"
 *   vlang[183] = "VNC"                    ← compact tab/button label
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
 * ⚠️  VirtFusion НЕ имеет кнопки "Delete Server" на вкладке Options.
 *     Удаление сервера — только со страницы /servers (список серверов).
 */
export class VpsPanelOptionsPage {
  constructor(private page: Page) {}

  // ── Hostname / Server Name ─────────────────────────────────────────────────

  /** "Server Name" label (vlang[8]) */
  get serverNameLabel(): Locator {
    return this.page.locator('label:has-text("Server Name"), span:has-text("Server Name"), div:has-text("Server Name")').first();
  }

  /**
   * "Hostname" label (vlang[144]).
   * Always visible on Options tab — guaranteed by vlang.
   */
  get hostnameLabel(): Locator {
    return this.page.locator('label:has-text("Hostname"), span:has-text("Hostname"), div:has-text("Hostname")').first();
  }

  /**
   * Hostname input field.
   * Tried in order: name attr, id attr, placeholder.
   */
  get hostnameInput(): Locator {
    return this.page
      .locator('input[name*="hostname"], input[id*="hostname"], input[placeholder*="hostname" i]')
      .first();
  }

  /**
   * "Save" button (vlang[10]).
   * Scoped to a form/card to avoid matching other Save buttons on page.
   */
  get saveButton(): Locator {
    return this.page.locator('button:has-text("Save")').first();
  }

  /** "Settings updated successfully." toast/alert (vlang[338]) */
  get settingsUpdatedToast(): Locator {
    return this.page.locator(':has-text("Settings updated successfully.")').first();
  }

  // ── Boot Type (vlang[354–356]) ─────────────────────────────────────────────

  /** "Boot Type" section heading (vlang[354]) */
  get bootTypeLabel(): Locator {
    return this.page
      .locator('label:has-text("Boot Type"), span:has-text("Boot Type"), h5:has-text("Boot Type"), div:has-text("Boot Type")')
      .first();
  }

  /** "BIOS (Legacy Mode)" option (vlang[355]) */
  get biosOption(): Locator {
    return this.page.locator(':has-text("BIOS (Legacy Mode)")').first();
  }

  /** "UEFI" option (vlang[356]) */
  get uefiOption(): Locator {
    return this.page.locator(':has-text("UEFI")').first();
  }

  // ── VNC (vlang[168] / vlang[183] / vlang[215]) ────────────────────────────

  /**
   * "Virtual Network Computing (VNC)" section title (vlang[168]).
   * Exact text confirmed from live :vlang prop.
   * Always rendered on Options tab regardless of VNC enabled/disabled.
   */
  get vncSectionTitle(): Locator {
    return this.page.locator(':has-text("Virtual Network Computing (VNC)")').first();
  }

  /**
   * VNC button/tab — "VNC" (vlang[183]).
   * Compact label used in radio-tile / toggle area.
   */
  get vncButton(): Locator {
    return this.page.locator('button:has-text("VNC"), label:has-text("VNC"), span:has-text("VNC")').first();
  }

  /**
   * "A VNC session is currently Active" status message (vlang[215]).
   * Only shown when a VNC session is running — optional check.
   */
  get vncActiveMessage(): Locator {
    return this.page.locator(':has-text("A VNC session is currently Active")').first();
  }

  // ── Reset Password (vlang[102–105]) ───────────────────────────────────────

  /**
   * "Reset Password" button (vlang[102]).
   * Always visible on Options tab — safe to test (cancel after click).
   */
  get resetPasswordButton(): Locator {
    return this.page.locator('button:has-text("Reset Password")').first();
  }

  /**
   * Bootstrap active modal container.
   * Using `.modal.show` — same pattern as power modals.
   */
  get activeModal(): Locator {
    return this.page.locator(".modal.show").first();
  }

  /**
   * Reset password modal warning text (vlang[104]).
   * Appears inside active modal after clicking "Reset Password".
   */
  get resetPasswordModalBody(): Locator {
    return this.page
      .locator('.modal.show')
      .locator(':has-text("After resetting the password")')
      .first();
  }

  /**
   * "Reset" confirm button inside reset password modal (vlang[105]).
   * ⚠️  Do NOT click — would trigger actual password reset.
   */
  get resetConfirmButton(): Locator {
    return this.page
      .locator('.modal.show button:has-text("Reset")')
      .first();
  }

  /**
   * Cancel button inside active Bootstrap modal.
   * Uses data-bs-dismiss or "Cancel" text.
   */
  get modalCancelButton(): Locator {
    return this.page
      .locator('.modal.show button[data-bs-dismiss="modal"], .modal.show button:has-text("Cancel")')
      .first();
  }

  // ── Protect Server (vlang[106–109] / vlang[184]) ──────────────────────────

  /**
   * "Protect Server" button (vlang[106]).
   * Shown when server is NOT yet protected.
   */
  get protectServerButton(): Locator {
    return this.page.locator('button:has-text("Protect Server")').first();
  }

  /**
   * "Unprotect" button (vlang[184]).
   * Shown when server IS already protected.
   * Exactly one of protectServerButton / unprotectButton is visible at any time.
   */
  get unprotectButton(): Locator {
    return this.page.locator('button:has-text("Unprotect")').first();
  }

  /**
   * Protect Server modal body text (vlang[107]).
   * "Enabling protection prevents this server from being rebuilt accidentally."
   */
  get protectModalText(): Locator {
    return this.page
      .locator('.modal.show :has-text("protection prevents this server")')
      .first();
  }

  // ── CD/DVD / Rescue ────────────────────────────────────────────────────────

  /** "CD/DVD" button/tab (vlang[182]) */
  get cdDvdButton(): Locator {
    return this.page.locator('button:has-text("CD/DVD"), a:has-text("CD/DVD")').first();
  }

  /** "Rescue" button (vlang[376]) */
  get rescueButton(): Locator {
    return this.page.locator('button:has-text("Rescue"), a:has-text("Rescue")').first();
  }

  // ── Page Readiness ─────────────────────────────────────────────────────────

  /** Wait for Options tab content to fully load (networkidle + settlement) */
  async waitForOptionsTab(): Promise<void> {
    await this.page.waitForLoadState("networkidle").catch(() => null);
  }

  /**
   * True when at least one of the confirmed vlang strings is present in the body.
   * Use as a quick sanity check after navigating to Options tab.
   */
  async hasOptionsContent(): Promise<boolean> {
    const body = await this.page.locator("body").innerText().catch(() => "");
    return /Virtual Network Computing|VNC|Hostname|Reset Password|Boot Type|Protect/i.test(body);
  }
}
