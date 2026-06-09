/**
 * Game panel — Audit Log пишет действие (Phase 4 доп., online, @regression).
 *
 * Audit Log (раздел Sharing) фиксирует действия участников по ключу
 * (server:power.start / server:power.stop / ...). Поведенческая проверка: совершаем
 * обратимое power-действие (Start) → в Audit Log появляется запись `server:power.start`
 * от владельца. Recovery — ensureOffline в afterAll.
 *
 * ⚠️ Online: baseline = Offline (гарантируем в beforeAll), действие = Start. serial.
 * Audit Log обновляется через reload (как смена ролей §5e) → poll с goto().
 * Online-setup переиспользует GamePanelServerPage (ensureOnline/ensureOffline) из console.spec.ts.
 */
import { test, expect, type BrowserContext } from "@playwright/test";
import { GamePanelServerPage } from "../../../pages/game/GamePanelServerPage";
import { GamePanelSharingPage } from "../../../pages/game/GamePanelSharingPage";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_UUID,
  GAME_EMAIL,
} from "../../../utils/gameAuth";

test.describe.configure({ mode: "serial" });

test.describe("@regression [game-panel] Audit Log пишет действие", () => {
  let context: BrowserContext;
  let srv: GamePanelServerPage;
  let sharing: GamePanelSharingPage;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(300_000);
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    const page = await context.newPage();
    srv = new GamePanelServerPage(page, GAME_SERVER_UUID);
    sharing = new GamePanelSharingPage(page, GAME_SERVER_UUID);
    await srv.goto();
    await srv.ensureOffline(120_000); // baseline: гарантированно offline → Start будет реальным действием
  });

  test.afterAll(async () => {
    try {
      await srv.ensureOffline(120_000); // recovery: вернуть сервер в Offline
    } catch {
      /* best-effort teardown */
    }
    await context.close();
  });

  test("TC-GP-SHR-006 | Audit Log фиксирует power-действие (server:power.start)", async () => {
    test.setTimeout(300_000);

    await test.step("совершаем действие: Start сервера (→ server:power.start)", async () => {
      await srv.ensureOnline(240_000);
    });

    await test.step("Audit Log показывает свежую запись server:power.start от владельца", async () => {
      await expect
        .poll(
          async () => {
            await sharing.goto(); // Audit Log подтягивается на свежий fetch
            return sharing.getAuditText();
          },
          { timeout: 90_000, intervals: [3_000, 5_000, 5_000, 10_000] },
        )
        .toMatch(/server:power\.start/i);
      expect(await sharing.getAuditText()).toContain(GAME_EMAIL);
    });
  });
});
