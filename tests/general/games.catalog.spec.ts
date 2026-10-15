/**
 * Storefront — каталог игр /game-servers-en/, блок «List of games».
 *
 * Пилот Playwright Test Agents (15-Oct-2026): план — specs/games-catalog.md (Planner), черновики —
 * tests/agents-pilot/ (Generator + Healer). Этот файл — те же сценарии 2.1/2.2/2.4/2.5, приведённые
 * к конвенциям репо: fixtures/base (гасит баннеры), PO GameStorefrontPage, селекторы из selectors.ts,
 * данные из test-data, структурные проверки (список может расти), URL — regex (прод дописывает ?rtkcid=…).
 *
 * Read-only: только навигация по ссылкам на лендинги, корзину не трогаем.
 */
import { test, expect } from "../../fixtures/base";
import { GameStorefrontPage } from "../../pages/GameStorefrontPage";
import { GamesCatalog, Urls } from "../../fixtures/test-data";

test.describe("[storefront] Каталог игр — List of games", () => {
  test("@regression TC-GAMES-001 | список содержит игры: не меньше минимума, имена уникальны, ядро на месте", async ({ page }) => {
    const catalog = new GameStorefrontPage(page);
    await catalog.open();
    const entries = await catalog.gamesListEntries();
    const names = entries.map((e) => e.name);

    await test.step(`ссылок не меньше ${GamesCatalog.minLinks}, имена непустые и уникальные`, async () => {
      expect(entries.length).toBeGreaterThanOrEqual(GamesCatalog.minLinks);
      expect(names.every((n) => n.length > 0)).toBe(true);
      expect(new Set(names).size).toBe(names.length);
    });

    await test.step("ключевые игры присутствуют", async () => {
      expect(names).toEqual(expect.arrayContaining([...GamesCatalog.coreGames]));
    });
  });

  test("@regression TC-GAMES-002 | у каждой игры внутренняя уникальная ссылка", async ({ page }) => {
    const catalog = new GameStorefrontPage(page);
    await catalog.open();
    const entries = await catalog.gamesListEntries();

    await test.step("href непустой, не '#', ведёт на тот же домен", async () => {
      for (const { name, href } of entries) {
        expect(href, name).not.toMatch(/^(#.*)?$/);
        expect(new URL(href, page.url()).hostname, name).toBe(new URL(page.url()).hostname);
      }
    });

    await test.step("ссылки не повторяются", async () => {
      const hrefs = entries.map((e) => new URL(e.href, page.url()).pathname);
      expect(new Set(hrefs).size).toBe(hrefs.length);
    });
  });

  test(`@regression TC-GAMES-003 | клик по ${GamesCatalog.sample.name} открывает лендинг игры, «Назад» возвращает в каталог`, async ({ page }) => {
    const catalog = new GameStorefrontPage(page);
    await catalog.open();

    await test.step(`клик → лендинг ${GamesCatalog.sample.name}`, async () => {
      await catalog.openGameFromList(GamesCatalog.sample.name);
      await expect(page).toHaveURL(GamesCatalog.sample.landing);
      await expect(catalog.pageHeading()).toContainText(GamesCatalog.sample.name);
    });

    await test.step("назад → каталог со списком", async () => {
      await page.goBack();
      await expect(page).toHaveURL(new RegExp(Urls.gameServers));
      await expect(catalog.gamesListLinks.first()).toBeVisible();
    });
  });

  test("@regression TC-GAMES-004 | Minecraft в списке ведёт на главную (Minecraft-витрина)", async ({ page }) => {
    const catalog = new GameStorefrontPage(page);
    await catalog.open();

    await test.step("клик Minecraft → главная с H1 про Minecraft", async () => {
      await catalog.openGameFromList(GamesCatalog.minecraft.name);
      await expect(page).toHaveURL(GamesCatalog.minecraft.landing);
      await expect(catalog.pageHeading()).toContainText(GamesCatalog.minecraft.name);
    });
  });
});
