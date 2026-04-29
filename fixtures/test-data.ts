/**
 * Centralised test data. All values verified against the live godlike.host
 * site (see scripts/inspect-* in the original godlike-e2e project for raw
 * DOM dumps).
 *
 * URLs are paths relative to baseURL (https://godlike.host).
 */

export const BASE_URL = "https://godlike.host";

export const Urls = {
  home: "/",
  login: "/clientarea/login",
  clientarea: "/clientarea/clientarea.php",

  moddedHosting: "/modded-minecraft-server-hosting/",
  seedSkyHaven: "/minecraft-seeds/sky-haven-island-atm-10-seed/",

  /** Vue cart used by both modpack-grid install buttons and seed BUY buttons. */
  cart: "/cart",

  /** Vue cart variant used by the in-page calculator's "Host Now" CTA. */
  cartModdedNew: "/cart-modded-new/",

  /**
   * Final WHMCS Lagom payment page. Reached AFTER login + Next step on the Vue
   * cart. Tests stop here — they NEVER click "Continue" on this page.
   */
  cartCheckout: "/clientarea/cart.php?a=checkout",
} as const;

/** A URL is "the payment step" if it matches any of these. */
export const PaymentUrlPatterns = [
  /\/clientarea\/cart\.php\?a=checkout/i,
  /\/clientarea\/cart\.php\?a=complete/i,
  /\/clientarea\/viewinvoice\.php/i,
] as const;

/** A URL is "Vue cart step 2 (billing cycle)" if it matches this. */
export const VueCartStep2Pattern = /\/cart\?[^#]*step=2/i;

/**
 * Test account. Override via env vars when running locally if needed.
 * Reference project uses the same shared test@testmail.com account.
 */
export const Credentials = {
  email: process.env.GODLIKE_USER ?? "test@testmail.com",
  password: process.env.GODLIKE_PASSWORD ?? "test@testmail.com",
};

/**
 * Quick-pick modpack pills present on /modded-minecraft-server-hosting/.
 * Verified by DOM inspection on 2026-04-26.
 */
export const QuickPickModpacks = [
  "ATM 10",
  "BMC 4",
  "Prominence II",
  "RLCraft",
  "ATMons",
] as const;

export type QuickPickModpack = (typeof QuickPickModpacks)[number];
