import { test, expect, Locator } from '@playwright/test';

const BASE_URL = 'https://godlike.host';
const EMAIL = 'test@testmail.com';
const PASSWORD = 'test@testmail.com';

const gamesToTest = ['Hytale', 'Minecraft', 'Minecraft Bedrock', 'Rust'];

test.describe('Promocode validation - full stable version', () => {

  for (const gameName of gamesToTest) {

    test(`Validate promocode for game: ${gameName}`, async ({ page }) => {
      console.log(`\n===== START TEST FOR GAME: ${gameName} =====`);

      // LOGIN
      console.log('[STEP] Open login page');
      await page.goto(`${BASE_URL}/clientarea/login`, { waitUntil: 'domcontentloaded' });
      await page.fill('#inputEmail', EMAIL);
      await page.fill('#inputPassword', PASSWORD);
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
        page.click('#login')
      ]);
      console.log('[INFO] Login successful');

      // OPEN GAMES PAGE
      console.log('[STEP] Open games page');
      await page.goto(`${BASE_URL}/game-servers-en/`, { waitUntil: 'domcontentloaded' });

      // OPEN GAME BY NAME
      console.log(`[STEP] Open game: ${gameName}`);
      let gameLink: Locator;

      if (gameName === 'Minecraft') {
        gameLink = page.locator('a.game__title[href="/minecraft-java-servers-hosting/"]');
      } else if (gameName === 'Minecraft Bedrock') {
        gameLink = page.locator('a.game__title[href="/minecraft-bedrock-servers-hosting/"]');
      } else {
        gameLink = page.getByRole('link', { name: gameName, exact: true });
      }

      await expect(gameLink.first()).toBeVisible({ timeout: 10000 });
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), gameLink.first().click()]);

      // WAIT FOR TARIFFS
      const tariffSelector = 'a.button.storefront__tariff-action__cart';
      await page.waitForSelector(tariffSelector, { timeout: 15000 });

      const tariffCount = await page.locator(tariffSelector).count();
      console.log(`[INFO] Tariffs found: ${tariffCount}`);

      // RESULTS TABLE
      const results: Array<{ tariff: number; promocode: string }> = [];

      // LOOP THROUGH TARIFFS
      for (let i = 0; i < tariffCount; i++) {
        console.log(`\n[TARIFF] Game: ${gameName} | Tariff #${i + 1}`);

        const tariffs = page.locator(tariffSelector);
        const currentTariff: Locator = tariffs.nth(i);

        await currentTariff.scrollIntoViewIfNeeded();
        await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), currentTariff.click()]);

        // CHECK PROMOCODE
        const promoLabel: Locator = page.locator('.promocode__label-success');
        let promoText = '';

        if (await promoLabel.isVisible({ timeout: 5000 }).catch(() => false)) {
          promoText = (await promoLabel.textContent())?.trim() || '';
          console.log(`[PROMO] Activated -> ${promoText}`);
        } else {
          promoText = 'Invalid or missing';
          console.log('[PROMO] Invalid or missing promocode');
        }

        results.push({ tariff: i + 1, promocode: promoText });

        // BACK TO TARIFFS
        await page.goBack();
        await page.waitForSelector(tariffSelector, { timeout: 15000 });
      }

      // PRINT RESULTS TABLE
      console.log('\nRESULTS TABLE:');
      console.table(results.map(r => ({ 'Tariff #': r.tariff, Promocode: r.promocode })));

      console.log(`\n===== END TEST FOR GAME: ${gameName} =====`);
    });

  }

});