/**
 * slider.modded.spec.ts
 * ─────────────────────
 * Tariff slider on /modded-minecraft-server-hosting/.
 *
 * The Vuetify v-slider exposes ARIA attrs (aria-valuenow / -valuemin / -valuemax)
 * AND its hidden input #planCalculatorFieldPlayersCount stays in sync. We use
 * BOTH as truth sources and additionally verify that moving the slider
 * actually changes the productId in the "Host Now" link's href — that proves
 * the calculator picked a different plan, not just that the thumb moved.
 *
 * Шаги (для каждого теста):
 *   1. Открыть /modded-minecraft-server-hosting/
 *   2. Дождаться монтирования #plan-calculator
 *   3. Двигать slider клавиатурой (ArrowRight / ArrowLeft / Home / End)
 *   4. Проверять aria-valuenow + hidden input + href on a.plan-calculator__checkout__button
 *
 * Запуск:
 *   npx playwright test tests/slider.modded.spec.ts --project=chromium
 *   npx playwright test tests/slider.modded.spec.ts --project=chromium --headed
 */
import { test, expect } from "../../fixtures/base";
import { ModdedHostingPage } from "../../pages/ModdedHostingPage";

test.describe("Modded hosting tariff slider", () => {
  let modded: ModdedHostingPage;

  test.beforeEach(async ({ page }) => {
    modded = new ModdedHostingPage(page);
    await modded.open();
  });

  test("slider exposes ARIA range and starts inside [min, max]", async () => {
    const state = await modded.calculator.readSlider();
    console.log(`[INFO] slider state:`, state);
    expect(state.min).toBe(0);
    expect(state.max).toBe(100);
    expect(state.value).toBeGreaterThanOrEqual(0);
    expect(state.value).toBeLessThanOrEqual(state.max);
  });

  test("ArrowRight increments aria-valuenow by one tick (12.5)", async () => {
    const before = await modded.calculator.readSlider();
    console.log(`[INFO] before: aria-valuenow=${before.value}`);
    await modded.calculator.stepRight(1);
    const after = await modded.calculator.readSlider();
    console.log(`[INFO] after ArrowRight: aria-valuenow=${after.value}`);

    expect(after.value).toBeGreaterThan(before.value);
    expect(after.value - before.value).toBeCloseTo(12.5, 1);
  });

  test("hidden players input mirrors the slider value", async () => {
    await modded.calculator.toMin();
    const minHidden = Number(
      (await modded.playersHiddenInput().inputValue()) || "0",
    );
    console.log(`[INFO] at min: hidden players=${minHidden}`);

    await modded.calculator.stepRight(4);
    const stepped = Number(
      (await modded.playersHiddenInput().inputValue()) || "0",
    );
    console.log(`[INFO] after 4 steps right: hidden players=${stepped}`);

    expect(stepped).toBeGreaterThan(minHidden);
    expect(stepped).toBeGreaterThanOrEqual(1);
  });

  test("moving the slider changes the cart link's productId", async ({
    page,
  }) => {
    await modded.calculator.toMin();
    const lo = await modded.readCalculatorCartParams();
    console.log(`[INFO] at min: productId=${lo.productId} modpackId=${lo.modpackId}`);
    expect(lo.productId).toMatch(/^\d+$/);
    expect(lo.billingCycle).toBe("monthly");

    await modded.calculator.stepRight(5);

    // Wait for the SPA to push the new productId into the href.
    await expect
      .poll(
        async () => (await modded.readCalculatorCartParams()).productId,
        { timeout: 10_000, intervals: [200, 400, 800] },
      )
      .not.toBe(lo.productId);

    const hi = await modded.readCalculatorCartParams();
    console.log(`[INFO] after 5 steps: productId=${hi.productId}`);

    expect(hi.productId).toMatch(/^\d+$/);
    expect(hi.productId).not.toBe(lo.productId);
    // Sanity: the modpack stays the same when only the slider moves.
    expect(hi.modpackId).toBe(lo.modpackId);
    void page;
  });

  test("End/Home navigate to slider extremes", async () => {
    await modded.calculator.toMax();
    const atMax = (await modded.calculator.readSlider()).value;
    console.log(`[INFO] End → aria-valuenow=${atMax}`);
    expect(atMax).toBe(100);

    await modded.calculator.toMin();
    const atMin = (await modded.calculator.readSlider()).value;
    console.log(`[INFO] Home → aria-valuenow=${atMin}`);
    expect(atMin).toBe(0);
  });
});
