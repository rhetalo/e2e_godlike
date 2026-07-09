/**
 * Game panel — Security: инъекция в консоль (Phase 5 хвост, online, @regression).
 *
 * Завершает Phase 5: проверяем, что вывод консоли НЕ исполняет HTML/JS. Через безопасную
 * команду `say <payload>` (broadcast в чат, 0 игроков — состояние сервера НЕ меняет) сервер
 * эхо-печатает payload в лог; панель рендерит строку в .terminal. Утверждаем: payload виден
 * КАК ТЕКСТ (innerText содержит литерал) и нативный диалог НЕ срабатывает → reflected/stored
 * XSS в консоли нет.
 *
 * SQLi для консоли неприменима: командный инпут пишет в stdin игрового сервера, не в БД, —
 * поэтому реальный sink здесь — рендер терминала (XSS).
 *
 * ⚠️ Online: beforeAll поднимает сервер, afterAll гасит. serial + общий контекст.
 * Recovery: `say` ничего не персистит → восстановление состояния = ensureOffline в afterAll.
 * Паттерн online-setup переиспользует console.spec.ts (CON-001/002).
 */
import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { GamePanelServerPage } from "../../../pages/game/GamePanelServerPage";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_CONSOLE_UUID,
} from "../../../utils/gameAuth";

const XSS_CONSOLE = "<img src=x onerror=alert(8)>"; // payload в say-сообщение
const XSS_MARKER = "onerror=alert(8)";              // распознаём эхо в логе (виден как текст)

test.describe.configure({ mode: "serial" });

test.describe("@regression [game-panel] Security — инъекция в консоль", () => {
  let context: BrowserContext;
  let page: Page;
  let srv: GamePanelServerPage;
  let dialogFired = false;

  test.beforeAll(async ({ browser }) => {
    // Бюджет хука ≥ суммы ожиданий (ensureOnline 360 + waitForConsoleReady 360 = 720) — иначе
    // хук падал на медленном старте сервера (version-fetch лаг) раньше готовности консоли.
    test.setTimeout(780_000);
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    page = await context.newPage();
    // Любой нативный диалог (alert/confirm) = сработавший XSS — фиксируем и гасим.
    page.on("dialog", async (d) => {
      dialogFired = true;
      await d.dismiss().catch(() => {});
    });
    srv = new GamePanelServerPage(page, GAME_SERVER_CONSOLE_UUID);
    await srv.goto();
    await srv.ensureOnline(360_000);
    await srv.waitForConsoleReady(360_000);
  });

  test.afterAll(async () => {
    test.setTimeout(180_000); // запас хука над ensureOffline + context.close (фикс флоки teardown)
    try {
      await srv.ensureOffline(90_000); // recovery: вернуть сервер в Offline
    } catch {
      /* best-effort teardown */
    }
    await context.close();
  });

  test("TC-GP-SEC-005 | XSS-payload в выводе консоли не исполняется и виден как текст", async () => {
    test.setTimeout(120_000);
    dialogFired = false;

    await test.step("say с XSS-payload → эхо появляется в .terminal как ТЕКСТ", async () => {
      await srv.sendConsoleCommand(`say ${XSS_CONSOLE}`);
      await expect
        .poll(() => srv.getConsoleText(), { timeout: 30_000, intervals: [1_000, 2_000, 3_000] })
        .toContain(XSS_MARKER); // payload в логе дословно → не распарсен как HTML
    });

    await test.step("XSS не исполнился: нативный диалог не появлялся", async () => {
      expect(dialogFired).toBe(false);
    });
  });
});
