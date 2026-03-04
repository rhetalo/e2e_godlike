import { test, expect } from '@playwright/test';
import gamesData from './data/games.json';

const games = gamesData.games;

test.describe('Promo validation per game', () => {

    for (const game of games) {
    test(`Validate promocode for game: ${game}`, async ({ page }) => {

        console.log(`===== START TEST FOR GAME: ${game} =====`);

      // 1. Открыть главную
        await page.goto('https://godlike.host/', { waitUntil: 'domcontentloaded' });

      // 2. Поиск игры
        const searchInput = page.locator('input[placeholder*="Search"]');
        await searchInput.fill(game);

        const gameCard = page.locator(`text=${game}`).first();
        await expect(gameCard).toBeVisible({ timeout: 15_000 });
        await gameCard.click();

      // 3. Ожидание перехода на страницу игры
      await page.waitForLoadState('domcontentloaded', { timeout: 40_000 });

      // 4. Проверка тарифов
        const tariffSelector =
        'a.button.storefront__tariff-action__cart:has-text("Add to Cart")';

        const tariffs = page.locator(tariffSelector);
        await tariffs.first().waitFor({ state: 'visible', timeout: 40_000 });
        await expect(tariffs.first()).toBeVisible({ timeout: 40_000 });

        const tariffCount = await tariffs.count();
        console.log(`[INFO] Tariffs found for ${game}: ${tariffCount}`);

        expect(tariffCount).toBeGreaterThan(0);

        console.log(`===== END TEST FOR GAME: ${game} =====`);
    });
    }
});