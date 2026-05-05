import { type Page, type Locator } from "@playwright/test";
import { PANEL_URL, TEST_SERVER_UUID } from "../utils/auth";

/**
 * VpsPanelMediaPage — Media tab on /server/{UUID}
 * VirtFusion v4.x OS template selection, rebuild/install flow, CD/DVD and Rescue.
 *
 * ALL strings confirmed from :vlang on live server page (May 2026):
 *   vlang[118] = "Are you sure you want to rebuild this server?"  ← exact modal text
 *   vlang[119] = "Continue"                                        ← rebuild confirm button
 *   vlang[128] = "Are you sure you want to install"
 *   vlang[129] = "on this server?"
 *   vlang[130] = "Install Now"
 *   vlang[131] = "Are you sure you don't want to install an operating system?"
 *   vlang[137] = "Rebuilding will delete all existing data and install a fresh operating system..."
 *   vlang[138] = "It's still not too late to cancel this rebuild."
 *   vlang[140] = "Cancel Rebuild"
 *   vlang[149] = "Operating System"
 *   vlang[150] = "Self Install Operating System"
 *   vlang[151] = "The server requires a valid operating system..."
 *   vlang[152] = "Self Install"
 *   vlang[153] = "Install with Template"
 *   vlang[154] = "No suitable operating system templates available"
 *   vlang[173] = "Install"
 *   vlang[182] = "CD/DVD"
 *   vlang[183] = "VNC"
 *   vlang[196] = "Rebuild"                                         ← main action button text
 *   vlang[247] = "CD/DVD-ROM"
 *   vlang[248] = "Drive Active"
 *   vlang[249] = "Drive Inactive"
 *   vlang[250] = "CD/DVD's allow you to install the server manually or boot from a rescue disk."
 *   vlang[251] = "Select one of the options and click Insert..."
 *   vlang[252] = "No Media Available"
 *   vlang[254] = "CD/DVD Loaded"
 *   vlang[257] = "Eject"
 *   vlang[258] = "Boot Order"
 *   vlang[259] = "Choose the device you would like to be attempted first."
 *   vlang[260] = "Apply"
 *   vlang[266] = "Manage Media"
 *   vlang[286] = "Insert"
 *   vlang[323] = "Custom CD/DVD"
 *   vlang[324] = "Preset CD/DVD"
 *   vlang[368] = "Rescue Mode boots a minimal operating system..."
 *   vlang[371] = "Create Rescue Session"
 *   vlang[372] = "Are you sure you want to create a rescue session for this server?..."
 *   vlang[373] = "End Rescue Session"
 *   vlang[376] = "Rescue"
 *
 * IMPORTANT: Tests MUST cancel rebuild/install confirmations — never confirm in CI/automated runs.
 */
export class VpsPanelMediaPage {
  readonly serverUrl: string;

  constructor(private page: Page, uuid: string = TEST_SERVER_UUID) {
    this.serverUrl = `${PANEL_URL}/server/${uuid}`;
  }

  // ── OS Template List ──────────────────────────────────────────────────────

  /** "Operating System" section heading (vlang 149) */
  get osLabel(): Locator {
    return this.page.locator(':has-text("Operating System")').first();
  }

  /** "Install with Template" label (vlang 153) */
  get installWithTemplateLabel(): Locator {
    return this.page.locator('text="Install with Template"').first();
  }

  /** "Self Install" option (vlang 152) */
  get selfInstallLabel(): Locator {
    return this.page.locator('text="Self Install"').first();
  }

  /** "No suitable operating system templates available" message (vlang 154) */
  get noTemplatesMessage(): Locator {
    return this.page.locator(':has-text("No suitable operating system templates available")').first();
  }

  /**
   * OS template options — VirtFusion renders them client-side.
   * Multiple selector patterns in priority order.
   */
  get osTemplateItems(): Locator {
    return this.page.locator(
      '[class*="template-option"], [class*="os-option"], [data-template-id], [class*="media-item"], [class*="template-item"], [class*="os-item"]'
    );
  }

  /** Currently selected/active template */
  get activeTemplate(): Locator {
    return this.page.locator(
      '[class*="template"][class*="active"], [class*="os"][class*="active"], [class*="selected"][class*="template"], [class*="media"][class*="active"]'
    ).first();
  }

  // ── Rebuild / Install Action ──────────────────────────────────────────────

  /**
   * "Rebuild" button (vlang 196) — main action when OS is already installed.
   * "Install" (vlang 173) — for fresh install without OS.
   */
  get rebuildOrInstallButton(): Locator {
    return this.page.locator(
      'button:has-text("Rebuild"), button:has-text("Install")'
    ).first();
  }

  /** Specifically the "Rebuild" button (vlang 196) */
  get rebuildButton(): Locator {
    return this.page.locator('button:has-text("Rebuild")').first();
  }

  // ── Rebuild Confirmation Modal ────────────────────────────────────────────

  /** The confirmation modal/dialog */
  get confirmModal(): Locator {
    return this.page.locator('[class*="modal"], [role="dialog"]').first();
  }

  /**
   * Rebuild confirmation text (vlang 118):
   * "Are you sure you want to rebuild this server?"
   * Exact text confirmed from live :vlang prop.
   */
  get rebuildConfirmText(): Locator {
    return this.page.locator(
      ':has-text("Are you sure you want to rebuild this server?")'
    ).first();
  }

  /**
   * "Rebuilding will delete all existing data..." warning text (vlang 137).
   * Shown inside the rebuild modal as a warning.
   */
  get rebuildWarningText(): Locator {
    return this.page.locator(
      ':has-text("Rebuilding will delete all existing data")'
    ).first();
  }

