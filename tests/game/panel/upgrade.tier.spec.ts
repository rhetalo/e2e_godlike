/**
 * Upgrade: тир предложенного плана = тир сервера (DEV-547, new-panel!568). У Premium-сервера сетка See All Plans,
 * конфигуратор и ?ram= стартуют в Premium, у Budget - в Budget. Выбранный в сетке тир переживает Back
 * в конфигуратор и сбрасывается reload.
 *
 * ⚠️ Платёжный флоу: только переключаем тир (calc), Save Setup / Confirm не жмём.
 * Ручной QA prod 04-Nov-2026 (kb/tickets/DEV-547.md).
 */
import type { BrowserContext } from "@playwright/test";
import { test, expect } from "../../../fixtures/diagnostics";
import { GamePanelUpgradePage } from "../../../pages/game/GamePanelUpgradePage";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_UUID,
  GAME_SERVER_PREMIUM_UUID,
} from "../../../utils/gameAuth";

/** Сетка MC на проде - 13 планов; структурно не меньше, чем пол-сетки. */
const MIN_PLAN_CARDS = 6;
/** Карточка для переключения тира: план выше Double (текущего у обоих серверов). */
const SWITCH_PLAN = "Ultra";
/** ?ram= выше текущих 2 GB - вход «модпаку не хватает RAM». */
const RAM_QUERY = "5";

const issue = { type: "issue", description: "DEV-547" };

test.describe.configure({ mode: "serial" });

test.describe("@regression [game-panel] Upgrade: тир плана = тир сервера", () => {
  let context: BrowserContext;
  let premium: GamePanelUpgradePage;
  let budget: GamePanelUpgradePage;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    const page = await context.newPage();
    premium = new GamePanelUpgradePage(page, GAME_SERVER_PREMIUM_UUID);
    budget = new GamePanelUpgradePage(page, GAME_SERVER_UUID);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("TC-GP-UPG-TIER-001 | See All Plans: все карточки в тире сервера (Premium и Budget)", { annotation: issue }, async () => {
    for (const [po, tier] of [[premium, "Premium"], [budget, "Budget"]] as const) {
      await test.step(`${tier}-сервер: конфигуратор и сетка в ${tier}`, async () => {
        await po.goto();
        await expect(po.configuratorTierSelected).toHaveText(tier);
        await po.openAllPlans();
        await expect.poll(() => po.allPlansCards().count()).toBeGreaterThanOrEqual(MIN_PLAN_CARDS);
        // до фикса у Premium-сервера все карточки стартовали в Budget
        await expect.poll(async () => [...new Set(await po.allPlansCardTiers())]).toEqual([tier]);
      });
    }
  });

  test("TC-GP-UPG-TIER-002 | ?ram= на Premium: Recommended в Premium", { annotation: issue }, async () => {
    await premium.gotoWithRam(RAM_QUERY);

    await test.step("карточка Recommended, конфигуратор в Premium", async () => {
      await expect(premium.currentPlanPriceLabel).toHaveText(premium.recommendedLabelText);
      await expect(premium.configuratorTierSelected).toHaveText("Premium");
    });
  });

  test("TC-GP-UPG-TIER-003 | Budget в сетке → Back: конфигуратор в Budget, reload → снова Premium", { annotation: issue }, async () => {
    await premium.goto();
    await premium.openAllPlans();

    await test.step(`${SWITCH_PLAN}: переключить на Budget`, async () => {
      await premium.chooseAllPlansTier(SWITCH_PLAN, "Budget");
      await expect(premium.allPlansCardTierActive(SWITCH_PLAN)).toHaveText("Budget");
    });

    await test.step("Back: конфигуратор стартует в выбранном Budget", async () => {
      await premium.backToConfigurator();
      await expect(premium.configuratorTierSelected).toHaveText("Budget");
    });

    await test.step("reload: выбор сброшен, снова тир сервера", async () => {
      await premium.goto();
      await expect(premium.configuratorTierSelected).toHaveText("Premium");
    });
  });
});
