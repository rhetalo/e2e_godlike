/**
 * slider.modded.spec.ts
 * ─────────────────────
 * Слайдер тарифа на /modded-minecraft-server-hosting/.
 *
 * Vuetify v-slider отдаёт ARIA-атрибуты (aria-valuenow/-valuemin/-valuemax) И держит в
 * синхроне скрытый input #planCalculatorFieldPlayersCount. Используем оба как источники
 * правды и дополнительно проверяем, что сдвиг слайдера реально меняет productId в href
 * «Host Now» — это доказывает, что калькулятор выбрал другой план, а не просто двинул ползунок.
 */
import { test, expect } from "../../fixtures/base";
import { ModdedHostingPage } from "../../pages/ModdedHostingPage";

test.describe("Modded-хостинг: слайдер тарифа", () => {
  let modded: ModdedHostingPage;

  test.beforeEach(async ({ page }) => {
    modded = new ModdedHostingPage(page);
    await modded.open();
  });

  test("@regression слайдер отдаёт ARIA-диапазон и стартует внутри [min, max]", async () => {
    const state = await modded.calculator.readSlider();
    expect(state.min).toBe(0);
    expect(state.max).toBe(100);
    expect(state.value).toBeGreaterThanOrEqual(0);
    expect(state.value).toBeLessThanOrEqual(state.max);
  });

  test("@regression ArrowRight двигает слайдер на один равномерный шаг", async () => {
    // Размер шага не хардкодим (число делений задаётся страницей и меняется).
    // Контракт: один ArrowRight = один равномерный тик, увеличивающий значение,
    // и тик делит диапазон 0..100 нацело.
    await modded.calculator.toMin();
    const v0 = (await modded.calculator.readSlider()).value;
    await modded.calculator.stepRight(1);
    const v1 = (await modded.calculator.readSlider()).value;
    await modded.calculator.stepRight(1);
    const v2 = (await modded.calculator.readSlider()).value;
    const step = v1 - v0;

    expect(step).toBeGreaterThan(0); // ArrowRight увеличивает
    expect(v2 - v1).toBeCloseTo(step, 1); // шаги равномерны (1 ArrowRight = 1 тик)
    const ticks = 100 / step;
    expect(ticks).toBeCloseTo(Math.round(ticks), 1); // шаг делит диапазон нацело
  });

  test("@regression скрытый input игроков повторяет значение слайдера", async () => {
    await modded.calculator.toMin();
    const minHidden = Number((await modded.playersHiddenInput().inputValue()) || "0");

    await modded.calculator.stepRight(4);
    const stepped = Number((await modded.playersHiddenInput().inputValue()) || "0");

    expect(stepped).toBeGreaterThan(minHidden);
    expect(stepped).toBeGreaterThanOrEqual(1);
  });

  test("@critical сдвиг слайдера меняет productId в ссылке корзины", async () => {
    await modded.calculator.toMin();
    const lo = await modded.readCalculatorCartParams();
    expect(lo.productId).toMatch(/^\d+$/);
    expect(lo.billingCycle).toBe("monthly");

    await modded.calculator.stepRight(5);

    // Ждём, пока SPA протолкнёт новый productId в href.
    await expect
      .poll(async () => (await modded.readCalculatorCartParams()).productId, {
        timeout: 10_000,
        intervals: [200, 400, 800],
      })
      .not.toBe(lo.productId);

    const hi = await modded.readCalculatorCartParams();
    expect(hi.productId).toMatch(/^\d+$/);
    expect(hi.productId).not.toBe(lo.productId);
    // Sanity: модпак не меняется, когда двигаем только слайдер.
    expect(hi.modpackId).toBe(lo.modpackId);
  });

  test("@regression End/Home переводят слайдер в крайние значения", async () => {
    await modded.calculator.toMax();
    expect((await modded.calculator.readSlider()).value).toBe(100);

    await modded.calculator.toMin();
    expect((await modded.calculator.readSlider()).value).toBe(0);
  });
});