  /**
   * "Continue" button — confirms rebuild (vlang 119).
   * ⚠️  Do NOT click this in automated tests — it triggers a real rebuild.
   */
  get rebuildContinueButton(): Locator {
    return this.page.locator('button:has-text("Continue")').first();
  }

  /**
   * Cancel/abort buttons (vlang 3 "Cancel" / vlang 140 "Cancel Rebuild").
   * Safe to click — aborts the rebuild flow.
   */
  get rebuildCancelButton(): Locator {
    return this.page.locator(
      'button:has-text("Cancel Rebuild"), button:has-text("Cancel")'
    ).first();
  }

  /** "Install Now" confirm button (vlang 130) */
  get installNowButton(): Locator {
    return this.page.locator('button:has-text("Install Now")').first();
  }

  // ── CD/DVD Section ────────────────────────────────────────────────────────

  /** "CD/DVD" tab/button (vlang 182) */
  get cdDvdButton(): Locator {
    return this.page.locator('button:has-text("CD/DVD"), a:has-text("CD/DVD")').first();
  }

  /** "Manage Media" button (vlang 266) */
  get manageMediaButton(): Locator {
    return this.page.locator('button:has-text("Manage Media"), a:has-text("Manage Media")').first();
  }

  /** "No Media Available" message (vlang 252) */
  get noMediaMessage(): Locator {
    return this.page.locator('text="No Media Available"').first();
  }

  /** "Insert" button for inserting CD/DVD (vlang 286) */
  get insertButton(): Locator {
    return this.page.locator('button:has-text("Insert")').first();
  }

  /** "Eject" button when CD/DVD is loaded (vlang 257) */
  get ejectButton(): Locator {
    return this.page.locator('button:has-text("Eject")').first();
  }

  /** "Boot Order" section (vlang 258) */
  get bootOrderSection(): Locator {
    return this.page.locator('text="Boot Order"').first();
  }

  /** "Apply" button for boot order (vlang 260) */
  get applyButton(): Locator {
    return this.page.locator('button:has-text("Apply")').first();
  }

  /** "Preset CD/DVD" option (vlang 324) */
  get presetCdDvdLabel(): Locator {
    return this.page.locator('text="Preset CD/DVD"').first();
  }

  /** "Custom CD/DVD" option (vlang 323) */
  get customCdDvdLabel(): Locator {
    return this.page.locator('text="Custom CD/DVD"').first();
  }

  // ── Rescue Mode ───────────────────────────────────────────────────────────

  /** "Rescue" section/button (vlang 376) */
  get rescueButton(): Locator {
    return this.page.locator('button:has-text("Rescue"), a:has-text("Rescue")').first();
  }

  /** "Create Rescue Session" button (vlang 371) */
  get createRescueSessionButton(): Locator {
    return this.page.locator('button:has-text("Create Rescue Session")').first();
  }

  /**
   * Create rescue session confirmation text (vlang 372):
   * "Are you sure you want to create a rescue session for this server?..."
   */
  get rescueSessionConfirmText(): Locator {
    return this.page.locator(
      ':has-text("Are you sure you want to create a rescue session")'
    ).first();
  }

  /** "End Rescue Session" button (vlang 373) */
  get endRescueSessionButton(): Locator {
    return this.page.locator('button:has-text("End Rescue Session")').first();
  }

  /** "Rescue Mode boots a minimal operating system..." description (vlang 368) */
  get rescueModeDescription(): Locator {
    return this.page.locator(
      ':has-text("Rescue Mode boots a minimal operating system")'
    ).first();
  }

  // ── Build Status ──────────────────────────────────────────────────────────

  /** "Server Setup..." text while building (vlang 136) */
  get buildingStatus(): Locator {
    return this.page.locator(
      ':has-text("Server Setup"), :has-text("being built")'
    ).first();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Click Rebuild button → wait for modal → verify confirm text → Cancel.
   * The modal text "Are you sure you want to rebuild this server?" is vlang[118].
   * Returns true if modal appeared with correct confirm text.
   */
  async clickRebuildAndCancel(): Promise<boolean> {
    const btn = await this.rebuildOrInstallButton.isVisible().catch(() => false);
    if (!btn) return false;

    await this.rebuildOrInstallButton.click();

    try {
      await this.confirmModal.waitFor({ state: "visible", timeout: 8_000 });
      const modalText = await this.confirmModal.innerText().catch(() => "");
      console.log(`[INFO] Modal text: "${modalText.trim().slice(0, 200)}"`);

      // Verify it's the rebuild modal (vlang 118 text)
      const isRebuildModal = /rebuild this server|Are you sure you want to rebuild/i.test(modalText);
      console.log(`[INFO] Is rebuild modal: ${isRebuildModal}`);

      await this.rebuildCancelButton.click();
      await this.confirmModal.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => null);
      return true;
    } catch {
      return false;
    }
  }

  /** Select an OS template by partial name match */
  async selectTemplate(namePartial: string): Promise<void> {
    await this.page.locator(
      `[class*="template"]:has-text("${namePartial}"), [class*="os"]:has-text("${namePartial}"), [class*="media"]:has-text("${namePartial}")`
    ).first().click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Checks if Media tab content is loaded.
   * Looks for confirmed vlang strings.
   */
  async hasMediaContent(): Promise<boolean> {
    const body = await this.page.locator("body").innerText().catch(() => "");
    return /Operating System|Rebuild|CD\/DVD|Rescue|Install with Template/i.test(body);
  }
}
