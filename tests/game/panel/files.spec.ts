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
const RENAME_FROM = "qae2e-rename-from";
const RENAME_TO = "qae2e-rename-to";

test.describe.configure({ mode: "serial" });

test.describe("@critical [game-panel] Файловый менеджер", () => {
  let context: BrowserContext;
  let files: GamePanelFilesPage;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    const page = await context.newPage();
    files = new GamePanelFilesPage(page, GAME_SERVER_UUID);
    await files.goto();
    // на случай мусора от прошлого упавшего прогона
    await files.deleteEntryIfPresent(TEST_FOLDER);
    await files.deleteEntryIfPresent(RENAME_FROM);
    await files.deleteEntryIfPresent(RENAME_TO);
  });

  test.afterAll(async () => {
    try {
      await files.deleteEntryIfPresent(TEST_FOLDER);
      await files.deleteEntryIfPresent(RENAME_FROM);
      await files.deleteEntryIfPresent(RENAME_TO);
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

  test("TC-GP-FILE-004 | переименование папки: имя меняется (self-cleaning)", async () => {
    // precondition: исходная папка есть, целевого имени нет
    await files.deleteEntryIfPresent(RENAME_TO);
    if (!(await files.hasEntry(RENAME_FROM))) {
      await files.createFolder(RENAME_FROM);
    }
    await files.renameEntry(RENAME_FROM, RENAME_TO);

    await test.step("новое имя видно, старое исчезло", async () => {
      await expect(files.fileEntry(RENAME_TO)).toBeVisible();
      await expect(files.fileEntry(RENAME_FROM)).toBeHidden();
    });

    // self-cleaning: удаляем переименованную папку
    await files.deleteEntry(RENAME_TO);
    await expect(files.fileEntry(RENAME_TO)).toBeHidden();
  });
});
