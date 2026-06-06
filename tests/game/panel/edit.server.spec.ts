/**
 * Game panel — Edit Server: переименование (МУТАЦИЯ, self-cleaning).
 *
 * Edit Server → меняем Server Name → Save Changes → заголовок обновляется реактивно → откатываем.
 * ⚠️ В диалоге есть деструктивный "Reinstall Server" — НЕ трогаем. Имя всегда возвращаем к исходному.
 *
 * Подтверждено MCP-recon 06-Jun-2026 (.edit__server-block__dialog, реактивный .server__overview-title).
 */
import { test, expect, type BrowserContext } from "@playwright/test";
import { GamePanelServerPage } from "../../../pages/game/GamePanelServerPage";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_UUID,
  GAME_SERVER_NAME,
} from "../../../utils/gameAuth";

test.describe.configure({ mode: "serial" });

test.describe("@critical [game-panel] Edit Server — переименование (self-cleaning)", () => {
  let context: BrowserContext;
  let server: GamePanelServerPage;
  const NEW_NAME = `${GAME_SERVER_NAME}_qa`;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    server = new GamePanelServerPage(await context.newPage(), GAME_SERVER_UUID);
    await server.goto();
  });

  test.afterAll(async () => {
    try {
      await server.setServerName(GAME_SERVER_NAME); // гарантированный откат имени
    } catch {
      /* best-effort teardown */
    }
    await context.close();
  });

  test("TC-GP-EDIT-001 | переименование сервера применяется и откатывается", async () => {
    await test.step(`сменить имя на ${NEW_NAME} → заголовок обновился`, async () => {
      await server.setServerName(NEW_NAME);
      await expect(server.overviewTitle).toHaveText(NEW_NAME);
    });
    await test.step(`откат к ${GAME_SERVER_NAME} → заголовок вернулся`, async () => {
      await server.setServerName(GAME_SERVER_NAME);
      await expect(server.overviewTitle).toHaveText(GAME_SERVER_NAME);
    });
  });
});
