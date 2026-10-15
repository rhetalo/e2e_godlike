// spec: specs/games-catalog-native.md
// seed: tests/seed.spec.ts
import type { Page } from "@playwright/test";
import { test, expect } from "../../fixtures/base";
import { GameStorefrontPage } from "../../pages/GameStorefrontPage";

// TODO selector: сетка каталога и фильтры не вынесены в utils/selectors.ts / GameStorefrontPage.
// Live-recon 16-Oct-2026: фильтры `.games__filter-btn[data-filter=all|pc|mobile|console]`,
// карточки `.games__block .game` (скрытые фильтром = display:none), имя карточки = alt у `.game__image`.
// При переносе из agents-pilot: перенести в STOREFRONT + методы в GameStorefrontPage.
const GRID = {
  filter: (name: "all" | "pc" | "mobile" | "console") => `.games__filter-btn[data-filter="${name}"]`,
  card: ".games__block .game",
  cardImage: ".game__image",
};

/** Видимые пользователю карточки (скрытые фильтром display:none не считаются). */
const visibleCards = (page: Page) => page.locator(GRID.card).locator("visible=true");

async function visibleCount(page: Page): Promise<number> {
  return visibleCards(page).count();
}

async function applyFilter(page: Page, name: "all" | "pc" | "mobile" | "console") {
  await page.locator(GRID.filter(name)).click();
  await expect(page.locator(GRID.filter(name))).toHaveClass(/active/);
}

test.describe("B. Games grid, filters and search", () => {
  test("B2 Фильтры PC / Mobile / Console сужают сетку, View All возвращает её @regression", async ({ page }) => {
    const catalog = new GameStorefrontPage(page);
    const counts: Record<string, number> = {};

    // 1. Click PC, then Mobile, then Console, then View All; count visible cards each time
    await test.step("Открыть каталог: под View All видно не меньше 40 карточек", async () => {
      await catalog.open();
      await expect(visibleCards(page).first()).toBeVisible();
      counts.initial = await visibleCount(page);
      expect(counts.initial).toBeGreaterThanOrEqual(40);
    });

    await test.step("PC: карточек не больше, чем под View All", async () => {
      await applyFilter(page, "pc");
      await expect.poll(() => visibleCount(page)).toBeLessThanOrEqual(counts.initial);
      counts.pc = await visibleCount(page);
      expect(counts.pc).toBeGreaterThan(0);
    });

    await test.step("Mobile: не больше PC, среди карточек Minecraft Bedrock и Terraria", async () => {
      await applyFilter(page, "mobile");
      await expect.poll(() => visibleCount(page)).toBeLessThanOrEqual(counts.pc);
      counts.mobile = await visibleCount(page);
      await expect(visibleCards(page).locator(`${GRID.cardImage}[alt="Minecraft Bedrock"]`)).toBeVisible();
      await expect(visibleCards(page).locator(`${GRID.cardImage}[alt="Terraria"]`)).toBeVisible();
    });

    await test.step("Console: не больше Mobile (пустая сетка допустима)", async () => {
      await applyFilter(page, "console");
      await expect.poll(() => visibleCount(page)).toBeLessThanOrEqual(counts.mobile);
    });

    // expect: After View All count equals the initial count
    await test.step("View All: сетка возвращается к исходному числу карточек", async () => {
      await applyFilter(page, "all");
      await expect.poll(() => visibleCount(page)).toBe(counts.initial);
    });
  });
});
