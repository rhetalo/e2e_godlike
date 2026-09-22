/**
 * seed-list.calculator.spec.ts
 * ────────────────────────────
 * Новый кастомный калькулятор на странице СПИСКА сидов /minecraft-seeds/ (NewSeedCalculator).
 * НЕ Vuetify-калькулятор одиночной seed-страницы (см. slider.seed.spec.ts).
 *
 * Покрываем:
 *   - поля калькулятора: версия заполняет план/RAM/цену/игроков + CTA «Create server»;
 *   - слайдер меняет предлагаемый тариф (план/цена/игроки + productId в URL);
 *   - кастомный сид → summary + seedId в URL корзины;
 *   - seed-чипы = ссылки на страницы сидов (клик уводит на /minecraft-seeds/<seed>/);
 *   - версия-модпак ATM10 → modpackId в URL + версия в summary; mc-версия → без modpackId;
 *   - реальный переход «Create server» → /cart-seed с productId+seedId.
 *
 * Готовый URL корзины калькулятор держит в CTA data-href (синхронно выбору) — проверяем его
 * без навигации; один тест делает реальный переход на воронку. Read-only, заказ не оформляем.
 *
 * ⚠️ recon 22-Sep-2026: блок выбора сида переделан. Выбор-сида-чипом (чип обновлял summary +
 * seedId) и поиск-дропдаун со страницы УДАЛЕНЫ; чип теперь <a> на страницу сида. Единственный
 * оставшийся способ положить seedId в корзину — кастомный сид (на нём и держится «Create server»).
 * Amplitude A/B пинится фикстурой base (иначе flash-sale-оверлей перехватывает клики).
 */
import { test, expect } from "../../fixtures/base";
import { SeedListPage } from "../../pages/SeedListPage";

/** Параметры URL корзины из data-href CTA. */
function cartParams(href: string): URLSearchParams {
  return new URL(href).searchParams;
}

