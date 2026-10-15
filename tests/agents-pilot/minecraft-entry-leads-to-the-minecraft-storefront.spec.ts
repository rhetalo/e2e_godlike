// spec: specs/games-catalog.md
// seed: tests/seed.spec.ts
import { test, expect } from '@playwright/test';

test.describe('"List of games" grid', () => {
  test('Minecraft entry leads to the Minecraft storefront', async ({ page }) => {
    await page.goto('https://godlike.host/game-servers-en/');

    // 1. Click "Minecraft" in the list.
    await page.locator('.seotext__body a:text-is("Minecraft")').click();

    // 2. Observe URL and H1.
    await expect(page).toHaveURL('https://godlike.host/');
    await expect(page.locator('h1').first()).toContainText('Minecraft');
  });
});
