/**
 * seed-list.calculator.spec.ts
 * ────────────────────────────
 * Новый кастомный калькулятор на странице СПИСКА сидов /minecraft-seeds/ (NewSeedCalculator).
 * НЕ Vuetify-калькулятор одиночной seed-страницы (см. slider.seed.spec.ts).
 *
 * Покрываем:
 *   - поля калькулятора: версия заполняет план/RAM/цену/игроков + CTA «Create server»;
 *   - слайдер меняет предлагаемый тариф (план/цена/игроки + productId в URL);
 *   - выбор сида ТРЕМЯ способами (чип / поиск-дропдаун / кастомный) → summary + seedId в URL;
 *   - версия-модпак ATM10 → modpackId в URL + версия в summary; mc-версия → без modpackId;
 *   - реальный переход «Create server» → /cart-seed с productId+seedId.
 *
 * Готовый URL корзины калькулятор держит в CTA data-href (синхронно выбору) — проверяем его
 * без навигации; один тест делает реальный переход на воронку. Read-only, заказ не оформляем.
 * Confirmed via recon 18-Jun-2026. Amplitude A/B пинится фикстурой base (иначе flash-sale-оверлей
 * перехватывает клики по чипам).
 */
import { test, expect } from "../../fixtures/base";
import { SeedListPage } from "../../pages/SeedListPage";

const ATM10_VERSION = "mp:curseforge-925200-7852998"; // ATM10 v6.2.1 (модпак-версия)

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

  test("@critical выбор сида чипом → summary + seedId в URL", async () => {
    await expect(seedList.calculator.seedChips().first()).toBeVisible({ timeout: 10_000 });
    expect(cartParams(await seedList.calculator.ctaHref()).get("seedId")).toBeFalsy(); // до выбора пусто

    const { name } = await seedList.calculator.selectSeedChip(0);

    await test.step("summary показывает выбранный сид", async () => {
      await expect
        .poll(() => seedList.calculator.readSummary().then((s) => s.seed), { timeout: 5_000 })
        .toBe(name);
    });

    await test.step("seedId проброшен в URL корзины", async () => {
      const seedId = cartParams(await seedList.calculator.ctaHref()).get("seedId");
      expect(seedId).toBeTruthy();
      expect(seedId!.length).toBeGreaterThan(0);
    });
  });

  test("@regression выбор сида из поиска-дропдауна → seedId в URL", async () => {
    await seedList.calculator.searchSeed("vi"); // широкий запрос (Village-сиды) — список не пуст
    await expect(seedList.calculator.searchResults().first()).toBeVisible({ timeout: 5_000 });
    expect(await seedList.calculator.searchResults().count()).toBeGreaterThan(0);

    const picked = await seedList.calculator.pickSearchResult(0);
    expect(picked.length).toBeGreaterThan(0);
    // CTA data-href обновляется АСИНХРОННО после клика по результату (recon 21-Jul: seedId
    // появляется через +35..318мс, на нагруженном CI дольше). Как чип/кастом-тесты, ждём
    // применения выбора через poll — не читаем href «сразу» (иначе seedId ещё пуст → CI-флак).
    await expect
      .poll(async () => cartParams(await seedList.calculator.ctaHref()).get("seedId"), {
        timeout: 5_000,
      })
      .toBeTruthy();
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
      await seedList.calculator.selectVersionValue(ATM10_VERSION);
      await expect
        .poll(() => seedList.calculator.readSummary().then((s) => s.version), { timeout: 10_000 })
        .toMatch(/ATM10/i);
      const modpackId = cartParams(await seedList.calculator.ctaHref()).get("modpackId");
      expect(modpackId).toBeTruthy();
      expect(modpackId).toMatch(/curseforge/i);
    });
  });

  test("@critical Create server реально открывает /cart-seed с productId+seedId", async ({ page }) => {
    await expect(seedList.calculator.seedChips().first()).toBeVisible({ timeout: 10_000 });
    await seedList.calculator.selectSeedChip(0);
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
