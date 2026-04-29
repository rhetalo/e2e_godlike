/**
 * slider.seed.spec.ts
 * ───────────────────
 * Tariff slider on /minecraft-seeds/sky-haven-island-atm-10-seed/.
 *
 * The seed calculator uses the same Vuetify v-slider widget as the modded
 * calculator (0..100, step 12.5). Its hidden input is `#fieldPlayersCount`.
 * The "Host Now" button submits a form, so we verify the cart-link metadata
 * via the BUY-A-SERVER card's data-url and the calculator's data-* attrs.
 *
 * Запуск:
 *   npx playwright test tests/slider.seed.spec.ts --project=chromium
 */
import { test, expect } from "@playwright/test";
import { SeedPage } from "../pages/SeedPage";

test.describe("Sky-haven seed page tariff slider", () => {
  let seed: SeedPage;

  test.beforeEach(async ({ page }) => {
    seed = new SeedPage(page);
    await seed.open();
  });

  test("slider exposes ARIA range", async () => {
    const state = await seed.calculator.readSlider();
    console.log(`[INFO] seed slider:`, state);
    expect(state.min).toBe(0);
    expect(state.max).toBe(100);
  });

  test("ArrowRight increments aria-valuenow by one tick (12.5)", async () => {
    const before = await seed.calculator.readSlider();
    await seed.calculator.stepRight(1);
    const after = await seed.calculator.readSlider();
    console.log(
      `[INFO] before=${before.value} after ArrowRight=${after.value}`,
    );
    expect(after.value - before.value).toBeCloseTo(12.5, 1);
  });

  test("hidden #fieldPlayersCount mirrors slider", async () => {
    await seed.calculator.toMin();
    const lo = Number(await seed.calculator.hiddenPlayerInput().inputValue());
    console.log(`[INFO] at min: hidden=${lo}`);

    await seed.calculator.stepRight(4);
    const hi = Number(await seed.calculator.hiddenPlayerInput().inputValue());
    console.log(`[INFO] after 4 steps right: hidden=${hi}`);

    expect(hi).toBeGreaterThan(lo);
  });

  test("BUY-A-SERVER button has a real cart URL with productId & promo", async () => {
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

  test("calculator root carries promocode + discount data attributes", async () => {
    const meta = await seed.readCalculatorMeta();
    console.log(`[INFO] seed meta:`, meta);
    expect(meta.promocode).toBeTruthy();
    expect(Number(meta.discount)).toBeGreaterThan(0);
  });

  test("Host-Now submit button is visible and enabled", async () => {
    const btn = seed.hostNowSubmit();
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
    console.log("[INFO] Host Now submit visible & enabled ✓");
  });
});
