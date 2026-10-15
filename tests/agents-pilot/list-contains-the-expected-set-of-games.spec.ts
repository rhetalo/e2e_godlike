// spec: specs/games-catalog.md
// seed: tests/seed.spec.ts
import { test, expect } from '@playwright/test';

test.describe('"List of games" grid', () => {
  test('List contains the expected set of games', async ({ page }) => {
    // 1. Open the page and locate the "List of games" section.
    await page.goto('https://godlike.host/game-servers-en/');
    // Heading is attached but collapsed (0 height) in a seotext block, so getByRole ignores it; use a CSS locator.
    await expect(page.locator('h2', { hasText: 'List of games' })).toBeAttached();

    // 2. Collect link texts.
    const links = page.locator('.seotext__body a');
    const names = (await links.allTextContents()).map((t) => t.trim());

    expect(names.length).toBeGreaterThanOrEqual(20);
    for (const n of names) expect(n).not.toBe('');
    expect(new Set(names).size).toBe(names.length);
    for (const core of ['Rust', 'ARK Survival Evolved', 'Minecraft', 'FiveM', 'Valheim']) {
      expect(names).toContain(core);
    }
  });
});
