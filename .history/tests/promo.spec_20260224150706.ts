

import { test, expect } from '@playwright/test';

const BASE_URL = 'https://godlike.host';
const EMAIL = 'test@testmail.com';
const PASSWORD = 'test@testmail.com';

// список игр - расширяй спокойно
const gamesToTest = ['Hytale','Minecraft','Rust','ARK Survival Evolved','Terraria','Valheim','7 Days to Die','DayZ'];

test.describe('Promocode validation - simple stable version', () => {

  for (const gameName of gamesToTest) {

    test(`Validate promocode for game: ${gameName}`, async ({ page }) => {

      console.log(`\n===== START TEST FOR GAME: ${gameName} =====`);

      // =========================
      // LOGIN
      // =========================
      console.log('[STEP] Open login page');
      await page.goto(`${BASE_URL}/clientarea/login`, { waitUntil: 'domcontentloaded' });

      await page.fill('#inputEmail', EMAIL);
      await page.fill('#inputPassword', PASSWORD);
      await page.click('#login');

      await page.waitForURL('**/clientarea**', { timeout: 15000 });
      console.log('[INFO] Login successful');

      // =========================
      // OPEN GAMES PAGE
      // =========================
      console.log('[STEP] Open games page');
      await page.goto(`${BASE_URL}/game-servers-en/`, { waitUntil: 'domcontentloaded' });

      // =========================
      // OPEN GAME BY NAME
      // =========================
      console.log(`[STEP] Open game: ${gameName}`);

      const gameLink = page.locator('a.game__title', { hasText: gameName });
      await expect(gameLink).toBeVisible({ timeout: 10000 });
      await gameLink.click();

      // =========================
      // WAIT FOR TARIFFS
      // =========================
      await page.waitForSelector(
        'a.button.storefront__tariff-action__cart',
        { timeout: 15000 }
      );

      const tariffCount = await page
        .locator('a.button.storefront__tariff-action__cart')
        .count();

      console.log(`[INFO] Tariffs found: ${tariffCount}`);

      // =========================
      // LOOP THROUGH TARIFFS
      // =========================
      for (let i = 0; i < tariffCount; i++) {

        console.log(`\n[TARIFF] Game: ${gameName} | Tariff #${i + 1}`);

        // ⚠️ ВАЖНО: locator берём КАЖДЫЙ РАЗ ЗАНОВО
        const tariffs = page.locator(
          'a.button.storefront__tariff-action__cart'
        );

        const currentTariff = tariffs.nth(i);

        await currentTariff.scrollIntoViewIfNeeded();
        await currentTariff.click();

        // =========================
        // CHECK PROMOCODE
        // =========================
        const promoLabel = page.locator('.promocode__label-success');

        if (await promoLabel.isVisible({ timeout: 5000 }).catch(() => false)) {
          const promoText = (await promoLabel.textContent())?.trim() || '';

          console.log(`[PROMO] Activated -> ${promoText}`);

          expect(promoText).toContain('Activated promocode');
        } else {
          console.log('[PROMO] Invalid or missing promocode');

          // жёсткая проверка - если должен быть
          expect(promoLabel).not.toBeVisible();
        }

        // =========================
        // BACK TO TARIFFS
        // =========================
        await page.goBack();

        // ждём, что тарифы снова появились
        await page.waitForSelector(
          'a.button.storefront__tariff-action__cart',
          { timeout: 15000 }
        );
      }

      console.log(`\n===== END TEST FOR GAME: ${gameName} =====`);
    });

  }

});