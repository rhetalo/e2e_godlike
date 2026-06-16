/**
 * modpack.config.modded.spec.ts
 * ─────────────────────────────
 * Конфигурация модпака на /modded-minecraft-server-hosting/. Три источника правды:
 *   1. Quick-pick пилюли (ATM 10, BMC 4, …) — клик меняет выбранный модпак калькулятора.
 *   2. Vuetify-автокомплиты (#planCalculatorFieldModpack / …FieldModpackVersion).
 *   3. Сетка install-кнопок (data-product-id / data-modpack-id / data-promo).
 * Проверяем, что выбор реально пробрасывается в modpackId/productId ссылки корзины.
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

  test("@critical клик по другому quick-pick меняет modpackId в ссылке корзины", async () => {
    await test.step("видны все пять quick-pick модпаков", async () => {
      for (const name of QuickPickModpacks) {
        await expect(modded.quickPickButton(name), `quick-pick "${name}" виден`).toBeVisible();
      }
    });

    const initial = await modded.readCalculatorCartParams();
    expect(initial.modpackId).toBeTruthy();

    // Берём quick-pick, чьё имя не входит в текущий modpackId.
    const target = QuickPickModpacks.find(
      (name) =>
        !initial.modpackId?.toLowerCase().includes(name.toLowerCase().replace(/\s+/g, "-")),
    );
    expect(target, "ожидали хотя бы один отличный quick-pick").toBeTruthy();

    await modded.quickPickButton(target!).click();

    await expect
      .poll(async () => (await modded.readCalculatorCartParams()).modpackId, {
        timeout: 10_000,
        intervals: [200, 400, 800],
      })
      .not.toBe(initial.modpackId);

    const after = await modded.readCalculatorCartParams();
    expect(after.productId).toMatch(/^\d+$/);
  });

  test("@regression автокомплит модпаков открывается (≥5 опций) + поле версии рядом", async () => {
    await test.step("оба автокомплита видны (модпак + версия)", async () => {
      await expect(modded.modpackInput()).toBeVisible();
      await expect(modded.modpackVersionInput()).toBeVisible();
    });

    await test.step("список модпаков содержит минимум 5 непустых опций", async () => {
      const options = await modded.listModpackOptions(20);
      expect(options.length).toBeGreaterThanOrEqual(5);
      for (const o of options) expect(o.length).toBeGreaterThan(0);
    });
  });

  test("@regression кнопки Install в сетке несут data-product-id и data-modpack-id", async () => {
    const buttons = modded.installButtons();
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);

    // Проверяем все кнопки (до 50) — каждая несёт валидные data-*.
    const sample = Math.min(count, 50);
    for (let i = 0; i < sample; i++) {
      const meta = await modded.readInstallMeta(buttons.nth(i));
      expect(meta.productId, `install[${i}].data-product-id`).toMatch(/^\d+$/);
      expect(meta.modpackId, `install[${i}].data-modpack-id`).toBeTruthy();
    }
  });
});
