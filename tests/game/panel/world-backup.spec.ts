/**
 * World Backup при удалении мира (DEV-418 + DEV-571, прод с 23-Oct-2026) - регресс «Continue Without Backup».
 *
 * WB-001: удаление `world` → «Save Your World First?» → Continue Without Backup: сначала abandon
 *         (отмена незавершённых копий), удаление только после его 200.
 * WB-002: abandon падает (500, подмена в браузере) → удаление не начинается, тост ошибки, окно остаётся.
 *
 * ⚠️ Мир не удаляем: все запросы удаления файлов обрывает route-guard (files.blockFileDeletion) ДО сценария.
 * Abandon на сервере без незавершённых копий ничего не меняет. «Create World Backup» не жмём.
 * Нужен мир на сервере под мутации (появляется после первого старта Paper); нет мира - skip с причиной.
 */
import type { BrowserContext } from "@playwright/test";
import { test, expect } from "../../../fixtures/diagnostics";
import { GamePanelFilesPage } from "../../../pages/game/GamePanelFilesPage";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_MUT_JAVA_UUID,
} from "../../../utils/gameAuth";

const WORLD = "world";

test.describe.configure({ mode: "serial" });

test.describe("@regression [game-panel] World Backup - Continue Without Backup", () => {
  let context: BrowserContext;
  let files: GamePanelFilesPage;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    files = new GamePanelFilesPage(await context.newPage(), GAME_SERVER_MUT_JAVA_UUID);
  });

  test.beforeEach(async () => {
    await files.blockFileDeletion(); // предохранитель: мир не удаляется ни при каком исходе
    await files.goto();
    test.skip(!(await files.hasEntry(WORLD)), "на сервере под мутации нет папки world - запустить сервер один раз");
  });

  test.afterEach(async () => {
    await files.clearDeletionRoutes();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test(
    "TC-GP-WB-001 | Continue Without Backup: сначала отмена незавершённых копий, потом удаление",
    { tag: "@regression", annotation: { type: "issue", description: "DEV-571" } },
    async () => {
      await files.confirmDeleteOf(WORLD);

      await test.step("удаление мира перехвачено окном «Save Your World First?»", async () => {
        await expect(files.worldBackupPrompt).toContainText(/Save your world first\?/i); // регистр в DOM - «Save your world first?», заглавные даёт CSS
        await expect(files.worldBackupContinueButton).toHaveText(/Continue Without Backup/i);
        await expect(files.worldBackupCreateButton).toHaveText(/Create World Backup/i); // ⚠️ не жмём
      });

      const sent = await files.continueWithoutWorldBackup();

      await test.step("abandon уходит первым, удаление - только после него", async () => {
        expect(sent).toEqual(["POST abandon", "POST files/trash"]);
        await expect(files.worldBackupPrompt).toBeHidden();
      });
    },
  );

  test(
    "TC-GP-WB-002 | abandon не прошёл: удаление не начинается, тост ошибки, окно для повтора",
    { tag: "@regression", annotation: { type: "issue", description: "DEV-571" } },
    async () => {
      await files.failWorldBackupAbandon();
      await files.confirmDeleteOf(WORLD);
      const sent = await files.continueWithoutWorldBackup();

      await test.step("после отказа abandon запроса удаления нет", async () => {
        expect(sent).toEqual(["POST abandon"]);
      });

      await test.step("пользователь видит причину и может повторить", async () => {
        await expect(files.errorToast).toContainText(/Could not cancel the World Backup/i);
        await expect(files.worldBackupPrompt).toBeVisible();
        await expect(files.worldBackupContinueButton).toBeEnabled();
      });

      await files.closeWorldBackupPrompt();
    },
  );
});
