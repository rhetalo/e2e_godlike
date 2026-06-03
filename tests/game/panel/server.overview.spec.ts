/**
 * Game panel — Server overview (Phase 1 smoke, read-only).
 *
 * Структурные проверки страницы сервера: имя, статус, power-контролы,
 * таб-полоса контента, Server Information. НИКАКИХ мутаций (Start/Restart/Kill
 * не нажимаем — это Phase 2 с teardown).
 */
import { test, expect, type BrowserContext } from "@playwright/test";
import { GamePanelServerPage } from "../../../pages/game/GamePanelServerPage";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_UUID,
  GAME_SERVER_NAME,
} from "../../../utils/gameAuth";
import { GAME_PANEL_TABS } from "../../../utils/selectors";

test.describe("@smoke [game-panel] Обзор сервера", () => {
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
  });

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
  });

  test.afterEach(async () => {
    await context.close();
  });

  test("TC-GP-SRV-001 | обзор показывает имя сервера, статус и кнопки питания", async () => {
    const page = await context.newPage();
    const srv = new GamePanelServerPage(page, GAME_SERVER_UUID);
    await srv.goto();

    await test.step("имя сервера отображается", async () => {
      await expect(page.getByText(GAME_SERVER_NAME).first()).toBeVisible();
    });

    await test.step("кнопки питания присутствуют", async () => {
      await expect(srv.startButton).toBeVisible();
      await expect(srv.restartButton).toBeVisible();
      await expect(srv.killButton).toBeVisible();
    });

    await test.step("отрисовано известное слово статуса", async () => {
      expect(await srv.getStatusText()).toMatch(/Online|Offline|Starting|Stopping|Installing|Suspended/i);
    });
  });

  test("TC-GP-SRV-002 | все вкладки контента видны", async () => {
    const page = await context.newPage();
    const srv = new GamePanelServerPage(page, GAME_SERVER_UUID);
    await srv.goto();

    for (const name of GAME_PANEL_TABS) {
      await expect(srv.tab(name), `tab "${name}"`).toBeVisible();
    }
  });

  test("TC-GP-SRV-003 | Server Information показывает адрес и UUID", async () => {
    const page = await context.newPage();
    const srv = new GamePanelServerPage(page, GAME_SERVER_UUID);
    await srv.goto();

    await test.step("адрес srvN.godlike.club:PORT отображается", async () => {
      await expect(page.getByText(/srv\d+\.godlike\.club:\d+/i).first()).toBeVisible();
    });

    await test.step("UUID сервера показан в Server Information", async () => {
      await expect(page.getByText(GAME_SERVER_UUID).first()).toBeVisible();
    });
  });
});
