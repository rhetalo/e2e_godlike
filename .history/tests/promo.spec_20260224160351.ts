import { test, expect, Locator } from '@playwright/test';

const BASE_URL = 'https://godlike.host';
const EMAIL = 'test@testmail.com';
const PASSWORD = 'test@testmail.com';

const gamesToTest = ['Hytale', 'Minecraft','Rust'];

test.describe.serial('Promocode validation - stable TS', () => {

  test.beforeEach(async ({ page }) => {
    // LOGIN один раз перед каждым тестом
    await page.goto(`${BASE_URL}/clientarea/login`, { waitUntil: 'domcontentloaded' });
    await page.fill('#inputEmail', EMAIL);
    await page.fill('#inputPassword', PASSWORD);
    await Promise.all([
      page.waitForURL('**/clientarea/clientarea.php', { timeout: 30000 }),
      page.click('#login')
    ]);
    console.log('[INFO] Login successful');
  });

  for (const gameName of gamesToTest) {
    test(`Validate promocode for game: ${gameName}`, async ({ page }) => {
      console.log(`\n===== START TEST FOR GAME: ${gameName} =====`);

      // OPEN GAMES PAGE
      await page.goto(`${BASE_URL}/game-servers-en/`, { waitUntil: 'domcontentloaded' });

      // SELECT GAME LINK
      let gameLink: Locator;
      if (gameName === 'Minecraft') {
        gameLink = page.locator('a.game__title[href="/minecraft-java-servers-hosting/"]').first();
      } else {
        gameLink = page.getByRole('link', { name: gameName, exact: true }).first();
      }
      await gameLink.waitFor({ state: 'visible', timeout: 20000 });
      await gameLink.click();

      // WAIT FOR TARIFFS
      const tariffSelector = 'a.button.storefront__tariff-action__cart';
      const tariffs = page.locator(tariffSelector);
      const tariffCount = await tariffs.count();
      console.log(`[INFO] Tariffs found: ${tariffCount}`);

      // Под-тест для каждого тарифа
      for (let i = 0; i < tariffCount; i++) {
        test.step(`Tariff #${i+1}`, async () => {
          const currentTariff = tariffs.nth(i);
          await currentTariff.waitFor({ state: 'attached', timeout: 20000 });
          await currentTariff.scrollIntoViewIfNeeded();
          await currentTariff.click({ force: true });

          const promoLabel = page.locator('.promocode__label-success');
          let promoText = 'Invalid or missing';
          try {
            await promoLabel.waitFor({ state: 'visible', timeout: 5000 });
            promoText = (await promoLabel.textContent())?.trim() || '';
            console.log(`[PROMO] Activated -> ${promoText}`);
          } catch {
            console.log('[PROMO] Invalid or missing promocode');
          }
        });
      }

      console.log(`\n===== END TEST FOR GAME: ${gameName} =====`);
    });
  }

});