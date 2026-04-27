import { test, expect } from '../../fixtures/pages';
import { urls } from '../../fixtures/testData';

test.describe('Cross-page navigation @smoke', () => {
  test('header link from modded hosting to minecraft seeds works', async ({ moddedHostingPage, page }) => {
    await moddedHostingPage.open();
    await moddedHostingPage.header.goToMinecraftSeeds();
    await expect(page).toHaveURL(new RegExp(urls.seedsList));
  });

  test('header link from seed detail to modded hosting works', async ({ seedDetailPage, page }) => {
    await seedDetailPage.open();
    await seedDetailPage.header.goToModdedHosting();
    await expect(page).toHaveURL(new RegExp(urls.moddedHosting));
  });

  test('footer is rendered with privacy + terms links', async ({ moddedHostingPage }) => {
    await moddedHostingPage.open();
    await moddedHostingPage.footer.assertVisible();
  });
});
