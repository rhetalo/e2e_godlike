/**
 * Game panel — Versions (server software), структурный + drill-down, read-only.
 *
 * /minecraft/versions: шапка "Currently running ..." + сетка семейств server-software
 * (Vanilla/Paper/NeoForge/...). Клик по семейству → список версий (Go Back + Show Snapshot
 * Versions). Работает offline. ⚠️ install = деструктивный rebuild — до установки НЕ доходим.
 *
 * Подтверждено MCP-recon 06-Jun-2026 (BEM .server__versions / .server__version).
 */
import { test, expect, type BrowserContext } from "@playwright/test";
import { GamePanelVersionsPage } from "../../../pages/game/GamePanelVersionsPage";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_UUID,
} from "../../../utils/gameAuth";

test.describe.configure({ mode: "serial" });

test.describe("@regression [game-panel] Versions (server software)", () => {
  let context: BrowserContext;
  let versions: GamePanelVersionsPage;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    versions = new GamePanelVersionsPage(await context.newPage(), GAME_SERVER_UUID);
    await versions.goto();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("TC-GP-VER-001 | шапка установленной версии и сетка семейств видны", async () => {
    await test.step("блок 'Currently running' с установленной версией виден", async () => {
      await expect(versions.installedBlock).toBeVisible();
      await expect(versions.installedBlock).toContainText(/Currently running/i);
    });

    await test.step("сетка семейств содержит несколько server-software", async () => {
      await expect(versions.grid).toBeVisible();
      expect(await versions.familyCards().count()).toBeGreaterThan(3);
    });

    await test.step("известные семейства присутствуют (Vanilla/Paper/NeoForge)", async () => {
      await expect(versions.familyByName("Vanilla").first()).toBeVisible();
      await expect(versions.familyByName("Paper").first()).toBeVisible();
      await expect(versions.familyByName("NeoForge").first()).toBeVisible();
    });
  });

  test("TC-GP-VER-002 | drill-down семейства открывает список версий (без установки)", async () => {
    await versions.openFamily("Vanilla");

    await test.step("в drill-down видны Go Back и тогл Show Snapshot Versions", async () => {
      await expect(versions.goBack).toBeVisible();
      await expect(versions.snapshotToggle).toBeVisible();
    });
  });
});
