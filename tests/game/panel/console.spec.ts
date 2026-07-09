/**
 * Game panel — Live console (Phase 2+, STATEFUL).
 *
 * Консоль — websocket-лог сервера, источник правды по его действиям. Тесты требуют
 * Online-сервера: beforeAll поднимает его и ждёт готовности (маркер «Done»), afterAll
 * глушит в Offline. serial + общий контекст.
 *
 * Команда `list` — безопасная read-only (выводит число игроков), состояние не меняет.
 */
import { test, expect, type BrowserContext } from "@playwright/test";
import { GamePanelServerPage } from "../../../pages/game/GamePanelServerPage";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_CONSOLE_UUID,
} from "../../../utils/gameAuth";

test.describe.configure({ mode: "serial" });

test.describe("@critical [game-panel] Консоль", () => {
  let context: BrowserContext;
  let srv: GamePanelServerPage;

  test.beforeAll(async ({ browser }) => {
    // Бюджет хука ≥ суммы внутренних ожиданий (ensureOnline 360 + waitForConsoleReady 180 = 540),
    // иначе хук падал раньше, чем сервер успевал подняться на медленном старте (version-fetch лаг).
    test.setTimeout(600_000);
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    const page = await context.newPage();
    srv = new GamePanelServerPage(page, GAME_SERVER_CONSOLE_UUID);
    await srv.goto();
    await srv.ensureOnline(360_000);
    await srv.waitForConsoleReady(180_000);
  });

  test.afterAll(async () => {
    test.setTimeout(180_000); // запас хука над ensureOffline + context.close (фикс флоки teardown)
    try {
      await srv.ensureOffline(90_000);
    } catch {
      /* best-effort teardown */
    }
    await context.close();
  });

  test("TC-GP-CON-001 | консоль стримит лог сервера, поле команд доступно", async () => {
    await test.step("в логе есть серверный вывод", async () => {
      expect(await srv.getConsoleText()).toMatch(/INFO|Done \(|Pterodactyl|Server thread/i);
    });

    await test.step("поле ввода команд доступно", async () => {
      await expect(srv.consoleCommandInput).toBeVisible();
      await expect(srv.consoleCommandInput).toBeEnabled();
    });
  });

  test("TC-GP-CON-002 | команда list получает ответ в консоли", async () => {
    test.setTimeout(120_000);
    await srv.sendConsoleCommand("list");
    await expect
      .poll(async () => srv.getConsoleText(), { timeout: 30_000, intervals: [1_000, 2_000, 3_000] })
      .toMatch(/players online|There are \d+ of a max/i);
  });
});
