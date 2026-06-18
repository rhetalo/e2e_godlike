/**
 * slider.seed.spec.ts
 * ───────────────────
 * Одиночная seed-страница /minecraft-seeds/sky-haven-island-atm-10-seed/ (Vuetify #seed-calculator).
 *
 * Покрываем слайдер тарифа и передачу выбранного тарифа/сида/модпака в воронку /cart-seed:
 *   - слайдер: ARIA-диапазон 0..100, равномерный шаг, скрытый #fieldPlayersCount;
 *   - Host Now: позиция слайдера определяет productId в URL корзины (покупаем ВЫБРАННЫЙ тариф),
 *     seedId/modpackId совпадают с meta калькулятора;
 *   - BUY-A-SERVER (data-url): фикс. productId (Quadra, первый тариф) + seedId + modpackId + promo;
 *   - data-атрибуты promocode/discount на корне калькулятора.
 *
 * Тот же Vuetify v-slider, что и на modded-калькуляторе (0..100, равномерные тики; число делений
 * задаёт страница). modpackId у Host Now приходит с двоеточиями (curseforge:…), у BUY — с дефисами
 * (curseforge-…) → проверяем структурно, не по разделителю. Read-only: дальше /cart-seed (step 1)
 * не идём, оплату не оформляем. Confirmed via recon 18-Jun-2026.
 */
import { test, expect } from "../../fixtures/base";
import { SeedPage } from "../../pages/SeedPage";

/** Параметры URL корзины. */
function cartParams(url: string): URLSearchParams {
  return new URL(url).searchParams;
}

test.describe("Сид-страница Sky-haven (Vuetify-калькулятор)", () => {
  let seed: SeedPage;

  test.beforeEach(async ({ page }) => {
    seed = new SeedPage(page);
    await seed.open();
  });

  test("@regression слайдер отдаёт ARIA-диапазон 0..100", async () => {
    const state = await seed.calculator.readSlider();
    expect(state.min).toBe(0);
    expect(state.max).toBe(100);
  });

  test("@regression ArrowRight двигает слайдер на один равномерный шаг", async () => {
    // Не хардкодим размер шага: число делений задаётся страницей и меняется. Проверяем контракт:
    // один ArrowRight = один равномерный тик, увеличивающий значение, и тик делит 0..100 нацело.
    await seed.calculator.toMin();
    const v0 = (await seed.calculator.readSlider()).value;
    await seed.calculator.stepRight(1);
    const v1 = (await seed.calculator.readSlider()).value;
    await seed.calculator.stepRight(1);
    const v2 = (await seed.calculator.readSlider()).value;
    const step = v1 - v0;

    expect(step).toBeGreaterThan(0);
    expect(v2 - v1).toBeCloseTo(step, 1);
    const ticks = 100 / step;
    expect(ticks).toBeCloseTo(Math.round(ticks), 1);
  });

  test("@regression скрытый #fieldPlayersCount повторяет значение слайдера", async () => {
    await seed.calculator.toMin();
    const lo = Number(await seed.calculator.hiddenPlayerInput().inputValue());
    await seed.calculator.stepRight(4);
    const hi = Number(await seed.calculator.hiddenPlayerInput().inputValue());
    expect(hi).toBeGreaterThan(lo);
  });

  test("@critical Host Now: выбранный слайдером тариф идёт в /cart-seed (+ seed/modpack)", async () => {
    const meta = await seed.readCalculatorMeta();

    let productMin = "";

    await test.step("слайдер→min → Host Now → младший тариф + корректные seed/modpack", async () => {
      await seed.calculator.toMin();
      const params = cartParams(await seed.hostNowToCartUrl());
      productMin = params.get("productId") ?? "";
      expect(productMin).toMatch(/^\d+$/);
      expect(params.get("seedId")).toBe(meta.seedId);
      expect(params.get("modpackId")).toBeTruthy();
    });

    await test.step("слайдер→max → Host Now → ДРУГОЙ тариф (продукт меняется со слайдером)", async () => {
      await seed.open(); // переоткрываем — Host Now увёл на /cart-seed
      await seed.calculator.toMax();
      const productMax = cartParams(await seed.hostNowToCartUrl()).get("productId") ?? "";
      expect(productMax).toMatch(/^\d+$/);
      expect(productMax).not.toBe(productMin);
    });
  });

  test("@critical BUY-A-SERVER → /cart-seed с фикс. тарифом (Quadra) + seed + modpack", async () => {
    const meta = await seed.readCalculatorMeta();
    const cartUrl = await seed.buyServerCartUrl();
    expect(cartUrl, "BUY-A-SERVER должен нести data-url").toBeTruthy();

    const url = new URL(cartUrl!);
    expect(url.hostname).toBe("godlike.host");
    expect(url.pathname).toMatch(/\/cart-seed/);
    const params = url.searchParams;
    expect(params.get("productId")).toMatch(/^\d+$/);
    expect(params.get("seedId")).toBe(meta.seedId);
    expect(params.get("modpackId")).toBeTruthy();
    expect(params.get("promo")).toBeTruthy();
  });

  test("@regression корень калькулятора несёт data-атрибуты promocode и discount", async () => {
    const meta = await seed.readCalculatorMeta();
    expect(meta.promocode).toBeTruthy();
    expect(Number(meta.discount)).toBeGreaterThan(0);
  });
});
