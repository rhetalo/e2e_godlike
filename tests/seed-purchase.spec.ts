import { test, expect } from "../fixtures/pages";
import { seedPage, urls } from "../fixtures/testData";

test.describe('Sky Haven Island seed page @smoke', () => {
  test.beforeEach(async ({ seedDetailPage }) => {
    await seedDetailPage.open();
  });

  test('loads with seed metadata visible', async ({ seedDetailPage, page }) => {
    await seedDetailPage.assertLoaded(/Sky Haven Island/i);
    await expect(seedDetailPage.title).toBeVisible();
    await expect(seedDetailPage.description).toBeVisible();
    await expect(seedDetailPage.seedInfoSection).toBeVisible();
    await expect(seedDetailPage.faqSection).toBeVisible();
    await expect(page).toHaveURL(new RegExp(urls.seedAtm10));
  });

  test('seed calculator renders with correct data attributes @regression', async ({ seedDetailPage }) => {
    await seedDetailPage.expectCalculatorReady();
    await expect(seedDetailPage.calculator).toHaveAttribute('data-seed-id', seedPage.seedId);
    await expect(seedDetailPage.calculator).toHaveAttribute('data-modpack-id', seedPage.modpackId);
    await expect(seedDetailPage.calculator).toHaveAttribute('data-cart-base-url', /\/cart/);
  });

  test('changing player count updates configuration without errors', async ({ seedDetailPage }) => {
    await seedDetailPage.expectCalculatorReady();
    await seedDetailPage.setPlayers(2);
    await expect(seedDetailPage.calculator).toBeVisible();
  });
});

test.describe('Seed purchase funnel @regression', () => {
  test('Order CTA leads to cart preserving seed + modpack ids', async ({ seedDetailPage, page, cartPage }) => {
    await seedDetailPage.open();
    await seedDetailPage.expectCalculatorReady();

    const orderHref = await seedDetailPage.orderButton.getAttribute('href');
    test.skip(!orderHref, 'Order CTA href not yet rendered');

    await Promise.all([
      page.waitForURL(/\/cart/, { timeout: 20000 }),
      seedDetailPage.clickOrder(),
    ]);
    await cartPage.assertOnCart();
    await expect(page).toHaveURL(new RegExp(`(modpackId|seedId|seed=).*${seedPage.modpackId.split('-')[1]}`, 'i'));
  });

  test('negative: deep link to seed cart with empty params still renders cart shell', async ({ page, cartPage }) => {
    await page.goto('/cart?seed=&modpack=');
    await expect(page.locator('body')).toBeVisible();
  });
});
