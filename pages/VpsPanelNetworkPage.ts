import { type Page, type Locator } from "@playwright/test";

/**
 * VpsPanelNetworkPage — Network tab on /server/{UUID}
 * VirtFusion v4.x network configuration and IP address management.
 *
 * ALL strings confirmed from :vlang on live server page (May 2026):
 *   vlang[83]  = "Reverse DNS"                    ← exact section label
 *   vlang[194] = "Network Traffic"
 *   vlang[201] = "Primary Network:"
 *   vlang[203] = "Primary IPv4:"
 *   vlang[204] = "Primary IPv6:"
 *   vlang[241] = "ID:"
 *   vlang[242] = "Interface:"
 *   vlang[243] = "Type:"
 *   vlang[244] = "MAC:"
 *   vlang[245] = "Speed (inbound):"
 *   vlang[246] = "Speed (outbound):"
 *   vlang[261] = "Primary Network"
 *   vlang[284] = "A new IPv6 address has been added..."
 *   vlang[362] = "Auto Configuration"
 *   vlang[162] = "IPv6 Network"
 *
 * vlang-nat (NAT/domains section):
 *   vlang-nat[17] = "Domain"
 *   vlang-nat[18] = "Domains"
 *   vlang-nat[27] = "Service Ports"
 *   vlang-nat[34] = "Configurable Ports"
 *   vlang-nat[58] = "Update"
 *
 * vlang-resolvers:
 *   [1] = "Primary", [2] = "Secondary", [3] = "System Default"
 */
export class VpsPanelNetworkPage {
  constructor(private page: Page) {}

  // ── IP Address Info ────────────────────────────────────────────────────────

  /** "Primary Network:" label (vlang 201) */
  get primaryNetworkLabel(): Locator {
    return this.page.locator('text="Primary Network:"').first();
  }

  /** "Primary IPv4:" label (vlang 203) */
  get primaryIpv4Label(): Locator {
    return this.page.locator('text="Primary IPv4:"').first();
  }

  /** "Primary IPv6:" label (vlang 204) */
  get primaryIpv6Label(): Locator {
    return this.page.locator('text="Primary IPv6:"').first();
  }

  /** "Interface:" label (vlang 242) */
  get interfaceLabel(): Locator {
    return this.page.locator('text="Interface:"').first();
  }

  /** "MAC:" label (vlang 244) */
  get macLabel(): Locator {
    return this.page.locator('text="MAC:"').first();
  }

  /** "IPv6 Network" section label (vlang 162) */
  get ipv6NetworkLabel(): Locator {
    return this.page.locator('text="IPv6 Network"').first();
  }

  // ── rDNS / Reverse DNS ────────────────────────────────────────────────────

  /**
   * "Reverse DNS" section heading (vlang 83) — confirmed exact text.
   * Previously searched for "rDNS" which is incorrect.
   */
  get reverseDnsSection(): Locator {
    return this.page.locator('text="Reverse DNS"').first();
  }

  /** rDNS hostname input */
  get rdnsInput(): Locator {
    return this.page.locator(
      'input[placeholder*="domain" i], input[placeholder*="hostname" i], input[placeholder*="reverse" i], input[name*="rdns"]'
    ).first();
  }

  // ── Network Traffic ────────────────────────────────────────────────────────

  /** "Network Traffic" section (vlang 194) */
  get networkTrafficSection(): Locator {
    return this.page.locator('text="Network Traffic"').first();
  }

  // ── Domains / NAT (vlang-nat) ─────────────────────────────────────────────

  /** "Domains" section (vlang-nat 18) */
  get domainsSection(): Locator {
    return this.page.locator('text="Domains"').first();
  }

  /** "Service Ports" section (vlang-nat 27) */
  get servicePortsSection(): Locator {
    return this.page.locator('text="Service Ports"').first();
  }

  /** "Configurable Ports" section (vlang-nat 34) */
  get configurablePortsSection(): Locator {
    return this.page.locator('text="Configurable Ports"').first();
  }

  /** Add Domain button (vlang-nat 19: "Add") */
  get addDomainButton(): Locator {
    return this.page.locator('button:has-text("Add Domain")').first();
  }

  /** Update button (vlang-nat 58) */
  get updateButton(): Locator {
    return this.page.locator('button:has-text("Update")').first();
  }

  // ── DNS Resolvers ──────────────────────────────────────────────────────────

  /** "Primary" resolver label (vlang-resolvers 1) */
  get primaryResolverLabel(): Locator {
    return this.page.locator('text="Primary"').first();
  }

  // ── Auto Configuration ─────────────────────────────────────────────────────

  /** "Auto Configuration" section (vlang 362) */
  get autoConfigLabel(): Locator {
    return this.page.locator('text="Auto Configuration"').first();
  }

  // ── Tab readiness ──────────────────────────────────────────────────────────

  async waitForNetworkTab(): Promise<void> {
    await this.page.waitForLoadState("networkidle").catch(() => null);
  }

  /**
   * Get all visible IPv4 addresses from the page body text.
   * VirtFusion renders IP addresses as plain text in network tab.
   */
  async getVisibleIpAddresses(): Promise<string[]> {
    const allText = await this.page.locator("body").innerText();
    const ipRegex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
    return [...new Set(allText.match(ipRegex) ?? [])];
  }

  /**
   * Checks if the Network tab has loaded real content.
   * Looks for confirmed vlang strings.
   */
  async hasNetworkContent(): Promise<boolean> {
    const body = await this.page.locator("body").innerText().catch(() => "");
    return /Primary Network|Reverse DNS|Network Traffic|IPv4|IPv6/i.test(body);
  }
}
