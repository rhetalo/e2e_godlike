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

    // modpackId теперь ЧИСЛОВОЙ (curseforge:925200:…) — по имени quick-pick не сопоставить, какой
    // из них выбран по умолчанию. Поэтому кликаем quick-pick'и по очереди, пока modpackId в ссылке
    // корзины не сменится (дефолтный клик ничего не меняет — пропускаем и берём следующий).
    let after: Awaited<ReturnType<typeof modded.readCalculatorCartParams>> | null = null;
    for (const name of QuickPickModpacks) {
      await modded.quickPickButton(name).click();
      const changed = await expect
        .poll(async () => (await modded.readCalculatorCartParams()).modpackId, {
          timeout: 4_000,
          intervals: [200, 400, 800],
        })
        .not.toBe(initial.modpackId)
        .then(() => true)
        .catch(() => false);
      if (changed) {
        after = await modded.readCalculatorCartParams();
        break;
      }
    }

    expect(after, "ожидали, что хотя бы один quick-pick сменит modpackId").toBeTruthy();
    expect(after!.modpackId).not.toBe(initial.modpackId);
    expect(after!.productId).toMatch(/^\d+$/);
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

  // 12-Nov-2026: Install в сетке больше не кнопка с data-product-id/data-modpack-id (сразу в корзину), а ссылка
  // на страницу модпака /modpacks/<slug>/#configure с конфигуратором #hosting-funnel.
  test("@regression Install в сетке ведёт на страницу своего модпака (#configure) и подписан его названием", async () => {
    const cards = modded.modpackCards();
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 50); i++) {
      const link = await modded.readInstallLink(cards.nth(i));
      expect(link.href, `install[${i}] href`).toMatch(/^https:\/\/godlike\.host\/modpacks\/[^/]+\/#configure$/);
      expect(link.label, `install[${i}] aria-label`).toBe(`Get server with ${link.title}`);
    }
  });
});
