/**
 * Upgrade: подписи доплаты CPU (DEV-660, new-panel!608). Опция CPU в WHMCS - надбавка к ядрам плана (`cpu_add`), поэтому
 * первый пункт списка = ядра плана «N vCores, included» (у Premium - «Max»), остальные - «+ N vCore(s)», без повторов.
 * До фикса доплата читалась как итог («1 vCores / 3.7 GHz»), а «2 vCores» стояло в списке дважды.
 *
 * ⚠️ Платёжный флоу: только читаем список, доплату не выбираем, Save Setup не жмём.
 * Язык - EN (новый контекст без i18nLocale). Ручной QA prod 05-Nov-2026 (kb/tickets/DEV-660.md).
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

/** ?ram=4 у Double Budget → Quadra Budget: сценарий бага (2 ядра в плане, доплата «2» давала дубль). */
const RAM_QUERY = "4";
/** Ядра плана: «2 vCores, included». */
const PLAN_CORES = /^\d+ vCores?, included$/;
/** Доплата: «+ 1 vCore», «+ 10 vCores». */
const ADDON = /^\+ \d+ vCores?$/;

const issue = { type: "issue", description: "DEV-660" };

test.describe.configure({ mode: "serial" });

test.describe("@regression [game-panel] Upgrade: подписи доплаты CPU", () => {
  let context: BrowserContext;
  let budget: GamePanelUpgradePage;
  let premium: GamePanelUpgradePage;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    const page = await context.newPage();
    budget = new GamePanelUpgradePage(page, GAME_SERVER_UUID);
    premium = new GamePanelUpgradePage(page, GAME_SERVER_PREMIUM_UUID);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("TC-GP-UPG-CPU-001 | Budget: ядра плана «included», доплаты с «+», без повторов", { annotation: issue }, async () => {
    await budget.gotoWithRam(RAM_QUERY);

    await test.step("в закрытом поле - ядра плана с пометкой included", async () => {
      await expect(budget.configuratorCpuValue).toHaveText(PLAN_CORES);
    });

    const options = await budget.configuratorCpuOptions();

    await test.step("список: первый пункт - ядра плана, остальные - доплаты, без повторов", async () => {
      expect(options[0]).toMatch(PLAN_CORES);
      expect(options.length).toBeGreaterThan(1);
      expect(options.slice(1).filter((o) => !ADDON.test(o))).toEqual([]);
      expect(new Set(options).size).toBe(options.length);
      expect(options, "одно ядро - в единственном числе").not.toContain("+ 1 vCores");
    });
  });

  test("TC-GP-UPG-CPU-002 | Premium: «Max» без included, доплаты с «+»", { annotation: issue }, async () => {
    await premium.goto();

    await test.step("в закрытом поле - Max", async () => {
      await expect(premium.configuratorCpuValue).toHaveText("Max");
    });

    const options = await premium.configuratorCpuOptions();

    await test.step("список: Max, затем только доплаты", async () => {
      expect(options[0]).toBe("Max");
      expect(options.slice(1).filter((o) => !ADDON.test(o))).toEqual([]);
    });
  });
});
