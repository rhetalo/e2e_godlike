/**
 * Game panel — Backups (Phase 3b, heavy mutation, self-cleaning).
 *
 * User story: владелец создаёт серверный бэкап, видит его в списке готовым (COMPLETED)
 * и удаляет. Self-cleaning: precondition + afterAll убирают тестовый бэкап, чтобы прогон
 * не съедал слоты (на тест-сервере их 3) и не оставлял мусор.
 *
 * ⚠️ НЕ жмём Restore (перезапишет сервер) и не трогаем чужой бэкап «111». Создаём/удаляем
 * ТОЛЬКО свой. Работает offline (запуск сервера не требуется). Create — async-джоба:
 * ждём статус COMPLETED перед удалением. Детали — KNOWLEDGE_BASE.md §5h.
 *
 * Подтверждено recon 05-Jun-2026 (.backups / .backups-list / .backups-list__action-menu).
 */
import { test, expect, type BrowserContext } from "@playwright/test";
import { GamePanelBackupsPage } from "../../../pages/game/GamePanelBackupsPage";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_UUID,
  GAME_SERVER_NAME,
} from "../../../utils/gameAuth";

const TEST_BACKUP = "qae2e-backup";

test.describe.configure({ mode: "serial" });

test.describe("[game-panel] Backups", () => {
  let context: BrowserContext;
  let backups: GamePanelBackupsPage;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000);
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    backups = new GamePanelBackupsPage(await context.newPage(), GAME_SERVER_UUID, GAME_SERVER_NAME);
    await backups.goto();
    await backups.deleteIfPresent(TEST_BACKUP); // мусор от прошлого упавшего прогона
  });

  test.afterAll(async () => {
    try {
      await backups.deleteIfPresent(TEST_BACKUP);
    } catch {
      /* best-effort teardown */
    }
    await context.close();
  });

  test("TC-GP-BKP-001 @critical | создание серверного бэкапа → COMPLETED → удаление", async () => {
    // create — async-джоба; на сильно модовом сервере (~700 MB+) до ~8 мин (см. §5h)
    test.setTimeout(600_000);

    await test.step("создаём серверный бэкап → строка появляется в списке", async () => {
      await backups.createBackup(TEST_BACKUP);
      await expect(backups.backupRow(TEST_BACKUP)).toBeVisible();
    });

    await test.step("ждём готовности бэкапа (COMPLETED; статус не обновляется без reload)", async () => {
      // ⚠️ статус в списке НЕ обновляется реактивно — поллим перезагрузкой (см. §5h)
      await expect
        .poll(async () => {
          await backups.refresh();
          return backups.isCompleted(TEST_BACKUP);
        }, { timeout: 540_000, intervals: [5_000, 10_000, 15_000] })
        .toBe(true);
    });

    await test.step("удаляем бэкап → строка исчезает из списка", async () => {
      await backups.deleteBackup(TEST_BACKUP);
      await expect(backups.backupRow(TEST_BACKUP)).toBeHidden();
    });
  });

  test("TC-GP-BKP-002 @regression | структура: форма create, список с квотой слотов, Scheduled", async () => {
    await test.step("форма создания: поле имени + кнопка Create Backup + табы типа", async () => {
      await expect(backups.nameInput).toBeVisible();
      await expect(backups.createButton).toBeVisible();
      expect(await backups.tabs().count()).toBeGreaterThanOrEqual(2);
    });

    await test.step("список бэкапов с квотой слотов (N/M slots used)", async () => {
      await expect(backups.list).toBeVisible();
      await expect(backups.quota).toHaveText(/\d+\s*\/\s*\d+\s+slots used/i);
    });

    await test.step("секция Scheduled Backups присутствует", async () => {
      await expect(backups.scheduledSection).toBeVisible();
    });
  });
});
