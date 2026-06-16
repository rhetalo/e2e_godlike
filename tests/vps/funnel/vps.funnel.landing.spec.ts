/**
 * vps.funnel.landing.spec.ts
 * ──────────────────────────
 * SUITE 1 VPS-воронки: лендинг /vps-hosting/ → клик Deploy Now ведёт в /cart-vps/.
 * Read-only.
 */
import { test, expect, type Browser } from "@playwright/test";
import { VpsPage } from "../../../pages/VpsPage";
import { CartBillingPage } from "../../../pages/CartBillingPage";
import { loginVpsSession, newPinnedContext } from "./vps.funnel.helpers";

test.use({ viewport: { width: 1800, height: 900 }, deviceScaleFactor: 1 });

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginVpsSession(browser);
});

test.describe("@regression VPS-лендинг — /vps-hosting/", () => {
  test("клик Deploy Now ведёт в /cart-vps/ и монтирует корзину", async ({ browser }) => {
    const context = await newPinnedContext(browser);
    const page = await context.newPage();
    const vps = new VpsPage(page);
    const cart = new CartBillingPage(page);

    try {
      await test.step("на лендинге есть кнопки Deploy Now", async () => {
        await vps.goto();
        await expect(vps.firstDeployButton).toBeVisible({ timeout: 15_000 });
        expect(await vps.deployButtons.count()).toBeGreaterThanOrEqual(1);
      });

      await test.step("клик → /cart-vps c productId + корзина отрисована", async () => {
        await vps.deployFirstPlan();
        // /\/cart-vps/ ловит обе формы URL от A/B (.../cart-vps?... и .../cart-vps/?...).
        expect(page.url()).toMatch(/\/cart-vps/);
        expect(page.url()).toMatch(/productId=\d+/);
        await expect(cart.billing.container).toBeVisible({ timeout: 15_000 });
      });
    } finally {
      await context.close();
    }
  });
});
