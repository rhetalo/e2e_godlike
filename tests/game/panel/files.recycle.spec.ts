/**
 * Game panel — File manager Recycle Bin (Phase 3b остаток, мутация, self-cleaning).
 *
 * Удаление файла/папки переносит его в Recycle Bin (24ч), а не стирает навсегда.
 * Тест: создать папку → удалить (→ корзина) → убедиться, что она в Recycle Bin →
 * Restore → вернулась в корень → удалить (финальная уборка; уйдёт в корзину,
 * авто-очистка через 24ч). Restore и есть recovery — мутация полностью обратима.
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

const TRASH_FOLDER = "qae2e-trash-probe";

test.describe.configure({ mode: "serial" });

test.describe("@regression [game-panel] File manager — Recycle Bin", () => {
  let context: BrowserContext;
  let files: GamePanelFilesPage;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    files = new GamePanelFilesPage(await context.newPage(), GAME_SERVER_UUID);
    await files.goto();
    await files.deleteEntryIfPresent(TRASH_FOLDER); // мусор от прошлого упавшего прогона (из корня)
  });

  test.afterAll(async () => {
    try {
      await files.goto();
      await files.deleteEntryIfPresent(TRASH_FOLDER);
    } catch {
      /* best-effort teardown */
    }
    await context.close();
  });

  test("TC-GP-FILE-006 | удалённая папка лежит в Recycle Bin и восстанавливается (self-cleaning)", async () => {
    // precondition: папка существует в корне
    await files.goto();
    if (!(await files.hasEntry(TRASH_FOLDER))) {
      await files.createFolder(TRASH_FOLDER);
    }

    await test.step("удаляем папку → исчезает из корня (ушла в корзину)", async () => {
      await files.deleteEntry(TRASH_FOLDER);
      await expect(files.fileEntry(TRASH_FOLDER)).toBeHidden();
    });

    await test.step("папка видна в Recycle Bin", async () => {
      await files.openRecycleBin();
      await expect(files.fileEntry(TRASH_FOLDER)).toBeVisible();
    });

    await test.step("Restore возвращает папку в корень", async () => {
      await files.restoreEntry(TRASH_FOLDER);
      await files.goto();
      await expect(files.fileEntry(TRASH_FOLDER)).toBeVisible();
    });

    // self-cleaning: снова удаляем (уйдёт в корзину, авто-очистка 24ч)
    await files.deleteEntry(TRASH_FOLDER);
    await expect(files.fileEntry(TRASH_FOLDER)).toBeHidden();
  });
});
