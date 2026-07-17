/**
 * vps.funnel.happy-path.spec.ts
 * ─────────────────────────────
 * SUITE 4 VPS-воронки: полный happy path до страницы оплаты WHMCS.
 * Deploy Now → Billing (1 Month) → Configure (OS Ubuntu + версия + локация Europe) → checkout.
 * ⚠️ Финальную кнопку оплаты НЕ жмём — доходим только до формы checkout.
 */
import { test, expect, type Browser } from "@playwright/test";
import { CartBillingPage } from "../../../pages/CartBillingPage";
import { VpsConfigPage } from "../../../pages/VpsConfigPage";
import { CheckoutPage } from "../../../pages/CheckoutPage";
import { loginVpsSession, newPinnedContext, deployFirstPlan } from "./vps.funnel.helpers";

test.use({ viewport: { width: 1800, height: 900 }, deviceScaleFactor: 1 });

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginVpsSession(browser);
});

test.describe("@smoke @critical VPS-воронка — полный happy path", () => {
  test("Deploy Now → Billing → Configure (OS + Location) → WHMCS checkout", async ({
    browser,
  }) => {
    const context = await newPinnedContext(browser);
    const page = await context.newPage();
    const cart = new CartBillingPage(page);
    const config = new VpsConfigPage(page);
    const checkout = new CheckoutPage(page);

    try {
      await test.step("Step 1: /vps-hosting/ → /cart-vps/ c productId", async () => {
        await deployFirstPlan(page);
        await cart.billing.container.waitFor({ state: "visible", timeout: 15_000 });
        // /\/cart-vps/ ловит обе формы URL от A/B (.../cart-vps?... и .../cart-vps/?...).
        expect(page.url()).toMatch(/\/cart-vps/);
        // productId уходит в URL корзины только ПОСЛЕ клика Deploy (кнопки — javascript:void(0)).
        expect(page.url()).toMatch(/productId=\d+/);
      });

      await test.step("Step 2: Billing — выбрать 3 Months → Next Step → Configure", async () => {
        // У первого VPS-плана 1-месячного периода нет (только 3/6/12) — берём минимальный доступный.
        await cart.billing.selectCycle("3 Months");
        await cart.order.clickNextStep();
        await config.waitForConfigureStep();
      });

      await test.step("Step 3: Configure — Ubuntu + версия + локация Europe", async () => {
        await config.selectOsType("Ubuntu");
        await expect(config.osDropdown).toBeVisible();

        await config.openOsDropdown();
        const firstVersion = config.osDropdownItems.first();
        const versionText = (await firstVersion.innerText()).trim();
        await firstVersion.click();
        await expect(config.orderServerType).toContainText(versionText);

        await config.selectLocation("Europe");
        expect(await config.getActiveLocationName()).toBe("Europe");
        await expect(config.orderLocation).toContainText("Europe");
      });

      await test.step("Step 4: Next Step → форма оплаты WHMCS (стоп, оплату не жмём)", async () => {
        // Достигли формы оплаты WHMCS — дальше СТОП, кнопку оплаты не жмём.
        await config.proceedToCheckout();
        expect(page.url()).toMatch(/clientarea\/cart\.php/);
        await expect(checkout.reviewHeading()).toBeVisible({ timeout: 15_000 });
        expect(await checkout.gatewayPanels().count()).toBeGreaterThanOrEqual(1);
      });
    } finally {
      await context.close();
    }
  });
});
