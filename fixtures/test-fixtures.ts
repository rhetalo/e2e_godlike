/**
 * Custom Playwright fixtures.
 *
 * Each Page Object is exposed as a fixture so specs can grab exactly what they
 * need without manual instantiation:
 *
 *   test('my flow', async ({ moddedPage, cartPage }) => { ... });
 *
 * Note: there is no separate LoginPage. The godlike.host login form lives
 * inside the Vue cart's `.auth-block` and is exposed via `CartPage`.
 */

import { test as base } from "@playwright/test";
import { ModdedHostingPage } from "../pages/ModdedHostingPage";
import { SeedPage } from "../pages/SeedPage";
import { CartPage } from "../pages/CartPage";
import { CheckoutPage } from "../pages/CheckoutPage";
import { CookieBanner } from "../pages/components/CookieBanner";

type Fixtures = {
  moddedPage: ModdedHostingPage;
  seedPage: SeedPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  cookieBanner: CookieBanner;
};

export const test = base.extend<Fixtures>({
  moddedPage: async ({ page }, use) => {
    await use(new ModdedHostingPage(page));
  },
  seedPage: async ({ page }, use) => {
    await use(new SeedPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
  cookieBanner: async ({ page }, use) => {
    await use(new CookieBanner(page));
  },
});

export { expect } from "@playwright/test";
