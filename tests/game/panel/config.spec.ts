/**
 * Game panel — Server Properties tab (до 04-Nov-2026 «Config»; Phase 3).
 *
 * Таб = редактор server.properties. С 04-Nov-2026 автосейва нет: правка → save-bar
 * «Applied after a server restart» с Discard / Save & restart. Save & restart без подтверждения
 * сохраняет И перезапускает сервер (offline-сервер запускается) →
 *
 * - TC-GP-CFG-001 (stateful): на mut-сервере test_e2e_mut_java меняем motd, Save & restart,
 *   reload → значение сохранилось; возвращаем оригинал тем же путём. afterAll: откат motd
 *   (если отличается) + ensureOffline. serial + общий контекст.
 * - TC-GP-CFG-002 (read-only): на основном сервере ключевые свойства рендерятся.
 */
import { test, expect, type BrowserContext } from "@playwright/test";
import { GamePanelConfigPage } from "../../../pages/game/GamePanelConfigPage";
import { GamePanelServerPage } from "../../../pages/game/GamePanelServerPage";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_UUID,
  GAME_SERVER_MUT_JAVA_UUID,
} from "../../../utils/gameAuth";

const PROBE_SUFFIX = " [e2e]";

test.describe.configure({ mode: "serial" });

test.describe("@critical [game-panel] Server Properties — сохранение (Save & restart, mut-сервер)", () => {
  let context: BrowserContext;
  let config: GamePanelConfigPage;
  let srv: GamePanelServerPage;
  let originalMotd: string;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000); // login + навигация
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    const page = await context.newPage();
    config = new GamePanelConfigPage(page, GAME_SERVER_MUT_JAVA_UUID);
    srv = new GamePanelServerPage(page, GAME_SERVER_MUT_JAVA_UUID);
    await config.goto();
    // оригинал; самолечение от возможного мусора прошлого упавшего прогона (срезаем хвост " [e2e]")
    originalMotd = (await config.getValue("motd")).replace(/( \[e2e\])+$/, "");
  });

  test.afterAll(async () => {
    test.setTimeout(180_000); // откат (Save & restart) + ensureOffline
    try {
      await config.goto();
      if (originalMotd !== undefined && (await config.getValue("motd")) !== originalMotd) {
        await config.setValue("motd", originalMotd);
      }
    } catch {
      /* best-effort teardown */
    }
    try {
      await srv.goto();
      await srv.ensureOffline(90_000); // Save & restart запускает сервер — гасим
    } catch {
      /* best-effort teardown */
    }
    await context.close();
  });

  test("TC-GP-CFG-001 | изменение motd: Unsaved → Save & restart → сохранилось → откат", async () => {
    test.setTimeout(180_000);
    const probeMotd = originalMotd + PROBE_SUFFIX; // гарантированно отличается от оригинала

    await test.step("ввести тестовый motd → строка Unsaved, появился save-bar", async () => {
      await config.typeValue("motd", probeMotd);
      expect(await config.isDirty("motd")).toBe(true);
      await expect(config.saveBar).toContainText(/1 unsaved change/i);
      await expect(config.saveBar).toContainText(/after a server restart/i);
    });

    await test.step("Save & restart → после reload значение сохранилось", async () => {
      await config.saveAndRestart();
      await config.goto();
      expect(await config.getValue("motd")).toBe(probeMotd);
    });

    await test.step("вернуть оригинал (Save & restart) → после reload откат подтверждён", async () => {
      await config.setValue("motd", originalMotd);
      await config.goto();
      expect(await config.getValue("motd")).toBe(originalMotd);
    });
  });
});

test.describe("@critical [game-panel] Server Properties — структура (read-only)", () => {
  let context: BrowserContext;
  let config: GamePanelConfigPage;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    config = new GamePanelConfigPage(await context.newPage(), GAME_SERVER_UUID);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("TC-GP-CFG-002 | Server Properties рендерит ключевые свойства server.properties", async () => {
    await config.goto();

    await test.step("ключевые поля присутствуют", async () => {
      expect(await config.hasField("motd")).toBe(true);
      expect(await config.hasField("difficulty")).toBe(true);
      expect(await config.hasField("max-players")).toBe(true);
      expect(await config.hasField("level-name")).toBe(true);
    });

    await test.step("у level-name непустое значение", async () => {
      expect((await config.getValue("level-name")).length).toBeGreaterThan(0);
    });
  });
});
