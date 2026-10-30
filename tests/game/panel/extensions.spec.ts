/**
 * Game panel — Plugins/Mods + Modpacks (каталог), структурный, read-only.
 *
 * /extensions и /modpacks — ОДИН компонент .server__extensions (отличаются контентом).
 * Заголовок h1 = "Mods" / "Modpacks"; фильтр-кнопки + поиск + Category/Author. Работает offline.
 * ⚠️ Install НЕ жмём (установка = мутация) — проверяем рендер каталога.
 *
 * Подтверждено MCP-recon 06-Jun-2026 (BEM .server__extensions__*).
 */
import type { BrowserContext } from "@playwright/test";
import { test, expect } from "../../../fixtures/diagnostics";
import { GamePanelExtensionsPage } from "../../../pages/game/GamePanelExtensionsPage";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_MODS_UUID,
} from "../../../utils/gameAuth";
import { GAME_PANEL_EXTENSIONS_API } from "../../../utils/selectors";

test.describe.configure({ mode: "serial" });

test.describe("@regression [game-panel] Plugins/Mods + Modpacks (каталог)", () => {
  let context: BrowserContext;
  let ext: GamePanelExtensionsPage;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    ext = new GamePanelExtensionsPage(await context.newPage(), GAME_SERVER_MODS_UUID); // вкладка Mods есть только на модовом ядре (29-Oct-2026)
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

  test(
    "TC-GP-EXT-002 | Modpacks: каталог рендерит карточки из ответа /minecraft/modpacks",
    { tag: "@regression" },
    async () => {
      // Слушатель ДО навигации: список грузится сразу при открытии /modpacks (live network 23-Oct-2026)
      const [resp] = await Promise.all([
        ext.page.waitForResponse((r) => GAME_PANEL_EXTENSIONS_API.modpacksList.test(r.url()), { timeout: 30_000 }),
        ext.gotoModpacks(),
      ]);
      const json = (await resp.json()) as { success: boolean; data: Array<{ name: string; type: string }> };

      await test.step("каталог и заголовок Modpacks видны, переключателя Mods/Plugins нет", async () => {
        await expect(ext.root).toBeVisible();
        await expect(ext.headerTitle).toContainText(/Modpacks/i);
        await expect(ext.searchInput).toBeVisible();
        await expect(ext.typeButtons()).toHaveCount(0); // фильтр-кнопки только у Mods/Plugins
      });

      await test.step("ответ /minecraft/modpacks успешен: непустой список модпаков", async () => {
        expect(resp.status()).toBe(200);
        expect(json.success).toBe(true);
        expect(json.data.length).toBeGreaterThan(0);
        expect(json.data.every((m) => m.type === "modpack")).toBe(true);
      });

      await test.step("карточки = элементы ответа, в том же порядке", async () => {
        await expect(ext.cards()).toHaveCount(json.data.length);
        await expect(ext.cardTitles().first()).toHaveText(json.data[0].name);
        await expect(ext.cardTitles().last()).toHaveText(json.data[json.data.length - 1].name);
      });
    },
  );
});
