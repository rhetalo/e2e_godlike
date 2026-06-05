/**
 * Game panel — Tasks (Phase 4, структурный, read-only).
 *
 * Раздел /tasks: «All Tasks» (дефолтные задачи Send command / Send power action) +
 * «Scheduled Tasks» (запланированные). Работает offline. НЕ жмём Run/Configure
 * (Run выполняет задачу = мутация) — проверяем рендер.
 *
 * Подтверждено recon 05-Jun-2026 (BEM .server__tasks__panel / __task / __task-title).
 */
import { test, expect, type BrowserContext } from "@playwright/test";
import { GamePanelTasksPage } from "../../../pages/game/GamePanelTasksPage";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_UUID,
} from "../../../utils/gameAuth";

test.describe.configure({ mode: "serial" });

test.describe("@regression [game-panel] Tasks", () => {
  let context: BrowserContext;
  let tasks: GamePanelTasksPage;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    tasks = new GamePanelTasksPage(await context.newPage(), GAME_SERVER_UUID);
    await tasks.goto();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("TC-GP-TASK-001 | All Tasks: дефолтные задачи Send command и Send power action", async () => {
    await test.step("панели задач отрендерены", async () => {
      expect(await tasks.panels().count()).toBeGreaterThan(0);
    });
    await test.step("есть дефолтные задачи Send command / Send power action", async () => {
      expect(await tasks.hasTask("Send command")).toBe(true);
      expect(await tasks.hasTask("Send power action")).toBe(true);
    });
  });

  test("TC-GP-TASK-002 | секция Scheduled Tasks присутствует (с пустым состоянием)", async () => {
    await expect(tasks.scheduledTitle).toBeVisible();
    await expect(tasks.scheduledEmptyState).toBeVisible();
  });
});
