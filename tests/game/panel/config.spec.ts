/**
 * Game panel — Config tab (Phase 3, soft mutation, self-cleaning).
 *
 * Таб Config = редактор server.properties. Save-кнопки нет → форма автосейвит при
 * изменении поля; персист проверяем через reload (повторный goto). Тест меняет только
 * `motd` (косметическая строка), затем ВОЗВРАЩАЕТ исходное значение. serial + общий
 * контекст; afterAll best-effort восстанавливает оригинал, чтобы прогон был чистым.
 *
 * Не требует запущенного сервера (форма доступна в любом статусе).
 */
import { test, expect, type BrowserContext } from "@playwright/test";
import { GamePanelConfigPage } from "../../../pages/game/GamePanelConfigPage";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_UUID,
} from "../../../utils/gameAuth";

const PROBE_SUFFIX = " [e2e]";

test.describe.configure({ mode: "serial" });

test.describe("@critical [game-panel] Config (server.properties)", () => {
  let context: BrowserContext;
  let config: GamePanelConfigPage;
  let originalMotd: string;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000); // login + навигация
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    const page = await context.newPage();
    config = new GamePanelConfigPage(page, GAME_SERVER_UUID);
    await config.goto();
    // оригинал; самолечение от возможного мусора прошлого упавшего прогона (срезаем хвост " [e2e]")
    originalMotd = (await config.getValue("motd")).replace(/( \[e2e\])+$/, "");
  });

  test.afterAll(async () => {
    try {
      if (originalMotd !== undefined) {
        await config.setValue("motd", originalMotd);
      }
    } catch {
      /* best-effort teardown */
    }
    await context.close();
  });

  test("TC-GP-CFG-001 | изменение motd сохраняется (автосейв) и откатывается", async () => {
    test.setTimeout(120_000);
    const probeMotd = originalMotd + PROBE_SUFFIX; // гарантированно отличается от оригинала

    await test.step("задать тестовый motd и перезагрузить страницу", async () => {
      await config.setValue("motd", probeMotd);
      await config.goto(); // reload → проверяем, что значение реально сохранилось
    });
    await test.step("значение сохранилось", async () => {
      expect(await config.getValue("motd")).toBe(probeMotd);
    });

    await test.step("вернуть оригинал и перезагрузить", async () => {
      await config.setValue("motd", originalMotd);
      await config.goto();
    });
    await test.step("откат подтверждён", async () => {
      expect(await config.getValue("motd")).toBe(originalMotd);
    });
  });

  test("TC-GP-CFG-002 | Config рендерит ключевые свойства server.properties", async () => {
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
