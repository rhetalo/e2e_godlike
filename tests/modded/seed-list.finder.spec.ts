/**
 * seed-list.finder.spec.ts
 * ────────────────────────
 * Seed finder на странице СПИСКА сидов /minecraft-seeds/ (SeedFinder).
 *
 * ⚠️ recon 02-Oct-2026: прежний калькулятор тарифа (план/цена/слайдер/кастомный сид/CTA
 * «Create server» → /cart-seed) со страницы УДАЛЁН — старый seed-list.calculator.spec.ts
 * переписан сюда. Воронка /cart-seed покрыта на одиночной seed-странице (funnel.seed.spec.ts).
 *
 * Покрываем:
 *   - карточки: название → /minecraft-seeds/<slug>/, значение сида, «Open seed» = та же ссылка;
 *   - счётчик по mc-версии = число сидов этой версии в инлайн-конфиге страницы (оракул);
 *   - модпак-версия ATM10 даёт непустую выдачу;
 *   - редакция Java/Bedrock: подпись фильтра, выдача ⊆ «All», empty-state ⇔ 0;
 *   - тег фильтра: выдача сужается, у каждой карточки есть этот тег, «Clear» сбрасывает;
 *   - «Show more»/«Show less» пагинация;
 *   - «Copy seed» кладёт сид в буфер обмена; «Open seed» реально открывает страницу сида.
 *
 * Read-only. Числа сидов не хардкодим — контент меняется (сверяем с конфигом/инвариантами).
 */
import { test, expect } from "../../fixtures/base";
import { SeedListPage } from "../../pages/SeedListPage";

/** Версия с большой выдачей — чтобы фильтры редакции/тегов не упирались в пустой список. */
const WIDE_MC_VERSION = "mc:1.21";
const FILTER_SLUG = "village";

