// spec: specs/games-catalog-native.md
// seed: tests/seed.spec.ts
import type { Page } from "@playwright/test";
import { test, expect } from "../../fixtures/base";
import { GameStorefrontPage } from "../../pages/GameStorefrontPage";

// TODO selector: поиск и карточки сетки не вынесены в utils/selectors.ts / GameStorefrontPage.
// Live-recon 16-Oct-2026: поле `input.games__search-input` (placeholder "Search for games..."),
// карточки `.games__block .game` (скрытые поиском = display:none), имя = alt у `.game__image`.
const GRID = {
  search: "input.games__search-input",
  card: ".games__block .game",
  cardImage: ".game__image",
};

const visibleCards = (page: Page) => page.locator(GRID.card).locator("visible=true");
const visibleCount = (page: Page) => visibleCards(page).count();
const visibleNames = (page: Page) =>
  visibleCards(page).locator(GRID.cardImage).evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).alt));

test.describe("B. Games grid, filters and search", () => {
  test("B3 Поиск фильтрует сетку без учёта регистра и обрезает пробелы @regression", async ({ page }) => {
    const catalog = new GameStorefrontPage(page);
    const search = page.locator(GRID.search);
    let initial = 0;

    await test.step("Открыть каталог: видно не меньше 40 карточек", async () => {
      await catalog.open();
      await expect(search).toBeVisible();
      await expect(visibleCards(page).first()).toBeVisible();
      initial = await visibleCount(page);
      expect(initial).toBeGreaterThanOrEqual(40);
    });

    // 1. Type 'rust'
    await test.step("'rust': остаётся карточка Rust", async () => {
      await search.fill("rust");
      await expect.poll(() => visibleNames(page)).toContain("Rust");
      await expect.poll(() => visibleCount(page)).toBeLessThan(initial);
      await expect(visibleCards(page).locator(`${GRID.cardImage}[alt="Rust"]`)).toBeVisible();
    });

    // 2. Replace with '  ARK ' (spaces + upper case)
    await test.step("'  ARK ': остаются обе ARK-карточки, пробелы и регистр не мешают", async () => {
      await search.fill("  ARK ");
      await expect
        .poll(() => visibleNames(page))
        .toEqual(expect.arrayContaining(["ARK Survival Evolved", "ARK: Survival Ascended"]));
      const names = await visibleNames(page);
      expect(names.length).toBeLessThan(initial);
      for (const name of names) expect(name.toLowerCase()).toContain("ark");
    });

    // 3. Clear the field
    await test.step("Очистка поля: сетка возвращается к исходному числу карточек", async () => {
      await search.fill("");
      await expect.poll(() => visibleCount(page)).toBe(initial);
    });
  });
});
