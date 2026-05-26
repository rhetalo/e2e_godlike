import { type Page, type Locator } from "@playwright/test";
import { PANEL_URL, TEST_SERVER_UUID } from "../utils/auth";

/**
 * VpsPanelRebuildPage — OS selection page reached after confirming "Rebuild" on the server page.
 *
 * Navigation path (confirmed May 2026):
 *   /server/{UUID}  →  click "Rebuild" button
 *                   →  modal "Are you sure you want to rebuild this server?"
 *                   →  click button#server-install-button ("Continue")
 *                   →  THIS PAGE (OS template selection)
 *
 * ⚠️  Rebuild only executes when the user SELECTS an OS and clicks the final install button.
 *     Navigating to this page and selecting an OS card is SAFE — no data loss occurs.
 *     Do NOT click the final "Install" / "Rebuild" confirm button in automated tests.
 *
 * ── CONFIRMED SELECTORS (from live DevTools, May 2026) ──────────────────────
 *
 * OS CARD (unselected):
 *   <div style="cursor: pointer;"
 *        class="card os-select position-relative card-not-inverted-big-border-os">
 *     <div class="card-body p-4 d-flex justify-content-start">
 *       <img style="max-height: 50px;" src="/img/logo/almalinux_logo.png">
 *       <h5 class="mb-1">AlmaLinux 9 Latest</h5>
 *       <span><p>Latest version with base packages…</p></span>
 *     </div>
 *   </div>
 *
 * OS CARD (selected — confirmed by class toggle: "not-inverted" → removes "not-"):
 *   class="card os-select position-relative card-inverted-big-border-os"
 *
 * OS GROUP ACCORDION:
 *   <div class="accordion-item">
 *     <h2 class="accordion-header" id="heading-N">
 *       <button class="accordion-button [collapsed]" data-bs-toggle="collapse"
 *               data-bs-target="#collapse-N">
 *         <h4 class="mb-0">CentOS</h4>
 *       </button>
 *     </h2>
 *     <div id="collapse-N" class="accordion-collapse collapse [show]">
 *       <div class="accordion-body p-3">
 *         <!-- OS cards here -->
 *       </div>
 *     </div>
 *   </div>
 *
 * CONFIRMED OS GROUPS & TEMPLATES:
 *   AlmaLinux  → AlmaLinux 9 Latest  (shown directly, outside accordion)
 *   CentOS     → CentOS 7 Minimal, CentOS Stream 9 Minimal
 *   Debian     → Debian 11 (Bullseye) Minimal, Debian 12 (Bookworm) Minimal
 *   Fedora     → Fedora 41 Minimal, Fedora 42 Minimal
 *   Games      → Ubuntu Server + Valheim 24.04 LTS (Noble Numbat) Minimal
 */
export class VpsPanelRebuildPage {
  readonly serverUrl: string;

  constructor(
    private page: Page,
    uuid: string = TEST_SERVER_UUID,
  ) {
    this.serverUrl = `${PANEL_URL}/server/${uuid}`;
  }

  // ── OS Cards ──────────────────────────────────────────────────────────────

  /**
   * All OS cards on the page (including those inside closed accordions).
   * Unselected class: card-not-inverted-big-border-os
   */
  get allOsCards(): Locator {
    return this.page.locator("div.card.os-select");
  }

  /** Unselected OS cards (default state) */
  get unselectedOsCards(): Locator {
    return this.page.locator("div.card.os-select.card-not-inverted-big-border-os");
  }

  /**
   * Selected OS card.
   * When selected, class changes from "card-not-inverted-big-border-os"
   * to "card-inverted-big-border-os".
   */
  get selectedOsCard(): Locator {
    return this.page.locator("div.card.os-select.card-inverted-big-border-os").first();
  }

  /** OS card by exact name (h5.mb-1 text) */
  osCardByName(name: string): Locator {
    return this.page
      .locator("div.card.os-select")
      .filter({ has: this.page.locator(`h5.mb-1:has-text("${name}")`) })
      .first();
  }

  /** OS name heading inside a card */
  get osCardNames(): Locator {
    return this.page.locator("div.card.os-select h5.mb-1");
  }

  /** Returns all visible OS template names on the current page state */
  async getVisibleOsNames(): Promise<string[]> {
    const count = await this.osCardNames.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = (await this.osCardNames.nth(i).innerText().catch(() => "")).trim();
      if (text) names.push(text);
    }
    return names;
  }

  // ── Accordion Groups ──────────────────────────────────────────────────────

  /** All accordion items (OS distribution groups) */
  get accordionItems(): Locator {
    return this.page.locator("div.accordion-item");
  }

  /** All accordion group header buttons */
  get accordionButtons(): Locator {
    return this.page.locator("button.accordion-button");
  }

  /** Accordion button by OS family name (h4.mb-0 inside button) */
  accordionButtonByName(family: string): Locator {
    return this.page
      .locator("button.accordion-button")
      .filter({ has: this.page.locator(`h4.mb-0:has-text("${family}")`) })
      .first();
  }

  /** Accordion panel that is currently open (.accordion-collapse.show) */
  get openAccordionPanels(): Locator {
    return this.page.locator("div.accordion-collapse.show");
  }

  /**
   * Expand an accordion group by OS family name.
   * Waits for the collapse panel to show.
   */
  async expandAccordion(family: string): Promise<void> {
    const btn = this.accordionButtonByName(family);
    const isCollapsed = await btn.evaluate((el) => el.classList.contains("collapsed")).catch(() => true);

    if (isCollapsed) {
      await btn.click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Returns OS card names visible inside a specific accordion group.
   * Expands the group first if collapsed.
   */
  async getOsNamesInGroup(family: string): Promise<string[]> {
    await this.expandAccordion(family);

    const panel = this.page
      .locator("button.accordion-button")
      .filter({ has: this.page.locator(`h4.mb-0:has-text("${family}")`) })
      .locator("xpath=ancestor::div[@class and contains(@class,'accordion-item')]")
      .locator("div.accordion-body h5.mb-1");

    const count = await panel.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = (await panel.nth(i).innerText().catch(() => "")).trim();
      if (text) names.push(text);
    }
    return names;
  }

  // ── Final Install Button (DO NOT CLICK) ───────────────────────────────────
  //
  // The final button that actually executes the rebuild/install.
  // Selector is NOT confirmed yet — do not use in production tests.
  // Marked as separate getter to make the intent clear.

  /** ⚠️  Final "Install" / "Rebuild" button — DO NOT click in automated tests */
  get finalInstallButton(): Locator {
    return this.page
      .locator('button:has-text("Install Now"), button:has-text("Rebuild"), button:has-text("Install")')
      .last();
  }

  // ── Page State ────────────────────────────────────────────────────────────

  /** Returns true if the OS selection page has loaded (at least 1 OS card present) */
  async isLoaded(): Promise<boolean> {
    const count = await this.allOsCards.count().catch(() => 0);
    return count > 0;
  }

  /** Returns count of all OS cards (including inside collapsed accordions) */
  async getTotalOsCount(): Promise<number> {
    return this.allOsCards.count();
  }
}
