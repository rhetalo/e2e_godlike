['Hytale','Minecraft','Rust','ARK Survival Evolved','Terraria','Valheim','7 Days to Die','DayZ']

import { test, expect } from '@playwright/test';

const BASE_URL = 'https://godlike.host';
const EMAIL = 'test@testmail.com';
const PASSWORD = 'test@testmail.com';

// Список игр - можно расширять
const gamesToTest = ['Hytale','Minecraft','Rust','ARK Survival Evolved','Terraria','Valheim','7 Days to Die','DayZ'];

test.describe('Promocode validation (simple test, no POM)', () => {

  for (const gameName of gamesToTest) {

    test(`Validate promocode for game: ${gameName}`, async ({ page }) => {

      console.log(`\n[TEST START] Game: ${gameName}`);

      // =====================
      // LOGIN
      // =====================
      console.log('[STEP] Open login page');
      await page.goto(`${BASE_URL}/clientarea/login`);

      await page.fill('#inputEmail', EMAIL);
      await page.fill('#inputPassword', PASSWORD);
      await page.click('#login');

      await page.waitForURL('**/clientarea**');
      console.log('[INFO] Login successful');

      // =====================
      // OPEN GAMES PAGE
      // =====================
      console.log('[STEP] Open games page');
      await page.goto(`${BASE_URL}/game-servers-en/`);

      // =====================
      // OPEN GAME BY NAME
      // =====================
      console.log(`[STEP] Open game: ${gameName}`);

      const gameLink = page.locator('a.game__title', { hasText: gameName });
      await expect(gameLink).toBeVisible();
      await gameLink.click();

      // =====================
      // GET ALL TARIFFS
      // =====================
      const tariffs = page.locator('a.button.storefront__tariff-action__cart');
      const tariffCount = await tariffs.count();

      console.log(`[INFO] Found ${tariffCount} tariffs`);

      // =====================
      // LOOP THROUGH TARIFFS
      // =====================
      for (let i = 0; i < tariffCount; i++) {

        console.log(`\n[TARIFF] Game: ${gameName} | Tariff #${i + 1}`);

        await tariffs.nth(i).click();

        // =====================
        // CHECK PROMOCODE STATUS
        // =====================
        let promoStatusText = '';
        let promoCodeText = '';

        const promoLabel = page.locator('.promocode__label-success');

        if (await promoLabel.isVisible()) {
          promoStatusText = await promoLabel.textContent() || '';
          promoCodeText = promoStatusText.trim();

          console.log(`[PROMO] Activated: ${promoCodeText}`);

          expect(promoCodeText).toContain('Activated promocode');
        } else {
          console.log('[PROMO] Invalid or missing promocode');

          expect(promoLabel).not.toBeVisible();
        }

        // =====================
        // GO BACK TO TARIFFS
        // =====================
        await page.goBack();
      }

      console.log(`\n[TEST END] Game: ${gameName}`);
    });

  }

});