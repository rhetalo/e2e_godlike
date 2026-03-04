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
        page.waitForURL('**/clientarea/clientarea.php', { timeout: 30000 }),
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
      await expect(gameLink).toBeVisible({ timeout: 30000 });
      await gameLink.click();

      // -------------------------
      // WAIT FOR TARIFFS
      // -------------------------
      const tariffSelector = 'a.button.storefront__tariff-action__cart:has-text("Add to Cart")';
      let tariffs = page.locator(tariffSelector);
      await tariffs.first().waitFor({ state: 'visible', timeout: 30000 });

      const tariffCount = await tariffs.count();
      console.log(`[INFO] Tariffs found: ${tariffCount}`);

      // -------------------------
      // LOOP THROUGH TARIFFS
      // -------------------------
      for (let i = 0; i < tariffCount; i++) {
        const currentTariff = tariffs.nth(i);
        console.log(`\n[TARIFF] Game: ${gameName} | Tariff #${i + 1}`);

        // SCROLL + CLICK
        await currentTariff.scrollIntoViewIfNeeded();
        await currentTariff.click({ force: true });

        // -------------------------
        // WAIT FOR PROMOCODE TO APPEAR
        // -------------------------
        const promoLabel = page.locator('span.promocode__label-success');
        await promoLabel.waitFor({ state: 'visible', timeout: 20000 }); // гарантированное ожидание

        const promoText = (await promoLabel.textContent())?.trim() || '';
        console.log(`[PROMO] Tariff #${i + 1}: ${promoText}`);

        // -------------------------
        // ASSERT VALIDITY
        // -------------------------
        expect(promoText.includes('Activated promocode:')).toBeTruthy();

        // -------------------------
        // BACK TO TARIFFS
        // -------------------------
        await page.goBack();
        tariffs = page.locator(tariffSelector); // пересоздаём локаторы после goBack
        await tariffs.first().waitFor({ state: 'visible', timeout: 30000 });
      }

      console.log(`\n===== END TEST FOR GAME: ${gameName} =====`);
    });

  }

});