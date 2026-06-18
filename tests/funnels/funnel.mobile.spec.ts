/**
 * funnel.mobile.spec.ts
 * ─────────────────────
 * Мобильная воронка корзины /mobile-cart (viewport 390×844, реактивный Vue-калькулятор).
 * Покрытие: загрузка + выбор игры/тарифа, смена тарифа/периода меняет цену, невалидный промокод.
 * Read-only: кнопку Order Now НЕ жмём — заказ не оформляем.
 *
 * Сценарии идут СЕРИЙНО по одной залогиненной странице: логин, контекст и
 * первичная навигация делаются один раз в beforeAll. Калькулятор — общее
 * изменяемое состояние, поэтому проверки «свежей страницы» (цена $0, тариф
 * заблокирован до выбора) валидны только в первом сценарии.
 */
import { test, expect, type BrowserContext } from "@playwright/test";
import { MobileCartPage } from "../../pages/MobileCartPage";
import { Credentials } from "../../fixtures/test-data";
import { loginClientareaAndSaveSession } from "../../utils/clientareaAuth";
import { pinAmplitudeExperiments } from "../../utils/amplitude";

const storageStatePath = "storageState.mobile.json";
// browser.newContext() НЕ наследует test.use({ viewport }) — задаём мобильный размер явно.
const MOBILE_VIEWPORT = { width: 390, height: 844 };

// Число из строки цены — устойчиво к валютам и форматам ("$6,39" → 6.39).
function parsePrice(priceStr: string): number {
  const match = priceStr.replace(",", ".").match(/[\d]+(\.\d+)?/);
  return match ? parseFloat(match[0]) : NaN;
}

test.describe.configure({ mode: "serial" });

test.describe("Мобильная воронка корзины", () => {
  let context: BrowserContext;
  let cart: MobileCartPage;

  // Логин + контекст + навигация — один раз. Сессия переиспользуется всеми
  // сценариями; pinAmplitudeExperiments фиксирует A/B (иначе flash-sale мешает флоу).
  test.beforeAll(async ({ browser }) => {
    await loginClientareaAndSaveSession(browser, {
      email: Credentials.email,
      password: Credentials.password,
      statePath: storageStatePath,
    });
    context = await browser.newContext({
      storageState: storageStatePath,
      viewport: MOBILE_VIEWPORT,
      deviceScaleFactor: 2,
    });
    await pinAmplitudeExperiments(context);
    cart = new MobileCartPage(await context.newPage());
    await cart.goto();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("@regression загрузка корзины и выбор игры/тарифа через поиск", async () => {
    await test.step("страница загрузилась, тариф заблокирован, цена $0.00 до выбора", async () => {
      await expect(cart.pageTitle).toHaveText("Configure your Plan", { timeout: 15_000 });
      await expect(cart.gameSelect).toBeVisible();
      await expect(cart.orderButton).toContainText("Order Now");
      await expect(cart.gameChips.first()).toBeVisible();
      expect(await cart.gameChips.count()).toBeGreaterThanOrEqual(3);
      await cart.expectPlanDropdownDisabled();
      await expect(cart.totalPrice).toBeVisible();
      expect(parsePrice(await cart.getTotalPrice())).toBe(0);
    });

    await test.step("поиск Rust → тариф разблокирован → выбор Compound", async () => {
      await cart.selectGameBySearch("Rust");
      await cart.expectPlanDropdownEnabled();
      await cart.selectPlan("Compound");
      const plan = await cart.getSelectedPlan();
      expect(plan).toContain("Compound");
      expect(plan).toContain("GB");
    });
  });

  test("@critical смена периода оплаты меняет итоговую цену", async () => {
    let monthly = NaN;

    await test.step("Minecraft по чипу → цена за 1 месяц > 0", async () => {
      await cart.selectGameByChip("Minecraft");
      monthly = parsePrice(await cart.getTotalPrice());
      expect(monthly).toBeGreaterThan(0);
    });

    await test.step("период 3 Months → итоговая цена выросла", async () => {
      await cart.selectBillingPeriod("3 Months");
      // Цена пересчитывается реактивно — поллим число, а не спим.
      await expect
        .poll(async () => parsePrice(await cart.getTotalPrice()), { timeout: 5_000 })
        .toBeGreaterThan(monthly);
      expect(await cart.getSelectedBillingPeriod()).toContain("3 Months");
    });
  });

  test("@critical смена тарифа (RAM) меняет итоговую цену", async () => {
    let base = NaN;

    // Примечание: проверка «дропдаун заблокирован до выбора» здесь не повторяется —
    // в serial-режиме игра уже выбрана; это поведение покрыто первым сценарием.
    await test.step("Minecraft по чипу → базовая цена > 0", async () => {
      await cart.selectGameByChip("Minecraft");
      base = parsePrice(await cart.getTotalPrice());
      expect(base).toBeGreaterThan(0);
    });

    await test.step("старший тариф Godlike → цена выросла относительно базовой", async () => {
      await cart.selectPlan("Godlike");
      await expect
        .poll(async () => parsePrice(await cart.getTotalPrice()), {
          timeout: 5_000,
          intervals: [300, 500, 1000],
        })
        .toBeGreaterThan(base);
    });
  });

  test("@critical невалидный промокод: ошибка показана и цена не меняется", async () => {
    let base = NaN;

    await test.step("Minecraft по чипу → базовая цена > 0", async () => {
      await cart.selectGameByChip("Minecraft");
      base = parsePrice(await cart.getTotalPrice());
      expect(base).toBeGreaterThan(0);
    });

    await test.step("невалидный код → показана ошибка, скидка не применена", async () => {
      await cart.applyPromocode("ТЕСТ123");
      await expect(cart.promoResult).toBeVisible({ timeout: 10_000 });
      expect((await cart.getPromoResultText()).length).toBeGreaterThan(0);
      // Главное поведение: невалидный код НЕ изменил итоговую цену.
      await expect
        .poll(async () => parsePrice(await cart.getTotalPrice()), { timeout: 5_000 })
        .toBe(base);
    });
  });
});
