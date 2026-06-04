/**
 * slider.seed.spec.ts
 * ───────────────────
 * Tariff slider on /minecraft-seeds/sky-haven-island-atm-10-seed/.
 *
 * The seed calculator uses the same Vuetify v-slider widget as the modded
 * calculator (0..100, равномерные тики; число делений задаётся страницей —
 * наблюдалось 8 шагов→12.5, затем 6 шагов→16.667). Hidden input: `#fieldPlayersCount`.
 * The "Host Now" button submits a form, so we verify the cart-link metadata
 * via the BUY-A-SERVER card's data-url and the calculator's data-* attrs.
 *
 * Запуск:
 *   npx playwright test tests/slider.seed.spec.ts --project=chromium
 */
import { test, expect } from "../../fixtures/base";
import { SeedPage } from "../../pages/SeedPage";

test.describe("Сид-страница Sky-haven: слайдер тарифа", () => {
  let seed: SeedPage;

  test.beforeEach(async ({ page }) => {
    seed = new SeedPage(page);
    await seed.open();
  });

  test("слайдер отдаёт ARIA-диапазон", async () => {
    const state = await seed.calculator.readSlider();
    console.log(`[INFO] seed slider:`, state);
    expect(state.min).toBe(0);
    expect(state.max).toBe(100);
  });

  test("ArrowRight двигает слайдер на один равномерный шаг", async () => {
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
    console.log(`[INFO] seed slider step=${step} (v0=${v0} v1=${v1} v2=${v2})`);

    expect(step).toBeGreaterThan(0); // ArrowRight увеличивает
    expect(v2 - v1).toBeCloseTo(step, 1); // шаги равномерны (1 ArrowRight = 1 тик)
    const ticks = 100 / step;
    expect(ticks).toBeCloseTo(Math.round(ticks), 1); // шаг делит диапазон нацело
  });

  test("скрытый #fieldPlayersCount повторяет значение слайдера", async () => {
    await seed.calculator.toMin();
    const lo = Number(await seed.calculator.hiddenPlayerInput().inputValue());
    console.log(`[INFO] at min: hidden=${lo}`);

    await seed.calculator.stepRight(4);
    const hi = Number(await seed.calculator.hiddenPlayerInput().inputValue());
    console.log(`[INFO] after 4 steps right: hidden=${hi}`);

    expect(hi).toBeGreaterThan(lo);
  });

  test("кнопка BUY-A-SERVER ведёт на корзину с productId и promo", async () => {
    const cartUrl = await seed.buyServerCartUrl();
    console.log(`[INFO] BUY data-url: ${cartUrl}`);
    expect(cartUrl).toBeTruthy();

    const url = new URL(cartUrl!);
    expect(url.hostname).toBe("godlike.host");
    expect(url.pathname).toMatch(/\/cart\/?/);
    expect(url.searchParams.get("productId")).toMatch(/^\d+$/);
    expect(url.searchParams.get("seedId")).toBeTruthy();
    expect(url.searchParams.get("modpackId")).toBeTruthy();
  });

  test("корень калькулятора несёт data-атрибуты promocode и discount", async () => {
    const meta = await seed.readCalculatorMeta();
    console.log(`[INFO] seed meta:`, meta);
    expect(meta.promocode).toBeTruthy();
    expect(Number(meta.discount)).toBeGreaterThan(0);
  });

  test("кнопка Host Now видима и активна", async () => {
    const btn = seed.hostNowSubmit();
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
    console.log("[INFO] Host Now submit visible & enabled ✓");
  });
});
