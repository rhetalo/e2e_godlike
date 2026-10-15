// spec: specs/games-catalog.md
// seed: tests/seed.spec.ts
import { test, expect } from '@playwright/test';

test.describe('"List of games" grid', () => {
  test('Click a game link opens its landing page', async ({ page }) => {
    // 1. Open the catalog page.
    await page.goto('https://godlike.host/game-servers-en/');

    // 2. Click "Rust" in the List of games.
    await page.locator('.seotext__body a[href$="/rust-server-hosting/"]').click();

    // 3. Read the H1 and URL.
    await expect(page).toHaveURL(/\/rust-server-hosting\/$/);
    await expect(page.locator('h1').first()).toContainText('Rust');

    // 4. Go back.
    await page.goBack();
    await expect(page).toHaveURL(/\/game-servers-en\/$/);
    await expect(page.locator('.seotext__body a')).toHaveCount(20);
  });
});
