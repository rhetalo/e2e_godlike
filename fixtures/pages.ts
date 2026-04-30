import { test as base } from '@playwright/test';
import { ModdedHostingPage } from '../pages/ModdedHostingPage1';
import { SeedDetailPage } from '../pages/SeedDetailPage';
import { SeedsListPage } from '../pages/SeedsListPage';
import { CartPage } from '../pages/CartPage';
import { LoginPage } from '../pages/LoginPage1';

type Pages = {
  moddedHostingPage: ModdedHostingPage;
  seedDetailPage: SeedDetailPage;
  seedsListPage: SeedsListPage;
  cartPage: CartPage;
  loginPage: LoginPage;
};

export const test = base.extend<Pages>({
  moddedHostingPage: async ({ page }, use) => { await use(new ModdedHostingPage(page)); },
  seedDetailPage: async ({ page }, use) => { await use(new SeedDetailPage(page)); },
  seedsListPage: async ({ page }, use) => { await use(new SeedsListPage(page)); },
  cartPage: async ({ page }, use) => { await use(new CartPage(page)); },
  loginPage: async ({ page }, use) => { await use(new LoginPage(page)); },
});

export { expect } from '@playwright/test';
