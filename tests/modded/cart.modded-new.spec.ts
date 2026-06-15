/**
 * cart.modded-new.spec.ts
 * ───────────────────────
 * Конфигуратор воронки /cart-modded-new (НОВЫЙ UI — три custom-select дропдауна + "Order Now").
 *
 * Покрываем смену тарифа/биллинга/локации через выпадающие списки и реактивный пересчёт цены.
 * Вход — через Host Now калькулятора /modded-…/ (реальный путь; не хардкодим productId/promo,
 * которые плавают). Дропдауны видны только залогиненным → storageState-контекст.
 *
 * ⚠️ "Order Now" НЕ жмём — оформляет заказ (живой прод). Доезд до payment по этому UI — вне рамок.
 * Confirmed via MCP/scratch recon 13-Jun-2026.
 *
 * Запуск:
 *   npx playwright test tests/modded/cart.modded-new.spec.ts --project=chromium
 */
import { test, expect, type Browser, type BrowserContext } from "@playwright/test";
import { pinAmplitudeExperiments } from "../../utils/amplitude";
import { ModdedHostingPage } from "../../pages/ModdedHostingPage";
import { CartModdedNewPage } from "../../pages/CartModdedNewPage";
import { Credentials } from "../../fixtures/test-data";
import { loginClientareaAndSaveSession } from "../../utils/clientareaAuth";

const storageStatePath = "storageState.modded.json";

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginClientareaAndSaveSession(browser, {
    email: Credentials.email,
    password: Credentials.password,
    statePath: storageStatePath,
  });
});

/** Войти на /cart-modded-new через Host Now калькулятора (залогинено). */
async function openModdedNewCart(
  browser: Browser,
): Promise<{ context: BrowserContext; cart: CartModdedNewPage }> {
  const context = await browser.newContext({ storageState: storageStatePath });
  await pinAmplitudeExperiments(context);
  const page = await context.newPage();
  const modded = new ModdedHostingPage(page);
  await modded.open();
  await Promise.all([
    page.waitForURL(/\/cart-modded-new\/?\?/, { timeout: 30_000 }),
    modded.calculatorCheckoutLink().click(),
  ]);
  const cart = new CartModdedNewPage(page);
  await cart.waitReady();
  return { context, cart };
}

test.describe("Воронка /cart-modded-new — конфигурация через выпадающие списки", () => {
  test.setTimeout(120_000);

  test("@regression три дропдауна (план/биллинг/локация) и Order Now видны", async ({ browser }) => {
    const { context, cart } = await openModdedNewCart(browser);
    try {
      await expect(cart.planSelect()).toBeVisible();
      await expect(cart.billingSelect()).toBeVisible();
      await expect(cart.locationSelect()).toBeVisible();
      await expect(cart.orderButton()).toBeVisible();
      await expect(cart.orderButton()).toHaveText(/order now/i);

      const planOpts = await cart.optionTexts(cart.planSelect());
      console.log(`[INFO] план-опций: ${planOpts.length} (${planOpts.slice(0, 3).join(", ")}…)`);
      expect(planOpts.length).toBeGreaterThanOrEqual(5);
      expect(await cart.priceText()).toMatch(/[€$]\s?\d/);
    } finally {
      await context.close();
    }
  });

  test("@critical смена тарифа (плана) меняет выбор и пересчитывает цену", async ({ browser }) => {
    const { context, cart } = await openModdedNewCart(browser);
    try {
      const planBefore = await cart.toggleText(cart.planSelect());
      const priceBefore = await cart.priceText();
      console.log(`[INFO] до: план="${planBefore}" цена=${priceBefore}`);

      await cart.selectOption(cart.planSelect(), /Godlike/); // заметно более крупный тариф
      await expect.poll(() => cart.toggleText(cart.planSelect()), { timeout: 10_000 }).not.toBe(planBefore);
      await expect.poll(() => cart.priceText(), { timeout: 10_000 }).not.toBe(priceBefore);

      console.log(`[INFO] после: план="${await cart.toggleText(cart.planSelect())}" цена=${await cart.priceText()}`);
      expect(await cart.toggleText(cart.planSelect())).toMatch(/Godlike/i);
    } finally {
      await context.close();
    }
  });

  test("@regression смена биллинга меняет выбор и пересчитывает цену", async ({ browser }) => {
    const { context, cart } = await openModdedNewCart(browser);
    try {
      const billingBefore = await cart.toggleText(cart.billingSelect());
      const priceBefore = await cart.priceText();
      console.log(`[INFO] до: биллинг="${billingBefore}" цена=${priceBefore}`);

      await cart.selectOption(cart.billingSelect(), /12 Months/);
      await expect.poll(() => cart.toggleText(cart.billingSelect()), { timeout: 10_000 }).not.toBe(billingBefore);
      await expect.poll(() => cart.priceText(), { timeout: 10_000 }).not.toBe(priceBefore);

      console.log(`[INFO] после: биллинг="${await cart.toggleText(cart.billingSelect())}" цена=${await cart.priceText()}`);
      expect(await cart.toggleText(cart.billingSelect())).toMatch(/12 Months/i);
    } finally {
      await context.close();
    }
  });

  test("@regression смена локации меняет выбор", async ({ browser }) => {
    const { context, cart } = await openModdedNewCart(browser);
    try {
      const locBefore = await cart.toggleText(cart.locationSelect());
      const chosen = await cart.selectDifferentOption(cart.locationSelect());
      console.log(`[INFO] локация: "${locBefore}" → выбрано "${chosen}"`);
      expect(chosen).not.toBe(locBefore);
      await expect.poll(() => cart.toggleText(cart.locationSelect()), { timeout: 10_000 }).not.toBe(locBefore);
    } finally {
      await context.close();
    }
  });
});
