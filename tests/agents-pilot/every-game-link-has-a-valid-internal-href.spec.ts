// spec: specs/games-catalog.md
// seed: tests/seed.spec.ts
import { test, expect } from '@playwright/test';

test.describe('"List of games" grid', () => {
  test('Every game link has a valid internal href', async ({ page }) => {
    await page.goto('https://godlike.host/game-servers-en/');

    // 1. Collect hrefs of all links in the list.
    const hrefs = await page.locator('.seotext__body a').evaluateAll((as) =>
      as.map((a) => (a as HTMLAnchorElement).getAttribute('href') ?? ''),
    );
    expect(hrefs.length).toBeGreaterThanOrEqual(20);

    // 2. Check each.
    for (const href of hrefs) {
      expect(href).not.toBe('');
      expect(href).not.toBe('#');
      expect(new URL(href, 'https://godlike.host').hostname).toBe('godlike.host');
    }
    // Unique (Minecraft -> home page is the only allowed single entry anyway)
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
