/**
 * Game panel — File manager диалоги/меню (структурный, read-only).
 *
 * FILE-003: per-row "..." меню (полный набор действий).
 * SFTP-001: SFTP Connect диалог (поля подключения + кнопки).
 * CF-001:   «Upload custom modpack» → апселл Custom Modpack Setup (с 16-Oct-2026) → «I’ll upload it myself»
 *           → CurseForge upload-диалог (file-input + Browse/Proceed).
 * CF-002:   тот же диалог, выбор manifest.json → только валидация (POST .../manifest/validate, read-only):
 *           запись без fileID пропускается с предупреждением, не-JSON отклоняется (DEV-556, 23-Oct-2026).
 *
 * ⚠️ Ничего не сабмитим: Rename/Move/Archive/Delete из меню НЕ жмём; Generate/Save (SFTP) и
 * Proceed (CurseForge) и Order now (апселл) НЕ жмём — открыли, проверили структуру, закрыли. Подтверждено
 * MCP-recon 06-Jun; апселл - recon 18-Oct. Клики по апселлу шлют только аналитику (POST .../modpack-setup/events).
 */
import type { BrowserContext } from "@playwright/test";
import { test, expect } from "../../../fixtures/diagnostics";
import { CurseForgeManifests } from "../../../fixtures/test-data";
import { GamePanelFilesPage } from "../../../pages/game/GamePanelFilesPage";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_FILE_UUID,
  GAME_SERVER_MODS_UUID,
} from "../../../utils/gameAuth";

// Ядровый текстовый файл MC — гарантированно есть на сервере (его же правит Config-таб).
const EDITOR_FILE = "server.properties";

test.describe.configure({ mode: "serial" });

test.describe("@regression [game-panel] File manager — диалоги/меню", () => {
  let context: BrowserContext;
  let files: GamePanelFilesPage;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    files = new GamePanelFilesPage(await context.newPage(), GAME_SERVER_FILE_UUID);
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

  test("TC-GP-FILE-005 | CodeMirror-редактор открывает текстовый файл (read-only)", async () => {
    await files.goto(); // к чистому списку файлов (предыдущий тест мог оставить overlay)
    await files.openFileInEditor(EDITOR_FILE);

    await test.step("редактор смонтирован и содержит контент файла", async () => {
      await expect(files.editorContent).toBeVisible();
      expect((await files.getEditorText()).length).toBeGreaterThan(0);
    });

    await files.leaveEditor(); // уходим без сохранения (ничего не редактировали)
  });
});

// «Upload custom modpack» активна только на модовом ядре (DEV-549: кнопка по ядру). С 29-Oct-2026
// автоопределение честно пометило файловый сервер ec78834c как Paper → кнопка disabled →
// CF-001/CF-002 гоняем на сервере с модовым ядром (GAME_SERVER_MODS_UUID). Оба read-only.
test.describe("@regression [game-panel] File manager — Upload custom modpack (модовое ядро)", () => {
  let context: BrowserContext;
  let files: GamePanelFilesPage;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    files = new GamePanelFilesPage(await context.newPage(), GAME_SERVER_MODS_UUID);
    await files.goto();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("TC-GP-CF-001 | Upload custom modpack: апселл Modpack setup → «I’ll upload it myself» → CurseForge диалог (без заказа/загрузки)", async () => {
    await files.openUploadCustomModpack();

    await test.step("сначала апселл Custom Modpack Setup: тарифы Lite/Pro, Order now, свой путь", async () => {
      await expect(files.modpackSetupDialog).toBeVisible();
      await expect(files.modpackSetupDialog).toContainText(/Modpack setup/i);
      expect(await files.modpackSetupCards.count()).toBeGreaterThanOrEqual(2);
      await expect(files.modpackSetupOrderButton).toBeVisible(); // ⚠️ не жмём - заказ
      await expect(files.modpackSetupDismissButton).toHaveText(/upload it myself/i);
    });

    await files.chooseSelfUpload();

    await test.step("«I’ll upload it myself» закрывает апселл и открывает CurseForge-диалог Browse/Proceed", async () => {
      await expect(files.modpackSetupDialog).toBeHidden();
      await expect(files.curseForgeDialog).toBeVisible();
      await expect(files.curseForgeDialog).toContainText(/Browse file/i);
      await expect(files.curseForgeDialog).toContainText(/Proceed/i);
    });

    await files.closeCurseForgeDialog();
  });

  test(
    "TC-GP-CF-002 | manifest.json: битая запись пропускается с предупреждением, битый файл отклоняется (без установки)",
    { tag: "@regression", annotation: { type: "issue", description: "DEV-556" } },
    async () => {
      await files.openUploadCustomModpack();
      await files.chooseSelfUpload();
      await files.selectManifest("manifest.json", CurseForgeManifests.partial);

      await test.step("запись без fileID не блокирует манифест: «Manifest is valid» + список пропусков", async () => {
        await expect(files.curseForgeStatusSuccess).toContainText(/Manifest is valid/i);
        await expect(files.curseForgeSkippedEntries).toContainText(/will be skipped/i);
        await expect(files.curseForgeSkippedEntries).toContainText(/index 1 .*fileID/i);
        await expect(files.curseForgeProceed).toBeEnabled(); // ⚠️ не жмём - установка
      });

      await files.selectManifest("manifest.json", CurseForgeManifests.broken);

      await test.step("битый файл: понятный текст ошибки, предупреждение сброшено, Proceed выключен", async () => {
        await expect(files.curseForgeStatusError).toContainText(/Invalid JSON/i);
        await expect(files.curseForgeSkippedEntries).toBeHidden();
        await expect(files.curseForgeProceed).toBeDisabled();
      });

      await files.closeCurseForgeDialog();
    },
  );

});
