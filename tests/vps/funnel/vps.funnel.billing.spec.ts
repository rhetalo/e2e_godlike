/**
 * vps.funnel.billing.spec.ts
 * ──────────────────────────
 * SUITE 2 VPS-воронки: шаг Billing Cycle в /cart-vps/.
 * Периоды/цены/скидки, отражение выбора в summary, рост итоговой стоимости.
 * Read-only. Промо VPS20 предприменён из URL — скидки видны на всех периодах.
 *
 * Сценарии идут СЕРИЙНО по одной корзине: логин, контекст и Deploy→Billing
 * делаются один раз в beforeAll (раньше каждый тест заново деплоил план).
 * Все сценарии лишь переключают радио «период оплаты» — конфликтов состояния нет.
 */
import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { CartBillingPage } from "../../../pages/CartBillingPage";
import {
  loginVpsSession,
  newPinnedContext,
  deployFirstPlan,
  parsePrice,
} from "./vps.funnel.helpers";

// ⚠️ Первый VPS-план (Nitro 1) предлагает только 3/6/12 мес — 1-месячный период для него убрали
// на проде (deploy-URL по умолчанию billingCycle=quarterly; confirmed live-recon 17-Jul-2026).
// Воронка деплоит именно ПЕРВЫЙ план, поэтому проверяем его реальный набор периодов (без «1 Month»).
const PERIODS = ["3 Months", "6 Months", "12 Months"];

test.describe.configure({ mode: "serial" });

test.describe("@regression VPS-воронка — шаг Billing Cycle", () => {
  let context: BrowserContext;
  let page: Page;
  let cart: CartBillingPage;

  // Логин + контекст + Deploy→Billing — один раз; сценарии серийно по одной корзине.
  test.beforeAll(async ({ browser }) => {
    await loginVpsSession(browser);
    context = await newPinnedContext(browser);
    page = await context.newPage();
    cart = new CartBillingPage(page);
    await deployFirstPlan(page);
    await cart.billing.container.waitFor({ state: "visible", timeout: 15_000 });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("периоды: 3 видны, цены ненулевые и уникальны", async () => {
    await test.step("все периоды (3/6/12) видны", async () => {
      for (const label of PERIODS) {
        await expect(cart.billing.period(label)).toBeVisible();
      }
    });

    await test.step("у каждого периода ненулевая цена, все уникальны", async () => {
      const prices: number[] = [];
      for (const label of PERIODS) {
        const priceEl = cart.billing.periodPrice(label);
        await expect(priceEl).toBeVisible({ timeout: 10_000 });
        const val = parsePrice(await priceEl.innerText());
        expect(val, `${label}: цена не распарсилась`).not.toBeNaN();
        expect(val, `${label}: цена 0`).toBeGreaterThan(0);
        prices.push(val);
      }
      expect(new Set(prices).size, "у периодов должны быть разные цены").toBe(PERIODS.length);
    });

    // Шаг «бейдж скидки на периоде» убран: прод удалил per-period discount-бейджи
    // (.period__discount) с VPS-корзины (confirmed live-recon 17-Jul-2026). Скидка VPS20
    // отражается в самих ценах; отдельного бейджа на карточке периода больше нет.
  });

  test("выбор периода отражается в summary; NEXT STEP активна", async () => {
    const caption = cart.order.detailCaption("Billing cycle");

    await test.step("каждый выбранный период попадает в Billing cycle summary", async () => {
      await expect(caption).toBeVisible({ timeout: 10_000 });
      // 1-месячного периода у первого плана нет (см. PERIODS) — перебираем доступные.
      for (const label of ["6 Months", "12 Months", "3 Months"]) {
        await cart.billing.selectCycle(label);
        await expect(caption).toContainText(label);
      }
    });

    await test.step("кнопка NEXT STEP видна и активна", async () => {
      await expect(cart.order.nextStepButton).toBeVisible();
      await expect(cart.order.nextStepButton).toBeEnabled();
    });
  });

  test("итоговая стоимость ненулевая и растёт с 3 до 12 месяцев", async () => {
    const total = cart.order.pricingPrice;
    await expect(total).toBeVisible({ timeout: 10_000 });

    let total3m = NaN;

    // Базой берём 3 месяца — минимальный доступный период у первого плана (1-месячного нет).
    await test.step("3 Months → стоимость > 0", async () => {
      await cart.billing.selectCycle("3 Months");
      await expect
        .poll(async () => parsePrice(await total.innerText()), { timeout: 5_000 })
        .toBeGreaterThan(0);
      total3m = parsePrice(await total.innerText());
    });

    await test.step("12 Months → стоимость за весь период больше, чем за 3 месяца", async () => {
      await cart.billing.selectCycle("12 Months");
      await expect
        .poll(async () => parsePrice(await total.innerText()), { timeout: 5_000 })
        .toBeGreaterThan(total3m);
    });
  });
});
