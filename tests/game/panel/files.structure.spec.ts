/**
 * Game panel — File manager диалоги/меню (структурный, read-only).
 *
 * FILE-003: per-row "..." меню (полный набор действий).
 * SFTP-001: SFTP Connect диалог (поля подключения + кнопки).
 * CF-001:   CurseForge upload-модпак диалог (file-input + Browse/Proceed).
 *
 * ⚠️ Ничего не сабмитим: Rename/Move/Archive/Delete из меню НЕ жмём; Generate/Save (SFTP) и
 * Proceed (CurseForge) НЕ жмём — открыли, проверили структуру, закрыли. Подтверждено MCP-recon 06-Jun.
 */
import { test, expect, type BrowserContext } from "@playwright/test";
import { GamePanelFilesPage } from "../../../pages/game/GamePanelFilesPage";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_UUID,
} from "../../../utils/gameAuth";

test.describe.configure({ mode: "serial" });

test.describe("@regression [game-panel] File manager — диалоги/меню", () => {
  let context: BrowserContext;
  let files: GamePanelFilesPage;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    files = new GamePanelFilesPage(await context.newPage(), GAME_SERVER_UUID);
    await files.goto();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("TC-GP-FILE-003 | per-row '...' меню: набор действий рендерится", async () => {
    await files.openAnyRowMenu();
    await test.step("меню открыто и содержит ключевые действия", async () => {
      expect(await files.rowMenuItems().count()).toBeGreaterThan(5);
      await expect(files.rowMenuItem("Rename")).toBeVisible();
      await expect(files.rowMenuItem("Delete")).toBeVisible();
      await expect(files.rowMenuItem("Copy path")).toBeVisible();
    });
    await files.closeOverlay();
  });

  test("TC-GP-SFTP-001 | SFTP Connect диалог: поля подключения + кнопки (без Generate/Save)", async () => {
    await files.openSftpDialog();
    await test.step("диалог с полями Host/Username и кнопками Open SFTP/Generate виден", async () => {
      await expect(files.activeDialog).toBeVisible();
      await expect(files.activeDialog).toContainText(/Host/i);
      await expect(files.activeDialog).toContainText(/Username/i);
      await expect(files.activeDialog).toContainText(/Open SFTP/i);
      await expect(files.activeDialog).toContainText(/Generate/i);
    });
    await files.closeOverlay();
  });

  test("TC-GP-CF-001 | CurseForge upload диалог: Browse/Proceed (без загрузки)", async () => {
    await files.openCurseForgeDialog();
    await test.step("диалог загрузки модпака виден", async () => {
      await expect(files.activeDialog).toBeVisible();
      await expect(files.activeDialog).toContainText(/Browse file/i);
      await expect(files.activeDialog).toContainText(/Proceed/i);
    });
    await files.closeOverlay();
  });
});
