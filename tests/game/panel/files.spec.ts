/**
 * Game panel — File manager (Phase 3, soft mutation, self-cleaning).
 *
 * Создаём папку → проверяем, что появилась → удаляем → проверяем, что исчезла.
 * Удаление переносит в Recycle Bin (24ч). serial + общий контекст; precondition и
 * afterAll/afterEach убирают тестовую папку, чтобы прогон был самоочищающимся.
 *
 * Не требует запущенного сервера (файловый менеджер работает в любом статусе).
 */
import { test, expect, type BrowserContext } from "@playwright/test";
import { GamePanelFilesPage } from "../../../pages/game/GamePanelFilesPage";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_UUID,
} from "../../../utils/gameAuth";

const TEST_FOLDER = "qae2e-folder";

test.describe.configure({ mode: "serial" });

test.describe("@critical [game-panel] File manager", () => {
  let context: BrowserContext;
  let files: GamePanelFilesPage;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    const page = await context.newPage();
    files = new GamePanelFilesPage(page, GAME_SERVER_UUID);
    await files.goto();
    await files.deleteEntryIfPresent(TEST_FOLDER); // на случай мусора от прошлого упавшего прогона
  });

  test.afterAll(async () => {
    try {
      await files.deleteEntryIfPresent(TEST_FOLDER);
    } catch {
      /* best-effort teardown */
    }
    await context.close();
  });

  test("TC-GP-FILE-001 | создание папки: появляется в списке файлов", async () => {
    await files.createFolder(TEST_FOLDER);
    await expect(files.fileEntry(TEST_FOLDER)).toBeVisible();
  });

  test("TC-GP-FILE-002 | удаление папки: исчезает из списка", async () => {
    // precondition: папка существует (создаём, если предыдущий тест не оставил)
    if (!(await files.hasEntry(TEST_FOLDER))) {
      await files.createFolder(TEST_FOLDER);
    }
    await files.deleteEntry(TEST_FOLDER);
    await expect(files.fileEntry(TEST_FOLDER)).toBeHidden();
  });
});
