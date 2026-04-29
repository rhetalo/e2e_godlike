/**
 * SeedPage — /minecraft-seeds/sky-haven-island-atm-10-seed/
 *
 * Verified DOM (see inspection/seed.* in the original godlike-e2e project):
 *
 *   #seed-calculator                                ← Vuetify v-app root
 *     [data-cart-base-url="https://godlike.host/cart"]
 *     [data-modpack-id="curseforge-925200-7852998"]
 *     [data-seed-id="-214726972146453730"]
 *     [data-promocode="SEED"] [data-discount="40"]
 *
 *     #fieldPlayersCount                            ← hidden numeric input
 *     [role="slider"]                               ← v-slider thumb (0..100, step 12.5)
 *     button[type="submit"].seed-calculator__btn    ← "Host Now" CTA inside the calc
 *
 *   button.single-seed-card__button                 ← "BUY A SERVER" card CTA
 *     [data-url="https://godlike.host/cart/?productId=…&seedId=…&modpackId=…"]
 *     [data-promocode="VANILLA20"]
 */
import type { Locator } from "@playwright/test";
import { BasePage } from "./BasePage";
import { Urls } from "../fixtures/test-data";
import { PlanCalculator } from "../components/PlanCalculator";

export interface SeedCalculatorMeta {
  cartBaseUrl: string | null;
  modpackId: string | null;
  seedId: string | null;
  promocode: string | null;
  discount: string | null;
}

export class SeedPage extends BasePage {
  readonly calculator = new PlanCalculator(this.page, "#seed-calculator");

  async open(): Promise<void> {
    await this.goto(Urls.seedSkyHaven);
    await this.calculator.waitMounted();
    await this.cookieBanner.dismissAll();
  }

  /** Read the data-* attributes baked onto the seed-calculator root. */
  async readCalculatorMeta(): Promise<SeedCalculatorMeta> {
    const root = this.calculator.root();
    return {
      cartBaseUrl: await root.getAttribute("data-cart-base-url"),
      modpackId: await root.getAttribute("data-modpack-id"),
      seedId: await root.getAttribute("data-seed-id"),
      promocode: await root.getAttribute("data-promocode"),
      discount: await root.getAttribute("data-discount"),
    };
  }

  /** "Host Now" submit button inside the calculator. */
  hostNowSubmit(): Locator {
    return this.calculator
      .root()
      .locator('button[type="submit"].seed-calculator__btn');
  }

  /** Big "BUY A SERVER" card CTA above the calculator. */
  buyServerButton(): Locator {
    return this.page.locator("button.single-seed-card__button").first();
  }

  /** The cart URL the BUY button will navigate to (read directly from data-url). */
  async buyServerCartUrl(): Promise<string | null> {
    return this.buyServerButton().getAttribute("data-url");
  }

  // ─── image gallery (used for negative selectors only) ─────────────────────

  galleryThumbs(): Locator {
    return this.page.locator(".single-seed-gallery__thumb");
  }

  galleryNext(): Locator {
    return this.page.locator(".single-seed-gallery__arrow--next");
  }
}
