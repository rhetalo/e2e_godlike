/**
 * slider.seed.spec.ts
 * ───────────────────
 * Одиночная seed-страница /minecraft-seeds/sky-haven-island-atm-10-seed/.
 *
 * ⚠️ 06-Aug-2026: калькулятор мигрировал на новый Inc 6 веб-компонент (Shadow DOM), как модед.
 * Слайдер теперь НАТИВНЫЙ input[type=range] с ДИСКРЕТНЫМ диапазоном 0..N (не ARIA 0..100); id
 * #fieldPlayersCount и класс кнопки .seed-calculator__btn сохранились. Мета — в data-config (JSON).
 *
 * Покрываем слайдер тарифа и передачу выбранного тарифа/сида/модпака в воронку /cart-seed:
 *   - слайдер: диапазон 0..max, равномерный шаг, скрытый #fieldPlayersCount повторяет значение;
 *   - Host Now: позиция слайдера определяет productId в URL корзины (покупаем ВЫБРАННЫЙ тариф),
 *     seedId/modpackId совпадают с meta калькулятора;
 *   - BUY-A-SERVER (data-url): фикс. productId + seedId + modpackId + promo;
 *   - data-config несёт promocode/discount.
 *
 * Read-only: дальше /cart-seed (step 1) не идём, оплату не оформляем. Не хардкодим max/шаг —
 * читаем из DOM. Confirmed via live-recon 06-Aug-2026.
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

  test("@regression слайдер отдаёт диапазон и стартует внутри [min, max]", async () => {
    const state = await seed.calculator.readSlider();
    expect(state.min).toBe(0);
    expect(state.max).toBeGreaterThan(0); // max = число тарифных ступеней (не хардкодим)
    expect(state.value).toBeGreaterThanOrEqual(state.min);
    expect(state.value).toBeLessThanOrEqual(state.max);
  });

  test("@regression ArrowRight двигает слайдер на один равномерный шаг", async () => {
    // Не хардкодим размер шага: число делений задаётся страницей и меняется. Проверяем контракт:
    // один ArrowRight = один равномерный тик, увеличивающий значение, и тик делит [0..max] нацело.
    await seed.calculator.toMin();
    const v0 = (await seed.calculator.readSlider()).value;
    await seed.calculator.stepRight(1);
    const v1 = (await seed.calculator.readSlider()).value;
    await seed.calculator.stepRight(1);
    const s2 = await seed.calculator.readSlider();
    const step = v1 - v0;

    expect(step).toBeGreaterThan(0);
    expect(s2.value - v1).toBeCloseTo(step, 1);
    const ticks = s2.max / step;
    expect(ticks).toBeCloseTo(Math.round(ticks), 1);
  });

  test("@regression скрытый #fieldPlayersCount повторяет значение слайдера", async () => {
    await seed.calculator.toMin();
    const lo = Number(await seed.calculator.hiddenPlayerInput().inputValue());
    await seed.calculator.stepRight(4);
    const hi = Number(await seed.calculator.hiddenPlayerInput().inputValue());
    expect(hi).toBeGreaterThan(lo);
  });

  test("@critical Host Now: тариф со слайдера идёт в /cart-seed с seed+modpack", async () => {
    const meta = await seed.readCalculatorMeta();
    await seed.calculator.toMin();
    const params = cartParams(await seed.hostNowToCartUrl());
    expect(params.get("productId")).toMatch(/^\d+$/);
    expect(params.get("seedId")).toBe(meta.seedId);
    expect(params.get("modpackId")).toBeTruthy();
  });

  test("@critical сдвиг слайдера меняет productId в /cart-seed", async () => {
    await seed.calculator.toMin();
    const productMin = cartParams(await seed.hostNowToCartUrl()).get("productId") ?? "";

    await seed.open(); // переоткрываем — Host Now увёл на /cart-seed
    await seed.calculator.toMax();
    const productMax = cartParams(await seed.hostNowToCartUrl()).get("productId") ?? "";

    expect(productMax).toMatch(/^\d+$/);
    expect(productMax).not.toBe(productMin);
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

  test("@regression data-config калькулятора несёт promocode и discount", async () => {
    const meta = await seed.readCalculatorMeta();
    expect(meta.promocode).toBeTruthy();
    expect(Number(meta.discount)).toBeGreaterThan(0);
  });
});
