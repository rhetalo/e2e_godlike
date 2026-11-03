/**
 * Upgrade ?ram=N (DEV-594, new-panel!576): запрос RAM сводится к наименьшему плану >= N из
 * реальной сетки тарифов (выше сетки - максимальный). Мусор и N <= текущей RAM - без Recommended.
 * Сюда ведут RAM-диалог модпака («Upgrade RAM» → ?ram=ceil(GB)) и Lag Score.
 *
 * ⚠️ Платёжный флоу: только открываем страницу и читаем Recommended / конфигуратор, план НЕ выбираем.
 * Диалог модпака сюда не выносим: если best_ram не выше RAM сервера, Install сразу ставит модпак.
 * Ручной QA prod 02-Nov-2026, recon 03-Nov-2026 (kb/tickets/DEV-594.md).
 */
import type { BrowserContext } from "@playwright/test";
import { test, expect } from "../../../fixtures/diagnostics";
import { GamePanelUpgradePage } from "../../../pages/game/GamePanelUpgradePage";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_UUID,
} from "../../../utils/gameAuth";

/** DoD тикета: модпак 5000 MB → ?ram=5 → план 6 GB (сетка на проде шагом 2 GB). */
const DOD_RAM = { query: "5", expectedGb: 6 };
/** Вне сетки: между ступенями (17 → 20) и выше максимального плана (200 → максимум). */
const BETWEEN_STEPS_GB = 17;
const ABOVE_GRID_GB = 200;
/** Мусор: без Recommended, конфигуратор на текущем плане. */
const INVALID_QUERIES = ["abc", "0", "-5"];

const issue = { type: "issue", description: "DEV-594" };

test.describe.configure({ mode: "serial" });

test.describe("@regression [game-panel] Upgrade: ?ram= округляется до плана из сетки", () => {
  let context: BrowserContext;
  let upgrade: GamePanelUpgradePage;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    upgrade = new GamePanelUpgradePage(await context.newPage(), GAME_SERVER_UUID);
  });

  test.afterAll(async () => {
    await context.close();
  });

  /** Открыть ?ram= и дождаться конфигуратора (тарифы загружены). */
  async function openWithRam(query: string): Promise<void> {
    await upgrade.gotoWithRam(query);
    await expect(upgrade.configuratorRam).toBeVisible({ timeout: 30_000 });
  }

  test("TC-GP-UPG-RAM-001 | ?ram=5 (5000 MB модпака) → Recommended и конфигуратор 6 GB", { annotation: issue }, async () => {
    await openWithRam(DOD_RAM.query);

    await test.step("карточка стала Recommended", async () => {
      await expect(upgrade.currentPlanPriceLabel).toHaveText(upgrade.recommendedLabelText);
    });

    await test.step(`Recommended и конфигуратор = ${DOD_RAM.expectedGb} GB`, async () => {
      await expect.poll(() => upgrade.currentPlanRamGb()).toBe(DOD_RAM.expectedGb);
      await expect.poll(() => upgrade.configuratorRamGb()).toBe(DOD_RAM.expectedGb);
    });
  });

  test("TC-GP-UPG-RAM-002 | ?ram= вне сетки → ступень вверх, выше сетки → максимальный план", { annotation: issue }, async () => {
    await test.step(`?ram=${BETWEEN_STEPS_GB}: Recommended не меньше запроса, совпадает с конфигуратором`, async () => {
      await openWithRam(String(BETWEEN_STEPS_GB));
      await expect(upgrade.currentPlanPriceLabel).toHaveText(upgrade.recommendedLabelText);
      await expect.poll(() => upgrade.currentPlanRamGb()).toBeGreaterThanOrEqual(BETWEEN_STEPS_GB);
      // до фикса ?ram=17 давал страницу без Recommended: такой ступени нет
      expect(await upgrade.currentPlanRamGb()).toBe(await upgrade.configuratorRamGb());
    });

    await test.step(`?ram=${ABOVE_GRID_GB}: Recommended = максимальный план (меньше запроса), совпадает с конфигуратором`, async () => {
      await openWithRam(String(ABOVE_GRID_GB));
      await expect(upgrade.currentPlanPriceLabel).toHaveText(upgrade.recommendedLabelText);
      await expect.poll(() => upgrade.currentPlanRamGb()).toBeLessThan(ABOVE_GRID_GB);
      expect(await upgrade.currentPlanRamGb()).toBe(await upgrade.configuratorRamGb());
    });
  });

  test("TC-GP-UPG-RAM-003 | мусор и ?ram= не выше текущей RAM → без Recommended", { annotation: issue }, async () => {
    for (const query of INVALID_QUERIES) {
      await test.step(`?ram=${query}: карточка текущего плана, не Recommended`, async () => {
        await openWithRam(query);
        await expect(upgrade.currentPlanPriceLabel).toHaveText(/\S/);
        await expect(upgrade.currentPlanPriceLabel).not.toHaveText(upgrade.recommendedLabelText);
      });
    }

    await test.step("?ram= равный текущей RAM: даунгрейд/тот же план не рекомендуется", async () => {
      const currentGb = await upgrade.currentPlanRamGb();
      expect(currentGb, "RAM текущего плана читается с карточки").not.toBeNull();
      await openWithRam(String(currentGb));
      await expect(upgrade.currentPlanPriceLabel).not.toHaveText(upgrade.recommendedLabelText);
      await expect.poll(() => upgrade.configuratorRamGb()).toBe(currentGb);
    });
  });
});
