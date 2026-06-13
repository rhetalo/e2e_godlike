/**
 * Game panel — Power lifecycle (Phase 2, STATEFUL/MUTATING).
 *
 * Реально стартует/перезапускает/глушит тестовый сервер. serial + общий контекст;
 * afterAll возвращает сервер в Offline. Каждый тест сам выставляет precondition
 * через ensureOnline/ensureOffline (не зависит от соседа).
 *
 * Тайминги: первый старт ставит файлы/конфиги → до нескольких минут (отсюда
 * test.setTimeout). Стоп обычно ~30с.
 *
 * EULA: при первом старте появляется модалка «Accept Minecraft® EULA» —
 * clickStart() принимает её автоматически (acceptEulaIfPresent).
 */
import { test, expect, type BrowserContext } from "@playwright/test";
import { GamePanelServerPage } from "../../../pages/game/GamePanelServerPage";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_UUID,
} from "../../../utils/gameAuth";

test.describe.configure({ mode: "serial" });

test.describe("@critical [game-panel] Жизненный цикл питания", () => {
  let context: BrowserContext;
  let srv: GamePanelServerPage;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    const page = await context.newPage();
    srv = new GamePanelServerPage(page, GAME_SERVER_UUID);
    await srv.goto();
  });

  test.afterAll(async () => {
    // teardown: оставить сервер в Offline
    try {
      await srv.ensureOffline(120_000);
    } catch {
      /* best-effort: не валим прогон из-за уборки */
    }
    await context.close();
  });

  test("TC-GP-PWR-001 | Start приводит сервер в Online (и принимает Minecraft EULA)", async () => {
    test.setTimeout(360_000); // первый старт ставит файлы/конфиги

    await test.step("precondition: сервер Offline", async () => {
      await srv.ensureOffline(120_000);
    });

    await test.step("Start + EULA", async () => {
      await srv.clickStart();
    });

    await test.step("дожидаемся Online", async () => {
      await srv.waitForOnline(330_000);
      expect(await srv.isOnline()).toBe(true);
    });
  });

  test("TC-GP-PWR-002 | Restart проводит сервер через полный цикл обратно в Online", async () => {
    test.setTimeout(300_000);

    await test.step("precondition: сервер Online", async () => {
      await srv.ensureOnline(300_000);
    });

    await test.step("Restart → сервер уходит из Running и возвращается Online", async () => {
      await srv.clickRestart();
      // надёжный сигнал: тоггл «Shut Down» исчезает (Stopping/Starting) → снова Online.
      // Это доказывает реальный рестарт, а не мгновенный no-op.
      await srv.waitForRestartCycle(300_000);
      expect(await srv.isOnline()).toBe(true);
    });
  });

  test("TC-GP-PWR-003 | Kill останавливает сервер (Offline)", async () => {
    test.setTimeout(180_000);

    await test.step("precondition: сервер Online", async () => {
      await srv.ensureOnline(300_000);
    });

    await test.step("Kill → подтверждение → Offline", async () => {
      await srv.clickKill();
      await srv.waitForOffline(120_000);
      expect(await srv.isOffline()).toBe(true);
    });
  });
});
