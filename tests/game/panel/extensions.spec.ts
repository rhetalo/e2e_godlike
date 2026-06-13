/**
 * Game panel — Plugins/Mods + Modpacks (каталог), структурный, read-only.
 *
 * /extensions и /modpacks — ОДИН компонент .server__extensions (отличаются контентом).
 * Заголовок h1 = "Mods" / "Modpacks"; фильтр-кнопки + поиск + Category/Author. Работает offline.
 * ⚠️ Install НЕ жмём (установка = мутация) — проверяем рендер каталога.
 *
 * Подтверждено MCP-recon 06-Jun-2026 (BEM .server__extensions__*).
 */
import { test, expect, type BrowserContext } from "@playwright/test";
import { GamePanelExtensionsPage } from "../../../pages/game/GamePanelExtensionsPage";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_UUID,
} from "../../../utils/gameAuth";

test.describe.configure({ mode: "serial" });

test.describe("@regression [game-panel] Plugins/Mods + Modpacks (каталог)", () => {
  let context: BrowserContext;
  let ext: GamePanelExtensionsPage;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    ext = new GamePanelExtensionsPage(await context.newPage(), GAME_SERVER_UUID);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("TC-GP-EXT-001 | Plugins/Mods: заголовок Mods, фильтр-кнопки и поиск рендерятся", async () => {
    await ext.gotoExtensions();

    await test.step("каталог и заголовок Mods видны", async () => {
      await expect(ext.root).toBeVisible();
      await expect(ext.headerTitle).toContainText(/Mods/i);
    });

    await test.step("фильтр-кнопки и поиск присутствуют", async () => {
      expect(await ext.typeButtons().count()).toBeGreaterThan(0);
      await expect(ext.searchInput).toBeVisible();
    });
  });

  test("TC-GP-EXT-002 | Modpacks: тот же компонент каталога с заголовком Modpacks", async () => {
    await ext.gotoModpacks();

    await test.step("каталог и заголовок Modpacks видны", async () => {
      await expect(ext.root).toBeVisible();
      await expect(ext.headerTitle).toContainText(/Modpacks/i);
      await expect(ext.searchInput).toBeVisible();
    });
  });
});
