/**
 * smoke.pages.spec.ts
 * ───────────────────
 * @smoke — проверка, что три ключевые storefront-страницы грузятся и их Vue-калькуляторы
 * реально монтируются. Если падают эти — остальные спеки бессмысленны.
 *
 * Страницы:
 *   1. https://godlike.host/                                   (WordPress)
 *   2. /modded-minecraft-server-hosting/    (#plan-calculator Vue)
 *   3. /minecraft-seeds/sky-haven-island-atm-10-seed/  (#seed-calculator Vue)
 */
import { test, expect } from "../../fixtures/base";
import { ModdedHostingPage } from "../../pages/ModdedHostingPage";
import { SeedPage } from "../../pages/SeedPage";
import { Urls } from "../../fixtures/test-data";

test.describe("@smoke страницы godlike.host загружаются", () => {
  test("главная грузится и содержит 'godlike' в <title>", async ({ page }) => {
    const resp = await page.goto(Urls.home, { waitUntil: "domcontentloaded" });
    expect(resp?.ok()).toBeTruthy();
    expect(await page.title()).toMatch(/godlike/i);
  });

  test("страница modded-хостинга грузится и монтирует калькулятор", async ({ page }) => {
    const modded = new ModdedHostingPage(page);
    await modded.open();
    await expect(page).toHaveURL(/modded-minecraft-server-hosting/);

    await expect(modded.calculator.sliderThumb()).toBeVisible();
    await expect(modded.calculatorCheckoutLink()).toHaveAttribute("href", /productId=\d+/);
    expect(await modded.installButtons().count()).toBeGreaterThanOrEqual(1);
  });

  test("сид-страница грузится и монтирует seed-калькулятор", async ({ page }) => {
    const seed = new SeedPage(page);
    await seed.open();
    await expect(page).toHaveURL(/sky-haven-island-atm-10-seed/);

    await expect(seed.calculator.sliderThumb()).toBeVisible();

    const meta = await seed.readCalculatorMeta();
    expect(meta.cartBaseUrl).toMatch(/godlike\.host\/cart/);
    expect(meta.modpackId).toBeTruthy();
    expect(meta.seedId).toBeTruthy();
  });
});