test.describe("Seed finder (/minecraft-seeds/)", () => {
  let seedList: SeedListPage;

  test.beforeEach(async ({ page }) => {
    seedList = new SeedListPage(page);
    await seedList.open();
  });

  test("@regression карточки сидов: ссылка на страницу сида + значение сида", async () => {
    const finder = seedList.finder;
    expect(await finder.readCount()).toBeGreaterThan(0);

    const cards = await finder.allCardInfo();
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      await test.step(`карточка «${card.title}»`, async () => {
        expect(card.title.length).toBeGreaterThan(0);
        expect(card.href).toMatch(/\/minecraft-seeds\/[^/]+\/?$/);
        expect(card.openHref).toBe(card.href);
        expect(card.seed).toMatch(/^-?\d+$/);
      });
    }
  });

  test("@critical счётчик по mc-версии совпадает с данными страницы; ATM10 непуст", async () => {
    const finder = seedList.finder;
    const values = await finder.versionValues();
    const mcValues = values.filter((v) => v.startsWith("mc:"));
    const mpValue = values.find((v) => v.startsWith("mp:"));
    expect(mcValues.length, "в select нет mc-версий").toBeGreaterThan(0);

    // крайние версии списка: самая старая и самая новая
    for (const value of [mcValues[0], mcValues[mcValues.length - 1]]) {
      await test.step(`${value}: счётчик = сиды этой версии в конфиге`, async () => {
        await finder.selectVersion(value);
        const expected = await finder.configCountForMcVersion(value.slice("mc:".length));
        expect(expected, "нет window.GodlikeNewSeedCalculator").toBeGreaterThanOrEqual(0);
        await expect.poll(() => finder.readCount()).toBe(expected);
      });
    }

    await test.step("модпак-версия (ATM10) даёт непустую выдачу", async () => {
      expect(mpValue, "в select нет модпак-версий (mp:…)").toBeTruthy();
      await finder.selectVersion(mpValue!);
      await expect.poll(() => finder.readCount()).toBeGreaterThan(0);
      await expect(finder.cards().first()).toBeVisible();
    });
  });

  test("@regression редакция Java/Bedrock сужает выдачу, empty-state ⇔ 0", async () => {
    const finder = seedList.finder;
    await finder.selectVersion(WIDE_MC_VERSION);
    const all = await finder.readCount();
    expect(all).toBeGreaterThan(0);

    for (const edition of ["Java", "Bedrock"] as const) {
      await test.step(`редакция ${edition}`, async () => {
        await finder.selectEdition(edition);
        await expect(finder.editionButton(edition)).toHaveAttribute("aria-pressed", "true");
        await expect.poll(() => finder.readMeta()).toBe(edition);
        await expect(finder.clearButton()).toBeVisible();

        const count = await finder.readCount();
        expect(count).toBeLessThanOrEqual(all);
        // инвариант: empty-state показан ⇔ счётчик 0 ⇔ карточек нет
        expect(await finder.emptyState().isVisible(), "empty-state ⇔ 0").toBe(count === 0);
        expect((await finder.cards().count()) > 0, "карточки ⇔ count > 0").toBe(count > 0);
      });
    }

    await test.step("All возвращает полную выдачу", async () => {
      await finder.selectEdition("");
      await expect.poll(() => finder.readCount()).toBe(all);
      await expect(finder.clearButton()).toBeHidden();
    });
  });

  test("@critical тег фильтра сужает выдачу, «Clear» сбрасывает", async () => {
    const finder = seedList.finder;
    await finder.selectVersion(WIDE_MC_VERSION);
    const before = await finder.readCount();
    const label = await finder.filterTagLabel(FILTER_SLUG);

    await finder.toggleFilterTag(FILTER_SLUG);

    await test.step(`тег «${label}» активен, выдача ⊆ исходной`, async () => {
      await expect(finder.filterTag(FILTER_SLUG)).toHaveAttribute("aria-pressed", "true");
      await expect.poll(() => finder.readMeta()).toMatch(/1 filter/i);
      const count = await finder.readCount();
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThanOrEqual(before);
    });

    await test.step(`у каждой показанной карточки есть тег «${label}»`, async () => {
      const cards = await finder.allCardInfo();
      expect(cards.length).toBeGreaterThan(0);
      for (const card of cards) expect(card.tags, card.title).toContain(label);
    });

    await test.step("«Clear» снимает фильтр и возвращает выдачу", async () => {
      await finder.clearFilters();
      await expect(finder.filterTag(FILTER_SLUG)).toHaveAttribute("aria-pressed", "false");
      await expect.poll(() => finder.readCount()).toBe(before);
      await expect(finder.clearButton()).toBeHidden();
    });
  });

  test("@regression «Show more» догружает карточки, «Show less» сворачивает", async () => {
    const finder = seedList.finder;
    await finder.selectVersion(WIDE_MC_VERSION);
    const total = await finder.readCount();
    const shown = await finder.cards().count();
    test.skip(total <= shown, `все ${total} сидов уже показаны — пагинации нет`);

    await test.step("до клика: «Show more (N)» = total - показанные", async () => {
      expect(await finder.readRemaining()).toBe(total - shown);
    });

    await test.step("«Show more» добавляет карточки и уменьшает остаток", async () => {
      await finder.showMore();
      await expect.poll(() => finder.cards().count()).toBeGreaterThan(shown);
      const nowShown = await finder.cards().count();
      expect(await finder.readRemaining()).toBe(total - nowShown);
      await expect(finder.lessButton()).toBeVisible();
    });

    await test.step("«Show less» возвращает исходное число карточек", async () => {
      await finder.showLess();
      await expect(finder.cards()).toHaveCount(shown);
    });
  });

  test("@regression «Copy seed» кладёт значение сида в буфер обмена", async ({ page }) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    const { seed } = await seedList.finder.cardInfo(0);

    await seedList.finder.copySeed(0);

    await expect.poll(() => seedList.finder.readClipboard()).toBe(seed);
  });

  test("@regression «Open seed» открывает страницу этого сида", async ({ page }) => {
    const { href } = await seedList.finder.cardInfo(0);

    await Promise.all([
      page.waitForURL(/\/minecraft-seeds\/[^/]+\/?$/, { timeout: 30_000 }),
      seedList.finder.openSeed(0),
    ]);

    expect(page.url()).toBe(href);
  });
});
