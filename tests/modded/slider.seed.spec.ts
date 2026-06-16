/**
 * slider.seed.spec.ts
 * ───────────────────
 * Слайдер тарифа на /minecraft-seeds/sky-haven-island-atm-10-seed/.
 *
 * Тот же Vuetify v-slider, что и на modded-калькуляторе (0..100, равномерные тики; число
 * делений задаёт страница — наблюдалось 8 шагов→12.5, затем 6→16.667). Скрытый input:
 * `#fieldPlayersCount`. «Host Now» сабмитит форму — на проде НЕ жмём; метаданные корзины
 * проверяем через data-url карточки BUY-A-SERVER и data-* атрибуты калькулятора.
 */
import { test, expect } from "../../fixtures/base";
import { SeedPage } from "../../pages/SeedPage";

test.describe("Сид-страница Sky-haven: слайдер тарифа", () => {
  let seed: SeedPage;

  test.beforeEach(async ({ page }) => {
    seed = new SeedPage(page);
    await seed.open();
  });

  test("@regression слайдер отдаёт ARIA-диапазон", async () => {
    const state = await seed.calculator.readSlider();
    expect(state.min).toBe(0);
    expect(state.max).toBe(100);
  });

  test("@regression ArrowRight двигает слайдер на один равномерный шаг", async () => {
    // Не хардкодим размер шага: число делений задаётся страницей и меняется
    // (8 шагов→12.5, затем 6→16.667). Проверяем контракт: один ArrowRight = один
    // равномерный тик, увеличивающий значение, и тик делит диапазон 0..100 нацело.
    await seed.calculator.toMin();
    const v0 = (await seed.calculator.readSlider()).value;
    await seed.calculator.stepRight(1);
    const v1 = (await seed.calculator.readSlider()).value;
    await seed.calculator.stepRight(1);
    const v2 = (await seed.calculator.readSlider()).value;
    const step = v1 - v0;

    expect(step).toBeGreaterThan(0); // ArrowRight увеличивает
    expect(v2 - v1).toBeCloseTo(step, 1); // шаги равномерны (1 ArrowRight = 1 тик)
    const ticks = 100 / step;
    expect(ticks).toBeCloseTo(Math.round(ticks), 1); // шаг делит диапазон нацело
  });

  test("@regression скрытый #fieldPlayersCount повторяет значение слайдера", async () => {
    await seed.calculator.toMin();
    const lo = Number(await seed.calculator.hiddenPlayerInput().inputValue());
    await seed.calculator.stepRight(4);
    const hi = Number(await seed.calculator.hiddenPlayerInput().inputValue());
    expect(hi).toBeGreaterThan(lo);
  });

  test("@regression кнопка BUY-A-SERVER ведёт на корзину с productId и promo", async () => {
    const cartUrl = await seed.buyServerCartUrl();
    expect(cartUrl).toBeTruthy();

    const url = new URL(cartUrl!);
    expect(url.hostname).toBe("godlike.host");
    expect(url.pathname).toMatch(/\/cart\/?/);
    expect(url.searchParams.get("productId")).toMatch(/^\d+$/);
    expect(url.searchParams.get("seedId")).toBeTruthy();
    expect(url.searchParams.get("modpackId")).toBeTruthy();
  });

  test("@regression корень калькулятора несёт data-атрибуты promocode и discount", async () => {
    const meta = await seed.readCalculatorMeta();
    expect(meta.promocode).toBeTruthy();
    expect(Number(meta.discount)).toBeGreaterThan(0);
  });
});
