/**
 * Game panel — Players tab (Phase 3, self-cleaning).
 *
 * - Структурный (offline-ok): таб /players рендерит .server__players + карточку
 *   "Server Administrators".
 * - Функциональный (online): whitelist add → list → remove через консоль (источник
 *   правды; управление игроками требует Online-сервера). Notch — реальный стабильный
 *   MC-аккаунт (резолвится на online-mode сервере). Игрок ВСЕГДА убирается из
 *   whitelist (в шаге remove и в afterAll), сервер гасится в afterAll.
 *
 * Подтверждено recon'ом 05-Jun-2026 (ответы консоли: "Added/Removed Notch ... whitelist",
 * "There are N whitelisted player(s): ...").
 */
import { test, expect, type BrowserContext } from "@playwright/test";
import { GamePanelServerPage } from "../../../pages/game/GamePanelServerPage";
import { GamePanelPlayersPage } from "../../../pages/game/GamePanelPlayersPage";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_UUID,
} from "../../../utils/gameAuth";

const TEST_PLAYER = "Notch"; // реальный стабильный MC-аккаунт

test.describe.configure({ mode: "serial" });

test.describe("@regression [game-panel] Players — структура таба", () => {
  let context: BrowserContext;
  let players: GamePanelPlayersPage;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    players = new GamePanelPlayersPage(await context.newPage(), GAME_SERVER_UUID);
    await players.goto();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("TC-GP-PLR-001 | таб Players рендерит блок игроков и карточку администраторов", async () => {
    await test.step("блок .server__players виден", async () => {
      await expect(players.area).toBeVisible();
    });

    await test.step("есть карточка 'Server Administrators'", async () => {
      expect(await players.hasCard("Server Administrators")).toBe(true);
    });
  });
});

test.describe("@critical [game-panel] Players — whitelist через консоль", () => {
  let context: BrowserContext;
  let srv: GamePanelServerPage;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(480_000); // сервер СИЛЬНО модовый — боот до «Done» долгий
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    srv = new GamePanelServerPage(await context.newPage(), GAME_SERVER_UUID);
    await srv.goto();
    await srv.ensureOnline(300_000);
    await srv.waitForConsoleReady(360_000); // модовый боот может занять минуты — ждём готовность щедро
  });

  test.afterAll(async () => {
    test.setTimeout(180_000); // запас хука над whitelist remove + ensureOffline + context.close
    // self-cleaning: гарантированно убрать игрока из whitelist + погасить сервер
    try {
      await srv.sendConsoleCommand(`whitelist remove ${TEST_PLAYER}`);
    } catch {
      /* best-effort */
    }
    try {
      await srv.ensureOffline(90_000);
    } catch {
      /* best-effort */
    }
    await context.close();
  });

  test("TC-GP-PLR-002 | whitelist add → list → remove игрока через консоль", async () => {
    test.setTimeout(120_000);

    await test.step(`add ${TEST_PLAYER} → консоль подтверждает`, async () => {
      await srv.sendConsoleCommand(`whitelist add ${TEST_PLAYER}`);
      await expect
        .poll(() => srv.getConsoleText(), { timeout: 30_000, intervals: [1_000, 2_000, 3_000] })
        .toMatch(new RegExp(`Added ${TEST_PLAYER} to the whitelist|already whitelisted`, "i"));
    });

    await test.step("whitelist list показывает игрока", async () => {
      await srv.sendConsoleCommand("whitelist list");
      await expect
        .poll(() => srv.getConsoleText(), { timeout: 30_000, intervals: [1_000, 2_000, 3_000] })
        .toMatch(new RegExp(`whitelisted player\\(s\\):[^\\n]*${TEST_PLAYER}`, "i"));
    });

    await test.step(`remove ${TEST_PLAYER} → консоль подтверждает (откат)`, async () => {
      await srv.sendConsoleCommand(`whitelist remove ${TEST_PLAYER}`);
      await expect
        .poll(() => srv.getConsoleText(), { timeout: 30_000, intervals: [1_000, 2_000, 3_000] })
        .toMatch(new RegExp(`Removed ${TEST_PLAYER} from the whitelist`, "i"));
    });
  });
});
