import { test, expect, Locator } from '@playwright/test';

const BASE_URL = 'https://godlike.host';
const EMAIL = 'test@testmail.com';
const PASSWORD = 'test@testmail.com';

const gamesToTest = ['Hytale', 'Minecraft', 'Rust'];

test.describe('Promocode validation - stable TS', () => {

  for (const gameName of gamesToTest) {

    test(`Validate promocode for game: ${gameName}`, async ({ page }) => {
      console.log(`\n===== START TEST FOR GAME: ${gameName} =====`);

      // -------------------------
      // LOGIN
      // -------------------------
      await page.goto(`${BASE_URL}/clientarea/login`, { waitUntil: 'domcontentloaded' });
      await page.fill('#inputEmail', EMAIL);
      await page.fill('#inputPassword', PASSWORD);
      await Promise.all([
        page.waitForURL('**/clientarea/clientarea.php', { timeout: 15000 }),
        page.click('#login')
      ]);
      console.log('[INFO] Login successful');

      // -------------------------
      // OPEN GAMES PAGE
      // -------------------------
      await page.goto(`${BASE_URL}/game-servers-en/`, { waitUntil: 'domcontentloaded' });

      // -------------------------
      // SELECT GAME LINK
      // -------------------------
      let gameLink: Locator;
      if (gameName === 'Minecraft') {
        gameLink = page.locator('a.game__title[href="/minecraft-java-servers-hosting/"]').first();
      } else if (gameName === 'Minecraft Bedrock') {
        gameLink = page.locator('a.game__title[href="/minecraft-bedrock-servers-hosting/"]').first();
      } else {
        gameLink = page.getByRole('link', { name: gameName, exact: true }).first();
      }

      await expect(gameLink).toBeVisible({ timeout: 10000 });
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
        gameLink.click()
      ]);

      // -------------------------
      // WAIT FOR TARIFFS
      // -------------------------
      const tariffSelector = 'a.button.storefront__tariff-action__cart';
      await page.waitForSelector(tariffSelector, { timeout: 15000 });
      const tariffCount = await page.locator(tariffSelector).count();
      console.log(`[INFO] Tariffs found: ${tariffCount}`);

      // -------------------------
      // LOOP THROUGH TARIFFS
      // -------------------------
      const results: Array<{ tariff: number; promocode: string }> = [];

      for (let i = 0; i < tariffCount; i++) {
        const tariffs = page.locator(tariffSelector);
        const currentTariff: Locator = tariffs.nth(i);

        console.log(`\n[TARIFF] Game: ${gameName} | Tariff #${i + 1}`);

        await currentTariff.scrollIntoViewIfNeeded();
        await currentTariff.click({ force: true });

        // -------------------------
        // CHECK PROMOCODE
        // -------------------------
        // Ждём появления промокода в блоке тарифа или модальном окне
        const promoLabel = page.locator('.promocode__label-success');
        let promoText = 'Invalid or missing';

        if (await promoLabel.waitFor({ state: 'visible', timeout: 5000 }).catch(() => false)) {
          promoText = (await promoLabel.textContent())?.trim() || '';
          console.log(`[PROMO] Activated -> ${promoText}`);
        } else {
          console.log('[PROMO] Invalid or missing promocode');
        }

        results.push({ tariff: i + 1, promocode: promoText });

        // -------------------------
        // BACK TO TARIFFS
        // -------------------------
        await page.goBack();
        await page.waitForSelector(tariffSelector, { timeout: 15000 });
      }

      // -------------------------
      // PRINT RESULTS
      // -------------------------
      console.log('\nRESULTS TABLE:');
      console.table(results.map(r => ({ 'Tariff #': r.tariff, Promocode: r.promocode })));

      console.log(`\n===== END TEST FOR GAME: ${gameName} =====`);
    });

  }

});