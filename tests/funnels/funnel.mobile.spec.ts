/**
 * funnel.mobile.spec.ts
 * ─────────────────────
 * Мобильная воронка корзины /mobile-cart (viewport 390×844, реактивный Vue-калькулятор).
 * Покрытие: загрузка + выбор игры/тарифа, смена тарифа/периода меняет цену, невалидный промокод.
 * Read-only: кнопку Order Now НЕ жмём — заказ не оформляем.
 */
import { test, expect, type Browser, type BrowserContext } from "@playwright/test";
import { MobileCartPage } from "../../pages/MobileCartPage";
import { Credentials } from "../../fixtures/test-data";
import { loginClientareaAndSaveSession } from "../../utils/clientareaAuth";
import { pinAmplitudeExperiments } from "../../utils/amplitude";

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});

const storageStatePath = "storageState.mobile.json";

// Число из строки цены — устойчиво к валютам и форматам ("$6,39" → 6.39).
function parsePrice(priceStr: string): number {
  const match = priceStr.replace(",", ".").match(/[\d]+(\.\d+)?/);
  return match ? parseFloat(match[0]) : NaN;
}

// Открыть мобильную корзину в свежем контексте: сессия + фикс A/B Amplitude (иначе flash-sale мешает флоу).
async function openMobileCart(
  browser: Browser,
): Promise<{ context: BrowserContext; cart: MobileCartPage }> {
  const context = await browser.newContext({ storageState: storageStatePath });
  await pinAmplitudeExperiments(context);
  const cart = new MobileCartPage(await context.newPage());
  await cart.goto();
  return { context, cart };
}

// Логин один раз — сессия переиспользуется всеми тестами через storageState.
test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginClientareaAndSaveSession(browser, {
    email: Credentials.email,
    password: Credentials.password,
    statePath: storageStatePath,
  });
});

test.describe("Мобильная воронка корзины", () => {
  test("@regression загрузка корзины и выбор игры/тарифа через поиск", async ({ browser }) => {
    const { context, cart } = await openMobileCart(browser);
    try {
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
    } finally {
      await context.close();
    }
  });

  test("@critical смена периода оплаты меняет итоговую цену", async ({ browser }) => {
    const { context, cart } = await openMobileCart(browser);
    try {
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
    } finally {
      await context.close();
    }
  });

  test("@critical смена тарифа (RAM) меняет итоговую цену", async ({ browser }) => {
    const { context, cart } = await openMobileCart(browser);
    try {
      let base = NaN;

      await test.step("Minecraft по чипу → базовая цена > 0", async () => {
        await cart.expectPlanDropdownDisabled();
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
    } finally {
      await context.close();
    }
  });

  test("@critical невалидный промокод: ошибка показана и цена не меняется", async ({ browser }) => {
    const { context, cart } = await openMobileCart(browser);
    try {
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
    } finally {
      await context.close();
    }
  });
});
