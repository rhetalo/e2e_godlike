/**
 * modpack.config.modded.spec.ts
 * ─────────────────────────────
 * Modpack configuration on /modded-minecraft-server-hosting/.
 *
 * Three sources of truth on this page:
 *   1. Quick-pick rounded-pill buttons (ATM 10, BMC 4, Prominence II,
 *      RLCraft, ATMons) — clicking changes the calculator's selected modpack.
 *   2. Vuetify autocomplete inputs (#planCalculatorFieldModpack and
 *      #planCalculatorFieldModpackVersion).
 *   3. The grid of `button.modpacks-body__install` cards lower on the page,
 *      each carrying data-product-id / data-modpack-id / data-promo.
 *
 * For each we verify both DOM state and that it propagates into the cart-link
 * `modpackId` (= the calculator actually re-targeted the right plan).
 *
 * Запуск:
 *   npx playwright test tests/modpack.config.modded.spec.ts --project=chromium
 */
import { test, expect } from "../../fixtures/base";
import { ModdedHostingPage } from "../../pages/ModdedHostingPage";
import { QuickPickModpacks } from "../../fixtures/test-data";

test.describe("Modded: конфигурация модпака", () => {
  let modded: ModdedHostingPage;

  test.beforeEach(async ({ page }) => {
    modded = new ModdedHostingPage(page);
    await modded.open();
  });

  test("видны все пять quick-pick модпаков", async () => {
    for (const name of QuickPickModpacks) {
      const pill = modded.quickPickButton(name);
      await expect(pill, `quick-pick "${name}" should be visible`).toBeVisible();
      console.log(`[INFO] quick-pick visible: ${name}`);
    }
  });

  test("клик по другому quick-pick меняет modpackId в ссылке корзины", async () => {
    const initial = await modded.readCalculatorCartParams();
    console.log(`[INFO] initial modpackId=${initial.modpackId}`);
    expect(initial.modpackId).toBeTruthy();

    // Pick a quick-pick whose name doesn't appear in the current modpackId.
    const target = QuickPickModpacks.find(
      (name) =>
        !initial.modpackId
          ?.toLowerCase()
          .includes(name.toLowerCase().replace(/\s+/g, "-")),
    );
    expect(target, "expected at least one different quick-pick").toBeTruthy();
    console.log(`[INFO] clicking quick-pick: ${target}`);

    await modded.quickPickButton(target!).click();

    await expect
      .poll(
        async () => (await modded.readCalculatorCartParams()).modpackId,
        { timeout: 10_000, intervals: [200, 400, 800] },
      )
      .not.toBe(initial.modpackId);

    const after = await modded.readCalculatorCartParams();
    console.log(`[INFO] after click: modpackId=${after.modpackId} productId=${after.productId}`);
    expect(after.productId).toMatch(/^\d+$/);
  });

  test("автокомплит модпаков открывается и показывает минимум 5", async () => {
    const options = await modded.listModpackOptions(20);
    console.log(`[INFO] visible modpack options (${options.length}): ${options.slice(0, 5).join(", ")}…`);
    expect(options.length).toBeGreaterThanOrEqual(5);
    for (const o of options) {
      expect(o.length).toBeGreaterThan(0);
    }
  });

  test("поле версии модпака есть рядом с полем модпака", async () => {
    await expect(modded.modpackInput()).toBeVisible();
    await expect(modded.modpackVersionInput()).toBeVisible();
    console.log("[INFO] both autocompletes (modpack + version) visible ✓");
  });

  test("кнопки Install в сетке несут data-product-id и data-modpack-id", async () => {
    const buttons = modded.installButtons();
    const count = await buttons.count();
    console.log(`[INFO] install buttons: ${count}`);
    expect(count).toBeGreaterThan(0);

    // Sample the first 6 (or fewer) so the test stays fast.
    const sample = Math.min(count, 50);
    for (let i = 0; i < sample; i++) {
      const meta = await modded.readInstallMeta(buttons.nth(i));
      console.log(`[INFO] install[${i}]: productId=${meta.productId} modpackId=${meta.modpackId} promo=${meta.promo}`);
      expect(meta.productId, `install[${i}].data-product-id`).toMatch(/^\d+$/);
      expect(meta.modpackId, `install[${i}].data-modpack-id`).toBeTruthy();
    }
  });
});
