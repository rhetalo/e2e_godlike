/**
 * vps.funnel.billing.spec.ts
 * ──────────────────────────
 * SUITE 2 VPS-воронки: шаг Billing Cycle в /cart-vps/.
 * Периоды/цены/скидки, отражение выбора в summary, рост итоговой стоимости.
 * Read-only. Промо VPS20 предприменён из URL — скидки видны на всех периодах.
 */
import { test, expect, type Browser } from "@playwright/test";
import { CartBillingPage } from "../../../pages/CartBillingPage";
import {
  loginVpsSession,
  newPinnedContext,
  deployFirstPlan,
  parsePrice,
} from "./vps.funnel.helpers";

test.use({ viewport: { width: 1800, height: 900 }, deviceScaleFactor: 1 });

const PERIODS = ["1 Month", "3 Months", "6 Months", "12 Months"];

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginVpsSession(browser);
});

test.describe("@regression VPS-воронка — шаг Billing Cycle", () => {
  test("периоды: 4 видны, цены ненулевые и уникальны, есть бейджи скидки", async ({
    browser,
  }) => {
    const context = await newPinnedContext(browser);
    const page = await context.newPage();
    const cart = new CartBillingPage(page);

    try {
      await deployFirstPlan(page);
      await cart.billing.container.waitFor({ state: "visible", timeout: 15_000 });

      await test.step("все 4 периода видны", async () => {
        for (const label of PERIODS) {
          await expect(cart.billing.period(label)).toBeVisible();
        }
      });

      await test.step("у каждого периода ненулевая цена, все 4 уникальны", async () => {
        const prices: number[] = [];
        for (const label of PERIODS) {
          const priceEl = cart.billing.periodPrice(label);
          await expect(priceEl).toBeVisible({ timeout: 10_000 });
          const val = parsePrice(await priceEl.innerText());
          expect(val, `${label}: цена не распарсилась`).not.toBeNaN();
          expect(val, `${label}: цена 0`).toBeGreaterThan(0);
          prices.push(val);
        }
        expect(new Set(prices).size, "у периодов должны быть разные цены").toBe(4);
      });

      await test.step("у периодов есть бейдж скидки (VPS20)", async () => {
        const badges = cart.billing.discountBadges;
        expect(await badges.count()).toBeGreaterThanOrEqual(1);
        for (const t of await badges.allInnerTexts()) {
          expect(t.trim()).toMatch(/\d+%/);
        }
      });
    } finally {
      await context.close();
    }
  });

  test("выбор периода отражается в summary; NEXT STEP активна", async ({ browser }) => {
    const context = await newPinnedContext(browser);
    const page = await context.newPage();
    const cart = new CartBillingPage(page);

    try {
      await deployFirstPlan(page);
      await cart.billing.container.waitFor({ state: "visible", timeout: 15_000 });
      const caption = cart.order.detailCaption("Billing cycle");

      await test.step("каждый выбранный период попадает в Billing cycle summary", async () => {
        await expect(caption).toBeVisible({ timeout: 10_000 });
        for (const label of ["3 Months", "6 Months", "12 Months", "1 Month"]) {
          await cart.billing.selectCycle(label);
          await expect(caption).toContainText(label);
        }
      });

      await test.step("кнопка NEXT STEP видна и активна", async () => {
        await expect(cart.order.nextStepButton).toBeVisible();
        await expect(cart.order.nextStepButton).toBeEnabled();
      });
    } finally {
      await context.close();
    }
  });

  test("итоговая стоимость ненулевая и растёт с 1 до 12 месяцев", async ({ browser }) => {
    const context = await newPinnedContext(browser);
    const page = await context.newPage();
    const cart = new CartBillingPage(page);

    try {
      await deployFirstPlan(page);
      await cart.billing.container.waitFor({ state: "visible", timeout: 15_000 });
      const total = cart.order.pricingPrice;
      await expect(total).toBeVisible({ timeout: 10_000 });

      let total1m = NaN;

      await test.step("1 Month → стоимость > 0", async () => {
        await cart.billing.selectCycle("1 Month");
        await expect
          .poll(async () => parsePrice(await total.innerText()), { timeout: 5_000 })
          .toBeGreaterThan(0);
        total1m = parsePrice(await total.innerText());
      });

      await test.step("12 Months → стоимость за весь период больше, чем за 1 месяц", async () => {
        await cart.billing.selectCycle("12 Months");
        await expect
          .poll(async () => parsePrice(await total.innerText()), { timeout: 5_000 })
          .toBeGreaterThan(total1m);
      });
    } finally {
      await context.close();
    }
  });
});
