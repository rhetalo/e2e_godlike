/**
 * slider.modded.spec.ts
 * ─────────────────────
 * Слайдер тарифа на /modded-minecraft-server-hosting/.
 *
 * ⚠️ 23-Jul-2026: калькулятор мигрировал на новый веб-компонент (Inc 6, Shadow DOM). Слайдер
 * теперь НАТИВНЫЙ input[type=range] с ДИСКРЕТНЫМ диапазоном 0..N (не ARIA 0..100). Скрытый input
 * #planCalculatorFieldPlayersCount сохранился в shadow. Читаем диапазон/шаг из DOM (не хардкодим
 * max) и проверяем, что сдвиг слайдера реально меняет productId в href «Host Now» — это
 * доказывает, что калькулятор выбрал другой план, а не просто двинул ползунок.
 */
import { test, expect } from "../../fixtures/base";
import { ModdedHostingPage } from "../../pages/ModdedHostingPage";

test.describe("Modded-хостинг: слайдер тарифа", () => {
  let modded: ModdedHostingPage;

  test.beforeEach(async ({ page }) => {
    modded = new ModdedHostingPage(page);
    await modded.open();
  });

  test("@regression слайдер отдаёт диапазон и стартует внутри [min, max]", async () => {
    const state = await modded.calculator.readSlider();

    await test.step("диапазон [0..max], значение внутри диапазона", async () => {
      expect(state.min).toBe(0);
      expect(state.max).toBeGreaterThan(0); // max задаётся числом тарифных ступеней (не хардкодим)
      expect(state.value).toBeGreaterThanOrEqual(state.min);
      expect(state.value).toBeLessThanOrEqual(state.max);
    });
  });

  test("@regression ArrowRight двигает слайдер на один равномерный шаг", async () => {
    // Размер шага не хардкодим (число делений задаётся страницей и меняется).
    // Контракт: один ArrowRight = один равномерный тик, увеличивающий значение,
    // и тик делит диапазон [0..max] нацело.
    await modded.calculator.toMin();
    const v0 = (await modded.calculator.readSlider()).value;
    await modded.calculator.stepRight(1);
    const v1 = (await modded.calculator.readSlider()).value;
    await modded.calculator.stepRight(1);
    const s2 = await modded.calculator.readSlider();
    const step = v1 - v0;

    await test.step("шаги равномерны и делят диапазон [0..max] нацело", async () => {
      expect(step).toBeGreaterThan(0); // ArrowRight увеличивает
      expect(s2.value - v1).toBeCloseTo(step, 1); // шаги равномерны (1 ArrowRight = 1 тик)
      const ticks = s2.max / step;
      expect(ticks).toBeCloseTo(Math.round(ticks), 1); // шаг делит диапазон нацело
    });
  });

  test("@regression скрытый input игроков повторяет значение слайдера", async () => {
    await modded.calculator.toMin();
    const minHidden = Number((await modded.playersHiddenInput().inputValue()) || "0");

    await modded.calculator.stepRight(4);
    const stepped = Number((await modded.playersHiddenInput().inputValue()) || "0");

    await test.step("скрытый input игроков вырос вместе со слайдером", async () => {
      expect(stepped).toBeGreaterThan(minHidden);
      expect(stepped).toBeGreaterThanOrEqual(1);
    });
  });

  test("@critical сдвиг слайдера меняет productId в ссылке корзины", async () => {
    await modded.calculator.toMin();
    const lo = await modded.readCalculatorCartParams();

    await test.step("в min: productId числовой, биллинг monthly", async () => {
      expect(lo.productId).toMatch(/^\d+$/);
      expect(lo.billingCycle).toBe("monthly");
    });

    await modded.calculator.stepRight(5);

    await test.step("сдвиг слайдера меняет productId (модпак тот же)", async () => {
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
  });

  test("@regression End/Home переводят слайдер в крайние значения", async () => {
    await test.step("End → max", async () => {
      await modded.calculator.toMax();
      const s = await modded.calculator.readSlider();
      expect(s.value).toBe(s.max);
    });

    await test.step("Home → 0", async () => {
      await modded.calculator.toMin();
      expect((await modded.calculator.readSlider()).value).toBe(0);
    });
  });
});
