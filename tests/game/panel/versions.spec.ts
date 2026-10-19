/**
 * Game panel — Versions (server software), структурный + drill-down, read-only.
 *
 * /minecraft/versions: шапка "Currently running ..." + сетка семейств server-software
 * (Vanilla/Paper/NeoForge/...). Клик по семейству → список версий (Go Back + Show Snapshot
 * Versions). Работает offline. ⚠️ install = деструктивный rebuild — до установки НЕ доходим.
 *
 * Подтверждено MCP-recon 06-Jun-2026 (BEM .server__versions / .server__version).
 */
import { type BrowserContext } from "@playwright/test";
import { test, expect } from "../../../fixtures/diagnostics";
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
      await expect.poll(() => versions.familyCards().count()).toBeGreaterThan(3);
    });

    await test.step("известные семейства присутствуют (Vanilla/Paper/NeoForge)", async () => {
      await expect(versions.familyByName("Vanilla").first()).toBeVisible();
      await expect(versions.familyByName("Paper").first()).toBeVisible();
      await expect(versions.familyByName("NeoForge").first()).toBeVisible();
    });
  });

  test("TC-GP-VER-002 | drill-down семейства: список RELEASE-версий, тогл Snapshot расширяет его (без установки)", async () => {
    let releaseCount = 0;
    await versions.openFamily("Vanilla");

    await test.step("drill-down открыт: ?type=VANILLA, Go Back и тогл Show Snapshot Versions видны", async () => {
      await expect(versions.page).toHaveURL(/[?&]type=VANILLA(&|$)/i);
      await expect(versions.goBack).toBeVisible();
      await expect(versions.snapshotToggle).toBeVisible();
    });

    await test.step("список версий непустой и по умолчанию только RELEASE", async () => {
      await expect(versions.versionCards().first()).toBeVisible();
      releaseCount = await versions.versionCards().count();
      expect(releaseCount).toBeGreaterThan(0);
      await expect.poll(() => versions.versionTypes()).toEqual(["RELEASE"]);
    });

    await test.step("Show Snapshot Versions: версий больше, появились SNAPSHOT", async () => {
      await versions.toggleSnapshots();
      await expect.poll(() => versions.versionCards().count()).toBeGreaterThan(releaseCount);
      await expect.poll(() => versions.versionTypes()).toEqual(expect.arrayContaining(["RELEASE", "SNAPSHOT"]));
    });

    await test.step("Go Back возвращает к сетке семейств", async () => {
      await versions.backToFamilies();
      await expect(versions.familyByName("Vanilla").first()).toBeVisible();
    });
  });
});
