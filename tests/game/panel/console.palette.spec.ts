/**
 * Game panel — Console "Commands" палитра (структурный, read-only, offline-safe).
 *
 * /console: кнопка "Commands" открывает searchable-справочник команд. Проверяем: палитра
 * открывается, содержит много команд, поиск фильтрует. ⚠️ Команды НЕ отправляем.
 *
 * Подтверждено MCP-recon 06-Jun-2026 (.command-item__title, "Search command...").
 */
import { test, expect, type BrowserContext } from "@playwright/test";
import { GamePanelConsolePage } from "../../../pages/game/GamePanelConsolePage";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_CONSOLE_UUID,
} from "../../../utils/gameAuth";

test.describe.configure({ mode: "serial" });

test.describe("@regression [game-panel] Console — Commands палитра", () => {
  let context: BrowserContext;
  let console: GamePanelConsolePage;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    console = new GamePanelConsolePage(await context.newPage(), GAME_SERVER_CONSOLE_UUID);
    await console.goto();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("TC-GP-CON-003 | палитра Commands открывается, фильтруется по поиску", async () => {
    await console.openPalette();
    let total = 0;

    await test.step("палитра открыта и содержит много команд", async () => {
      await expect(console.paletteSearch).toBeVisible();
      total = await console.paletteItems().count();
      expect(total).toBeGreaterThan(10);
    });

    await test.step("поиск 'whitelist' сужает список до команды whitelist", async () => {
      await console.filterPalette("whitelist");
      await expect(console.paletteItem("whitelist")).toBeVisible();
      await expect.poll(async () => console.paletteItems().count()).toBeLessThan(total);
    });

    await console.closePalette();
  });
});
