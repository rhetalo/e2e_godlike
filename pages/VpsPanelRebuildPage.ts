import { type Page, type Locator, expect } from "@playwright/test";
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
 *     Do NOT click the final "Install with ..." button in automated tests.
 *
 * ── CONFIRMED SELECTORS (from live DevTools, May 2026) ──────────────────────
 *
 * OS CARD (unselected — initial state):
 *   <div style="cursor: pointer;"
 *        class="card os-select position-relative card-not-inverted-big-border-os">
 *     <div class="card-body p-4 d-flex justify-content-start">
 *       <img style="max-height: 50px;" ...>
 *       <h5 class="mb-1">AlmaLinux 9 Latest</h5>
 *       <span><p>...</p></span>
 *     </div>
 *   </div>
 *
 * OS CARD (selected — confirmed from DevTools):
 *   class="card os-select position-relative card-not-inverted-big-border-os border-success shadow-sm selected-card"
 *   ⚠️  NOTE: card-not-inverted-big-border-os is KEPT on selection.
 *             The card ADDS: border-success, shadow-sm, selected-card.
 *             A checkmark SVG appears inside div.position-absolute.card-selected.
 *             card-inverted-big-border-os is NEVER added — old assumption was wrong.
 *
 * INSTALL BUTTON (appears ONLY after an OS card is selected, not before):
 *   <button type="button"
 *           class="mt-0 btn btn-primary btn-lg w-100 d-flex justify-content-center align-items-center mb-3 p-4">
 *     <span>Install with {OS Name}</span>
 *   </button>
 *   — Text changes to match selected OS (e.g. "Install with Debian 11 (Bullseye) Minimal")
 *   — Button is ABSENT from DOM before any OS is selected (not just disabled — not rendered)
 *
 * SWAP SPACE CARDS (appear after OS selection):
 *   <div class="card h-100 position-relative card-not-inverted-big-border c-pointer">
 *     <h4 class="text-center w-100">None</h4>    (or: 256 MB, 512 MB, 768 MB, 1 GB, 2 GB, ...)
 *   </div>
 *   Selected swap card adds: border-success shadow-sm selected-card
 *
 * OS GROUP ACCORDION (heading-0 through heading-5):
 *   <div class="accordion-item">
 *     <h2 class="accordion-header" id="heading-N">
 *       <button class="accordion-button [collapsed]" data-bs-toggle="collapse">
 *         <h4 class="mb-0">CentOS</h4>
 *       </button>
 *     </h2>
 *     <div id="collapse-N" class="accordion-collapse collapse [show]">
 *       <div class="accordion-body p-3"><!-- OS cards --></div>
 *     </div>
 *   </div>
 *
 * CONFIRMED OS GROUPS & TEMPLATES (total 18 cards across 6 groups):
 *   AlmaLinux  (heading-0) — AlmaLinux 8 Minimal, AlmaLinux 9 Latest
 *   CentOS     (heading-1) — CentOS 7 Minimal, CentOS Stream 9 Minimal
 *   Debian     (heading-2) — Debian 11 (Bullseye) Minimal, Debian 12 (Bookworm) Minimal
 *   Fedora     (heading-3) — Fedora 41 Minimal, Fedora 42 Minimal
 *   Games      (heading-4) — Ubuntu Server + Valheim 24.04, ARK: Survival Evolved 24.04,
 *                             Palworld 24.04, Satisfactory 24.04, Minecraft 22.04
 *   Ubuntu     (heading-5) — Ubuntu Server 20.04, 22.04, 24.04,
 *                             Docker Ubuntu Server 24.04, WordPress Ubuntu Server 24.04
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
   * Total: 18 cards across 6 groups (confirmed May 2026).
   */
  get allOsCards(): Locator {
    return this.page.locator("div.card.os-select");
  }

  /**
   * Unselected OS cards.
   * Confirmed: selected cards keep card-not-inverted-big-border-os AND add selected-card.
   * So unselected = os-select without .selected-card.
   */
  get unselectedOsCards(): Locator {
    return this.page.locator("div.card.os-select:not(.selected-card)");
  }

  /**
   * Selected OS card(s).
   * Confirmed from DevTools: selection ADDS .selected-card and .border-success.
   * card-not-inverted-big-border-os is KEPT. card-inverted-big-border-os is NEVER added.
   */
  get selectedOsCard(): Locator {
    return this.page.locator("div.card.os-select.selected-card");
  }

  /** OS card by partial name match (h5.mb-1 text) */
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

  /** All accordion items (OS distribution groups). Total: 6 (heading-0 through heading-5). */
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
   * Waits for the collapse panel to become visible.
   */
  async expandAccordion(family: string): Promise<void> {
    const btn = this.accordionButtonByName(family);
    const isCollapsed = await btn.evaluate((el) => el.classList.contains("collapsed")).catch(() => true);
    if (isCollapsed) {
      await btn.click();
      await expect(btn).not.toHaveClass(/collapsed/, { timeout: 3_000 });
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

  // ── Final Install Button ──────────────────────────────────────────────────

  /**
   * ⚠️  Final "Install with {OS}" button — DO NOT click in automated tests.
   *
   * Confirmed HTML (May 2026):
   *   <button class="mt-0 btn btn-primary btn-lg w-100 ...">
   *     <span>Install with Ubuntu Server 22.04 LTS (Jammy Jellyfish)</span>
   *   </button>
   *
   * Behaviour:
   *   — ABSENT from DOM before any OS is selected (not disabled, simply not rendered)
   *   — APPEARS after clicking an OS card
   *   — Text changes to reflect the selected OS name
   */
  get finalInstallButton(): Locator {
    return this.page.locator("button.btn-primary.btn-lg").filter({ hasText: /Install with/ });
  }

  /** Text inside the Install button span (e.g. "Install with Debian 11 (Bullseye) Minimal") */
  async getInstallButtonText(): Promise<string> {
    return (await this.finalInstallButton.locator("span").innerText().catch(() => "")).trim();
  }

  /** Returns true if the Install button is currently visible (only after OS selection) */
  async isInstallButtonVisible(): Promise<boolean> {
    return this.finalInstallButton.isVisible().catch(() => false);
  }

  // ── Swap Space Cards (appear after OS selection) ──────────────────────────

  /**
   * Swap space option cards (None, 256 MB, 512 MB, 768 MB, 1 GB, 2 GB, ...).
   * Appear in DOM only after an OS card is selected.
   * Selected swap card adds: border-success shadow-sm selected-card
   */
  get swapSpaceCards(): Locator {
    return this.page.locator("div.card.card-not-inverted-big-border.c-pointer");
  }

  /** Currently selected swap space card */
  get selectedSwapCard(): Locator {
    return this.page.locator("div.card.card-not-inverted-big-border.c-pointer.selected-card");
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
