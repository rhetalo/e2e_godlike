/**
 * ModdedHostingPage — /modded-minecraft-server-hosting/
 *
 * Verified DOM shape (see inspection/modded.* in the original godlike-e2e
 * project for the raw dumps):
 *
 *   #plan-calculator                                ← Vuetify v-app root
 *     #planCalculatorFieldModpack                   ← v-autocomplete input
 *     #planCalculatorFieldModpackVersion            ← v-autocomplete input
 *     #planCalculatorFieldPlayersCount              ← hidden numeric input
 *     [role="slider"]                               ← v-slider thumb
 *     button.v-btn.rounded-pill                     ← quick-pick modpack pills
 *     a.plan-calculator__checkout__button[href]     ← "Host Now" → /cart-modded-new/?…
 *
 *   button.modpacks-body__install                   ← grid install buttons
 *     [data-product-id], [data-modpack-id], [data-promo]
 *
 * Quick-pick pills are: "ATM 10", "BMC 4", "Prominence II", "RLCraft", "ATMons".
 */
import type { Locator } from "@playwright/test";
import { BasePage } from "./BasePage";
import { Urls, type QuickPickModpack } from "../fixtures/test-data";
import { PlanCalculator } from "../components/PlanCalculator";

export interface InstallButtonMeta {
  productId: string | null;
  modpackId: string | null;
  promo: string | null;
}

export interface CalculatorCartParams {
  productId: string | null;
  modpackId: string | null;
  billingCycle: string | null;
  promo: string | null;
  discount: string | null;
  /** Full href (relative path + querystring) of the calculator's checkout link. */
  href: string;
}

export class ModdedHostingPage extends BasePage {
  readonly calculator = new PlanCalculator(this.page, "#plan-calculator");

  async open(): Promise<void> {
    await this.goto(Urls.moddedHosting);
    await this.calculator.waitMounted();
    // Re-dismiss the flash-sale modal once Vue has rendered (it appears late).
    await this.cookieBanner.dismissAll();
  }

  // ─── calculator ────────────────────────────────────────────────────────────

  modpackInput(): Locator {
    return this.page.locator("#planCalculatorFieldModpack");
  }

  modpackVersionInput(): Locator {
    return this.page.locator("#planCalculatorFieldModpackVersion");
  }

  /** Hidden players-count input (in sync with the slider). */
  playersHiddenInput(): Locator {
    return this.page.locator("#planCalculatorFieldPlayersCount");
  }

  /** Quick-pick rounded-pill buttons (e.g. "ATM 10"). */
  quickPickButton(name: QuickPickModpack | string): Locator {
    return this.calculator
      .root()
      .locator(`button.v-btn.rounded-pill:has-text("${name}")`)
      .first();
  }

  /**
   * The calculator's "Host Now" CTA. The href changes whenever the slider,
   * modpack or version are touched — reading it is the single most reliable
   * way to assert calculator state.
   */
  calculatorCheckoutLink(): Locator {
    return this.calculator
      .root()
      .locator("a.plan-calculator__checkout__button");
  }

  /** Parse the calculator's checkout link href into typed params. */
  async readCalculatorCartParams(): Promise<CalculatorCartParams> {
    const href = await this.calculatorCheckoutLink().getAttribute("href");
    if (!href) {
      throw new Error("calculator checkout link has no href");
    }
    const url = new URL(href, "https://godlike.host");
    const get = (k: string) => url.searchParams.get(k);
    return {
      productId: get("productId"),
      modpackId: get("modpackId"),
      billingCycle: get("billingCycle"),
      promo: get("promo"),
      discount: get("discount"),
      href,
    };
  }

  /** Open the modpack autocomplete and return the visible option titles. */
  async listModpackOptions(limit = 10): Promise<string[]> {
    await this.modpackInput().click();
    await this.page
      .locator(".v-autocomplete__content .v-list-item-title")
      .first()
      .waitFor({ state: "visible", timeout: 15_000 });
    return this.page
      .locator(".v-overlay-container .v-list-item")
      .evaluateAll(
        (nodes, n) =>
          nodes.slice(0, n).map((el) => (el.textContent || "").trim()),
        limit,
      );
  }

  // ─── modpack grid ──────────────────────────────────────────────────────────

  installButtons(): Locator {
    return this.page.locator("button.modpacks-body__install");
  }

  installButtonByIndex(index: number): Locator {
    return this.installButtons().nth(index);
  }

  async readInstallMeta(button: Locator): Promise<InstallButtonMeta> {
    return {
      productId: await button.getAttribute("data-product-id"),
      modpackId: await button.getAttribute("data-modpack-id"),
      promo: await button.getAttribute("data-promo"),
    };
  }
}
