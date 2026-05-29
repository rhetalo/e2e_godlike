import { type Page, type Locator } from "@playwright/test";

/**
 * VpsPanelNetworkPage — Network tab on /server/{UUID}
 * VirtFusion v4.x network configuration and IP address management.
 *
 * HTML confirmed May 2026 (from live page snapshots):
 *   Tab pane:        id="pills-connectivity"  role="tabpanel"
 *   Primary Network: <h2 class="mb-0">Primary Network</h2>
 *   Statistics btn:  <button class="btn btn-primary btn-small">...<span>Statistics</span></button>
 *   Traffic charts:  <div id="traffic-chart-monthly"> / <div id="traffic-chart-daily">
 *                    → Plotly adds class="js-plotly-plot" after rendering
 *   rDNS button:     <button data-bs-toggle="modal" data-bs-target="#rdnsModal">Reverse DNS</button>
 *   rDNS modal:      id="rdnsModal"
 *   rDNS title:      <h2 class="modal-title">Reverse DNS · {IP}</h2>
 *   rDNS input:      <input name="rdns" class="form-control form-control-lg">
 *   rDNS Cancel:     <button data-bs-dismiss="modal">Cancel</button>  (inside #rdnsModal)
 *   DNS resolver 1:  .multiselect-single-label:has-text("Cloudflare")
 *   DNS resolver 2:  .multiselect-single-label:has-text("System Default")
 *
 * vlang-strings confirmed (May 2026):
 *   vlang[83]  = "Reverse DNS"
 *   vlang[194] = "Network Traffic"
 *   vlang[201] = "Primary Network:"
 *   vlang[203] = "Primary IPv4:"
 *   vlang[204] = "Primary IPv6:"
 *   vlang[261] = "Primary Network"  ← h2 heading (no colon)
 *   vlang[362] = "Auto Configuration"
 */
export class VpsPanelNetworkPage {
  constructor(private page: Page) {}

  // ── Tab pane ───────────────────────────────────────────────────────────────

  /** Root pane for the Network / Connectivity tab */
  private get pane(): Locator {
    return this.page.locator("#pills-connectivity");
  }

  // ── Primary Network card ───────────────────────────────────────────────────

  /** <h2>Primary Network</h2> heading inside the tab pane (vlang[261]) */
  get primaryNetworkHeading(): Locator {
    return this.pane.locator('h2:has-text("Primary Network")').first();
  }

  // ── IP Address Info ────────────────────────────────────────────────────────

  /** "Primary Network:" label in IP info table (vlang[201]) */
  get primaryNetworkLabel(): Locator {
    return this.page.locator('text="Primary Network:"').first();
  }

  /** "Primary IPv4:" label in IP info table (vlang[203]) */
  get primaryIpv4Label(): Locator {
    return this.page.locator('text="Primary IPv4:"').first();
  }

  /** "Primary IPv6:" label in IP info table (vlang[204]) */
  get primaryIpv6Label(): Locator {
    return this.page.locator('text="Primary IPv6:"').first();
  }

  // ── Statistics button & traffic charts ────────────────────────────────────

  /**
   * "Statistics" toggle button inside Primary Network card.
   * Clicking reveals/hides Plotly traffic charts.
   */
  get statisticsButton(): Locator {
    return this.pane.locator('button:has-text("Statistics")').first();
  }

  /**
   * Monthly traffic chart container.
   * Plotly adds class="js-plotly-plot" once the chart is rendered.
   */
  get trafficChartMonthly(): Locator {
    return this.pane.locator("#traffic-chart-monthly");
  }

  /** Daily traffic chart container */
  get trafficChartDaily(): Locator {
    return this.pane.locator("#traffic-chart-daily");
  }

  // ── Reverse DNS ────────────────────────────────────────────────────────────

  /**
   * "Reverse DNS" button that opens #rdnsModal.
   * Scoped to the Network tab pane to avoid matching the modal title text.
   * HTML: <button data-bs-toggle="modal" data-bs-target="#rdnsModal">Reverse DNS</button>
   */
  get reverseDnsButton(): Locator {
    return this.pane.locator('button[data-bs-target="#rdnsModal"]').first();
  }

  /** Bootstrap modal overlay — becomes visible after clicking reverseDnsButton */
  get rdnsModal(): Locator {
    return this.page.locator("#rdnsModal");
  }

  /**
   * Modal title.
   * VirtFusion renders: "Reverse DNS · {IP}"  e.g. "Reverse DNS · 162.141.167.20"
   */
  get rdnsModalTitle(): Locator {
    return this.page.locator("#rdnsModal .modal-title");
  }

  /** Text input for the new hostname / PTR record */
  get rdnsModalInput(): Locator {
    return this.page.locator('#rdnsModal input[name="rdns"]');
  }

  /** Cancel button — dismisses the modal without saving */
  get rdnsModalCancel(): Locator {
    return this.page.locator('#rdnsModal button[data-bs-dismiss="modal"]:has-text("Cancel")');
  }

  // ── DNS Resolvers (multiselect dropdowns) ─────────────────────────────────

  /**
   * Primary resolver label showing "Cloudflare".
   * VirtFusion uses vue-multiselect; the selected value is inside
   * .multiselect-single-label when collapsed.
   */
  get primaryDnsResolverLabel(): Locator {
    return this.pane.locator('.multiselect-single-label:has-text("Cloudflare")').first();
  }

  // ── "Network Traffic" section (vlang[194]) ────────────────────────────────

  /** "Network Traffic" heading — present only if the plan includes traffic accounting */
  get networkTrafficSection(): Locator {
    return this.page.locator('text="Network Traffic"').first();
  }

  // ── Tab readiness ──────────────────────────────────────────────────────────

  /** Wait for the connectivity tab pane to appear in DOM and be visible */
  async waitForNetworkTab(): Promise<void> {
    await this.pane.waitFor({ state: "visible", timeout: 15_000 });
  }

  /**
   * Returns all unique IPv4 addresses visible in the page body text.
   * VirtFusion renders server IPs as plain text inside table cells.
   */
  async getVisibleIpAddresses(): Promise<string[]> {
    const allText = await this.page.locator("body").innerText();
    const ipRegex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
    return [...new Set(allText.match(ipRegex) ?? [])];
  }
}