test.describe("Новый seed-калькулятор (/minecraft-seeds/)", () => {
  let seedList: SeedListPage;

  test.beforeEach(async ({ page }) => {
    seedList = new SeedListPage(page);
    await seedList.open();
  });

  test("@regression поля калькулятора заполняются версией + CTA несёт productId", async () => {
    await seedList.calculator.selectGameVersion(0);

    await test.step("панель плана заполнена осмысленными значениями", async () => {
      const plan = await seedList.calculator.readPlan();
      const price = await seedList.calculator.readPrice();
      const players = await seedList.calculator.readPlayers();
      expect(plan.name).not.toBe("—");
      expect(plan.name.length).toBeGreaterThan(0);
      expect(plan.ram).toMatch(/\d+\s*GB/i);
      expect(plan.slots).toMatch(/\d/);
      expect(price.current).toMatch(/[€$]\s?\d/);
      expect(players).toMatch(/\d/);
    });

    await test.step("CTA «Create server» виден, активен, несёт productId + promo", async () => {
      const cta = seedList.calculator.cta();
      await expect(cta).toBeVisible();
      await expect(cta).toHaveText(/create server/i);
      const params = cartParams(await seedList.calculator.ctaHref());
      expect(params.get("productId")).toMatch(/^\d+$/);
      expect(params.get("promo")).toBeTruthy();
    });
  });

  test("@critical слайдер меняет тариф (план + цена + игроки + productId в URL)", async () => {
    await seedList.calculator.selectGameVersion(0);
    await expect
      .poll(() => seedList.calculator.readPlan().then((p) => p.name), { timeout: 10_000 })
      .not.toBe("—");

    await seedList.calculator.sliderToMin();
    const lo = await seedList.calculator.readPlan();
    const loPrice = (await seedList.calculator.readPrice()).current;
    const loPlayers = await seedList.calculator.readPlayers();
    const loProduct = cartParams(await seedList.calculator.ctaHref()).get("productId");

    await seedList.calculator.sliderToMax();
    await expect
      .poll(() => seedList.calculator.readPlan().then((p) => p.name), { timeout: 10_000 })
      .not.toBe(lo.name);

    const hi = await seedList.calculator.readPlan();
    expect(hi.name).not.toBe(lo.name);
    expect((await seedList.calculator.readPrice()).current).not.toBe(loPrice);
    expect(await seedList.calculator.readPlayers()).not.toBe(loPlayers);

    // productId в URL корзины отражает выбранный слайдером тариф
    const hiProduct = cartParams(await seedList.calculator.ctaHref()).get("productId");
    expect(hiProduct).toMatch(/^\d+$/);
    expect(hiProduct).not.toBe(loProduct);
  });

  test("@regression seed-чип — ссылка на страницу сида (клик уводит на /minecraft-seeds/<seed>/)", async ({ page }) => {
    // recon 22-Sep-2026: чип больше НЕ выбирает сид в калькуляторе (summary/seedId не трогает),
    // а ведёт на страницу сида. Проверяем структуру ссылки + реальную навигацию.
    const chip = seedList.calculator.seedChips().first();
    await expect(chip).toBeVisible({ timeout: 10_000 });

    const { href, name } = await seedList.calculator.chipInfo(0);
    await test.step("чип — ссылка вида /minecraft-seeds/<seed>/", async () => {
      expect(name.length).toBeGreaterThan(0);
      expect(href).toMatch(/\/minecraft-seeds\/[^/]+\/?$/);
    });

    await test.step("клик по чипу реально открывает страницу этого сида", async () => {
      await Promise.all([
        page.waitForURL(/\/minecraft-seeds\/[^/]+\/?$/, { timeout: 30_000 }),
        seedList.calculator.openSeedChip(0),
      ]);
      expect(page.url()).toBe(href);
    });
  });

  test("@regression кастомный сид пробрасывается в URL как есть", async () => {
    await seedList.calculator.setCustomSeed("123456789");
    await expect
      .poll(() => seedList.calculator.readSummary().then((s) => s.seed), { timeout: 5_000 })
      .toBe("123456789");
    expect(cartParams(await seedList.calculator.ctaHref()).get("seedId")).toBe("123456789");
  });

  test("@critical версия-модпак ATM10 → modpackId + версия в summary; mc-версия → без modpackId", async () => {
    await test.step("mc-версия: modpackId пуст", async () => {
      await seedList.calculator.selectGameVersion(0);
      expect(cartParams(await seedList.calculator.ctaHref()).get("modpackId")).toBeFalsy();
    });

    await test.step("ATM10: modpackId проброшен + summary отражает версию", async () => {
      const version = await seedList.calculator.selectFirstModpackVersion();
      expect(version, "в списке версий нет ни одной модпак-опции (mp:…)").toBeTruthy();
      await expect
        .poll(() => seedList.calculator.readSummary().then((s) => s.version), { timeout: 10_000 })
        .toMatch(/ATM10/i);
      const modpackId = cartParams(await seedList.calculator.ctaHref()).get("modpackId");
      expect(modpackId).toBeTruthy();
      expect(modpackId).toMatch(/curseforge/i);
    });
  });

  test("@critical Create server реально открывает /cart-seed с productId+seedId", async ({ page }) => {
    // seedId кладём через кастомный сид (единственный способ после recon 22-Sep-2026: выбор
    // чипом/поиском удалён). Ждём применения (seedId в data-href) через poll — как в кастом-тесте.
    await seedList.calculator.setCustomSeed("135792468");
    await expect
      .poll(async () => cartParams(await seedList.calculator.ctaHref()).get("seedId"), { timeout: 5_000 })
      .toBe("135792468");
    const expected = cartParams(await seedList.calculator.ctaHref());

    await Promise.all([
      page.waitForURL(/\/cart-seed/, { timeout: 30_000 }),
      seedList.calculator.cta().click(),
    ]);

    const got = new URL(page.url()).searchParams;
    expect(got.get("productId")).toBe(expected.get("productId"));
    expect(got.get("seedId")).toBe(expected.get("seedId"));
  });
});
