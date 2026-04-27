import { test, expect } from "../fixtures/pages";
import { moddedHosting, urls } from "../fixtures/testData";

test.describe('Modded Minecraft Hosting page @smoke', () => {
  test.beforeEach(async ({ moddedHostingPage }) => {
    await moddedHostingPage.open();
  });

  test('loads with correct title and key sections', async ({ moddedHostingPage, page }) => {
    await moddedHostingPage.assertLoaded(/Modded Minecraft Server Hosting/i);
    await expect(moddedHostingPage.heroHeading).toBeVisible();
    await expect(moddedHostingPage.planCalculator).toBeVisible();
    await expect(moddedHostingPage.faqSection).toBeVisible();
    await moddedHostingPage.footer.assertVisible();
    await expect(page).toHaveURL(new RegExp(urls.moddedHosting));
  });

  test('renders all expected modpack tiles', async ({ page }) => {
    for (const name of moddedHosting.expectedModpacks) {
      await expect(page.getByText(name, { exact: false }).first()).toBeVisible();
    }
  });

  test('Order Now CTA points to /cart-modded-new/ with required params @regression', async ({ moddedHostingPage }) => {
    const href = await moddedHostingPage.getOrderUrl();
    expect(href).toContain('/cart-modded-new/');
    expect(href).toMatch(/productId=\d+/);
    expect(href).toMatch(/billingCycle=(monthly|quarterly|biannually|annually)/);
  });
});

test.describe('Modded hosting purchase funnel @regression', () => {
  test('clicking Order Now navigates to cart with modpack params', async ({ moddedHostingPage, page, cartPage }) => {
    await moddedHostingPage.open();
    const href = await moddedHostingPage.getOrderUrl();
    test.skip(!href, 'Order CTA not available on page');

    await Promise.all([
      page.waitForURL(/\/cart/, { timeout: 15000 }),
      moddedHostingPage.clickOrderNow(),
    ]);
    await cartPage.assertOnCart();
    await expect(page).toHaveURL(/productId=/);
  });

  test('negative: cart URL with invalid productId still loads cart shell without crashing', async ({ page, cartPage }) => {
    await page.goto('/cart-modded-new/?productId=999999&billingCycle=monthly');
    await expect(page.locator('body')).toBeVisible();
    await cartPage.assertOnCart();
  });
});
