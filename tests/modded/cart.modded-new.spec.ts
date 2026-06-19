/**
 * cart.modded-new.spec.ts
 * ───────────────────────
 * Конфигуратор воронки /cart-modded-new (НОВЫЙ UI — три custom-select дропдауна + "Order Now").
 *
 * Покрываем смену тарифа/биллинга/локации через выпадающие списки и реактивный пересчёт цены.
 *
 * Сценарии идут СЕРИЙНО по одному залогиненному конфигуратору: логин, контекст и вход на
 * /cart-modded-new (лендинг /modded-…/ → Host Now) делаются ОДИН раз в beforeAll (раньше каждый
 * тест заходил заново). Конфигуратор — общее изменяемое состояние, но конфликтов нет: каждый
 * сценарий читает своё «до» и проверяет изменение. Тест смены плана (default→Godlike) должен идти
 * до остальных — он опирается на дефолтный план.
 *
 * Вход — через Host Now калькулятора (реальный путь; не хардкодим productId/promo, они плавают).
 * Дропдауны видны только залогиненным → storageState-контекст.
 *
 * ⚠️ "Order Now" НЕ жмём — оформляет заказ (живой прод). Доезд до payment по этому UI — вне рамок.
 * Confirmed via MCP/scratch recon 13-Jun-2026.
 *
 * Запуск:
 *   npx playwright test tests/modded/cart.modded-new.spec.ts --project=storefront
 */
import { test, expect, type BrowserContext } from "@playwright/test";
import { pinAmplitudeExperiments } from "../../utils/amplitude";
import { ModdedHostingPage } from "../../pages/ModdedHostingPage";
import { CartModdedNewPage } from "../../pages/CartModdedNewPage";
import { Credentials } from "../../fixtures/test-data";
import { loginClientareaAndSaveSession } from "../../utils/clientareaAuth";

const storageStatePath = "storageState.modded.json";

test.describe.configure({ mode: "serial" });

test.describe("Воронка /cart-modded-new — конфигурация через выпадающие списки", () => {
  test.setTimeout(120_000);

  let context: BrowserContext;
  let cart: CartModdedNewPage;

  // Логин + контекст + вход на /cart-modded-new (лендинг → Host Now) — один раз; сценарии серийно.
  test.beforeAll(async ({ browser }) => {
    await loginClientareaAndSaveSession(browser, {
      email: Credentials.email,
      password: Credentials.password,
      statePath: storageStatePath,
    });
    context = await browser.newContext({ storageState: storageStatePath });
    await pinAmplitudeExperiments(context);
    const page = await context.newPage();
    const modded = new ModdedHostingPage(page);
    await modded.open();
    await Promise.all([
      page.waitForURL(/\/cart-modded-new\/?\?/, { timeout: 30_000 }),
      modded.calculatorCheckoutLink().click(),
    ]);
    cart = new CartModdedNewPage(page);
    await cart.waitReady();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("@regression три дропдауна (план/биллинг/локация) и Order Now видны", async () => {
    await test.step("дропдауны и кнопка Order Now видимы", async () => {
      await expect(cart.planSelect()).toBeVisible();
      await expect(cart.billingSelect()).toBeVisible();
      await expect(cart.locationSelect()).toBeVisible();
      await expect(cart.orderButton()).toBeVisible();
      await expect(cart.orderButton()).toHaveText(/order now/i);
    });

    await test.step("≥5 планов в списке и цена отрендерена", async () => {
      const planOpts = await cart.optionTexts(cart.planSelect());
      expect(planOpts.length).toBeGreaterThanOrEqual(5);
      expect(await cart.priceText()).toMatch(/[€$]\s?\d/);
    });
  });

  test("@critical смена тарифа (плана) меняет выбор и пересчитывает цену", async () => {
    const planBefore = await cart.toggleText(cart.planSelect());
    const priceBefore = await cart.priceText();

    await cart.selectOption(cart.planSelect(), /Godlike/); // заметно более крупный тариф

    await test.step("выбран Godlike, цена пересчиталась", async () => {
      await expect.poll(() => cart.toggleText(cart.planSelect()), { timeout: 10_000 }).not.toBe(planBefore);
      await expect.poll(() => cart.priceText(), { timeout: 10_000 }).not.toBe(priceBefore);
      expect(await cart.toggleText(cart.planSelect())).toMatch(/Godlike/i);
    });
  });

  test("@regression смена биллинга меняет выбор и пересчитывает цену", async () => {
    const billingBefore = await cart.toggleText(cart.billingSelect());
    const priceBefore = await cart.priceText();

    await cart.selectOption(cart.billingSelect(), /12 Months/);

    await test.step("выбран 12 Months, цена пересчиталась", async () => {
      await expect.poll(() => cart.toggleText(cart.billingSelect()), { timeout: 10_000 }).not.toBe(billingBefore);
      await expect.poll(() => cart.priceText(), { timeout: 10_000 }).not.toBe(priceBefore);
      expect(await cart.toggleText(cart.billingSelect())).toMatch(/12 Months/i);
    });
  });

  test("@regression смена локации меняет выбор", async () => {
    const locBefore = await cart.toggleText(cart.locationSelect());
    const chosen = await cart.selectDifferentOption(cart.locationSelect());

    await test.step("выбрана другая локация", async () => {
      expect(chosen).not.toBe(locBefore);
      await expect.poll(() => cart.toggleText(cart.locationSelect()), { timeout: 10_000 }).not.toBe(locBefore);
    });
  });
});
