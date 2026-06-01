/**
 * smoke.pages.spec.ts
 * ───────────────────
 * @smoke — Sanity tests that the three pages we care about load and that the
 * Vue calculator widgets actually mount. If these fail, every other spec is
 * meaningless.
 *
 * Pages exercised:
 *   1. https://godlike.host/                                      (WordPress)
 *   2. /modded-minecraft-server-hosting/  (#plan-calculator Vue)
 *   3. /minecraft-seeds/sky-haven-island-atm-10-seed/ (#seed-calculator Vue)
 *
 * Запуск:
 *   npx playwright test tests/smoke.pages.spec.ts --project=chromium
 *   npx playwright test tests/smoke.pages.spec.ts --project=chromium --headed
 */
import { test, expect } from "@playwright/test";
import { ModdedHostingPage } from "../../pages/ModdedHostingPage";
import { SeedPage } from "../../pages/SeedPage";
import { Urls } from "../../fixtures/test-data";
import { CookieBanner } from "../../components/CookieBanner";

test.describe("@smoke godlike.host pages load", () => {
  test("home loads and has 'godlike' in <title>", async ({ page }) => {
    const resp = await page.goto(Urls.home, { waitUntil: "domcontentloaded" });
    await new CookieBanner(page).dismissAll();
    expect(resp?.ok()).toBeTruthy();
    const title = await page.title();
    console.log(`[INFO] Home <title>: ${title}`);
    expect(title).toMatch(/godlike/i);
  });

  test("modded hosting page loads and calculator mounts", async ({ page }) => {
    const modded = new ModdedHostingPage(page);
    await modded.open();
    await expect(page).toHaveURL(/modded-minecraft-server-hosting/);

    await expect(modded.calculator.sliderThumb()).toBeVisible();

    const checkoutLink = modded.calculatorCheckoutLink();
    await expect(checkoutLink).toHaveAttribute("href", /productId=\d+/);

    const installCount = await modded.installButtons().count();
    console.log(`[INFO] modpacks-body__install buttons: ${installCount}`);
    expect(installCount).toBeGreaterThanOrEqual(1);
  });

  test("seed page loads and seed-calculator mounts", async ({ page }) => {
    const seed = new SeedPage(page);
    await seed.open();
    await expect(page).toHaveURL(/sky-haven-island-atm-10-seed/);

    await expect(seed.calculator.sliderThumb()).toBeVisible();

    const meta = await seed.readCalculatorMeta();
    console.log(`[INFO] seed meta:`, meta);

    expect(meta.cartBaseUrl).toMatch(/godlike\.host\/cart/);
    expect(meta.modpackId).toBeTruthy();
    expect(meta.seedId).toBeTruthy();
  });
});
