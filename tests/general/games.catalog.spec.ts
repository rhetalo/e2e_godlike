/**
 * Storefront — каталог игр /game-servers-en/, блок «List of games».
 *
 * Пилот Playwright Test Agents (15-Oct-2026): план — specs/games-catalog.md (Planner), черновики —
 * tests/agents-pilot/ (Generator + Healer). Этот файл — те же сценарии 2.1/2.2/2.4/2.5, приведённые
 * к конвенциям репо: fixtures/base (гасит баннеры), PO GameStorefrontPage, селекторы из selectors.ts,
 * данные из test-data, структурные проверки (список может расти), URL — regex (прод дописывает ?rtkcid=…).
 *
 * Блок B (16-Oct-2026): сетка карточек - фильтры PC/Mobile/Console и поиск (черновики B2/B3
 * из agents-pilot, перенесены сюда). Считаем только ВИДИМЫЕ карточки: скрытые остаются в DOM.
 *
 * Read-only: только навигация по ссылкам на лендинги и клики по фильтрам, корзину не трогаем.
 */
import { test, expect } from "../../fixtures/base";
import { GameStorefrontPage, type GridFilter } from "../../pages/GameStorefrontPage";
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

test.describe("[storefront] Каталог игр — сетка, фильтры и поиск", () => {
  const { grid } = GamesCatalog;

  test("@regression TC-GAMES-005 | фильтры PC / Mobile / Console сужают сетку, View All возвращает её", async ({ page }) => {
    const catalog = new GameStorefrontPage(page);
    const counts: Partial<Record<GridFilter | "initial", number>> = {};

    const applyFilter = async (name: GridFilter) => {
      await catalog.applyGridFilter(name);
      await expect(catalog.gridFilterButton(name)).toHaveClass(/active/);
    };

    await test.step(`открыть каталог: под View All не меньше ${grid.minCards} карточек`, async () => {
      await catalog.open();
      await expect(catalog.visibleGridCards.first()).toBeVisible();
      counts.initial = await catalog.visibleGridCount();
      expect(counts.initial).toBeGreaterThanOrEqual(grid.minCards);
    });

    await test.step("PC: карточек не больше, чем под View All, и не ноль", async () => {
      await applyFilter("pc");
      await expect.poll(() => catalog.visibleGridCount()).toBeLessThanOrEqual(counts.initial!);
      counts.pc = await catalog.visibleGridCount();
      expect(counts.pc).toBeGreaterThan(0);
    });

    await test.step(`Mobile: не больше PC, среди карточек ${grid.mobileGames.join(", ")}`, async () => {
      await applyFilter("mobile");
      await expect.poll(() => catalog.visibleGridCount()).toBeLessThanOrEqual(counts.pc!);
      counts.mobile = await catalog.visibleGridCount();
      for (const name of grid.mobileGames) await expect(catalog.visibleGridCard(name)).toBeVisible();
    });

    await test.step("Console: не больше Mobile (пустая сетка допустима)", async () => {
      await applyFilter("console");
      await expect.poll(() => catalog.visibleGridCount()).toBeLessThanOrEqual(counts.mobile!);
    });

    await test.step("View All: сетка возвращается к исходному числу карточек", async () => {
      await applyFilter("all");
      await expect.poll(() => catalog.visibleGridCount()).toBe(counts.initial);
    });
  });

  test("@regression TC-GAMES-006 | поиск фильтрует сетку без учёта регистра и обрезает пробелы", async ({ page }) => {
    const catalog = new GameStorefrontPage(page);
    const { single, multi } = grid.search;
    let initial = 0;

    await test.step(`открыть каталог: поиск виден, карточек не меньше ${grid.minCards}`, async () => {
      await catalog.open();
      await expect(catalog.gridSearchInput).toBeVisible();
      await expect(catalog.visibleGridCards.first()).toBeVisible();
      initial = await catalog.visibleGridCount();
      expect(initial).toBeGreaterThanOrEqual(grid.minCards);
    });

    await test.step(`'${single.query}': сетка сузилась, карточка ${single.expected} видна`, async () => {
      await catalog.searchGrid(single.query);
      await expect.poll(() => catalog.visibleGridNames()).toContain(single.expected);
      await expect.poll(() => catalog.visibleGridCount()).toBeLessThan(initial);
      await expect(catalog.visibleGridCard(single.expected)).toBeVisible();
    });

    await test.step(`'${multi.query}': пробелы и регистр не мешают, все карточки про ${multi.needle}`, async () => {
      await catalog.searchGrid(multi.query);
      await expect.poll(() => catalog.visibleGridNames()).toEqual(expect.arrayContaining([...multi.expected]));
      const names = await catalog.visibleGridNames();
      expect(names.length).toBeLessThan(initial);
      for (const name of names) expect(name.toLowerCase(), name).toContain(multi.needle);
    });

    await test.step("очистка поля: сетка возвращается к исходному числу карточек", async () => {
      await catalog.searchGrid("");
      await expect.poll(() => catalog.visibleGridCount()).toBe(initial);
    });
  });
});
