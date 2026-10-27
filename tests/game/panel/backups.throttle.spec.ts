/**
 * Бэкапы: лимит частоты (DEV-484, prod с 20-Oct-2026). Окно общее для серверных и папочных бэкапов:
 * прод - 1 бэкап в 3600 с на сервер.
 *
 * BKP-005: окно занято → meta.quota `refusal=throttled` + `retry_after`, Create Backup → 429 с единым текстом,
 *          в UI тост ошибки, строки нового бэкапа нет.
 *          DEV-586 (prod 27-Oct-2026): в 429 `error_code: backup_throttled` + `retry_after` = заголовок Retry-After,
 *          в UI ровно один тост «Backup limit reached… try again in N minutes» (было два).
 *
 * ⚠️ МУТАЦИЯ, только test_e2e_mut_java (fd965a60, D-026; ок владельца 23-Oct-2026). Если окно свободно - создаём
 * один бэкап, чтобы его занять. Повторный прогон в пределах часа окно уже застаёт занятым и бэкап не создаёт.
 * Teardown удаляет бэкапы этого спека (удаление освобождает и окно частоты - DEV-484/OBS-3).
 * Заглушка «Slots Limit Reached» (free = 0) - в backups.slots-full.spec.ts (BKP-006, read-only на сервере 3/3): здесь
 * слоты не заполнить - ручные бэкапы упираются в окно, а баз на тарифе Double нет (0 databases remaining).
 */
import type { BrowserContext } from "@playwright/test";
import { test, expect } from "../../../fixtures/diagnostics";
import { GamePanelBackupsPage } from "../../../pages/game/GamePanelBackupsPage";
import { BackupsListResponse } from "../../../utils/schemas";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_MUT_JAVA_UUID,
  GAME_SERVER_MUT_JAVA_NAME,
} from "../../../utils/gameAuth";

const OCCUPY = "qa-484-window-a"; // занимает окно частоты (создаётся, только если окно свободно)
const REFUSED = "qa-484-window-b"; // должен получить 429 и не появиться

/** Текст тоста отказа по окну (DEV-586, new-panel!574): минуты округляются вверх, последняя минута - «in a minute». */
const throttledToastText = (retryAfter: number): string =>
  `Backup limit reached for this server. Please try again ${
    retryAfter <= 60 ? "in a minute" : `in ${Math.ceil(retryAfter / 60)} minutes`
  }.`;

test.describe.configure({ mode: "serial" });

test.describe("@regression [game-panel] Бэкапы: лимит частоты (DEV-484)", () => {
  let context: BrowserContext;
  let backups: GamePanelBackupsPage;

  const readQuota = async () => BackupsListResponse.parse((await backups.gotoCapturingList()).json).meta.quota;

  /** Занять окно частоты одним бэкапом, если оно свободно. Возвращает квоту после этого. */
  const occupyWindow = async () => {
    const before = await readQuota();
    if (before.can_create) {
      await backups.createBackup(OCCUPY);
      return readQuota();
    }
    return before;
  };

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    backups = new GamePanelBackupsPage(await context.newPage(), GAME_SERVER_MUT_JAVA_UUID, GAME_SERVER_MUT_JAVA_NAME);
  });

  test.afterAll(async () => {
    test.setTimeout(240_000);
    // удалять только COMPLETED (незавершённый бэкап удаляется ненадёжно, KB UP/backups правило 4)
    await backups.waitSettledForDelete(OCCUPY);
    await backups.deleteIfPresent(OCCUPY);
    await backups.deleteIfPresent(REFUSED);
    await context.close();
  });

  test(
    "TC-GP-BKP-005 | окно частоты занято: quota throttled, Create Backup → 429 и тост, бэкап не создан",
    { tag: "@regression", annotation: { type: "issue", description: "DEV-484" } },
    async () => {
      test.setTimeout(240_000);
      const quota = await occupyWindow();
      test.skip(quota.refusal === "no_free_slots", "на fd965a60 нет свободных слотов - проверять нечего, сначала освободить");

      await test.step("meta.quota: окно занято, слоты свободны", async () => {
        expect(quota.refusal).toBe("throttled");
        expect(quota.can_create).toBe(false);
        expect(quota.free).toBeGreaterThan(0);
        expect(quota.retry_after ?? 0).toBeGreaterThan(0);
        expect(quota.retry_after ?? 0).toBeLessThanOrEqual(3600);
      });

      const result = await backups.submitBackupCapturing(REFUSED);

      await test.step("POST backups/instances → 429 с единым текстом лимита, error_code и retry_after (DEV-586)", async () => {
        expect(result.status).toBe(429);
        expect(result.message).toMatch(/^Only \d+ backups may be generated within a \d+ second span of time\.$/);
        expect(result.errorCode).toBe("backup_throttled");
        expect(result.retryAfter ?? 0).toBeGreaterThan(0);
        expect(result.retryAfterHeader).toBe(String(result.retryAfter));
      });

      await test.step("в UI ровно один тост с минутами до повтора (DEV-586), строки отклонённого бэкапа нет", async () => {
        await expect(backups.errorToasts()).toContainText(throttledToastText(result.retryAfter ?? 0));
        await expect(backups.errorToasts()).toHaveCount(1); // до DEV-586 было два: «Request failed with status code 429» + текст бэка
        await backups.refresh();
        await expect(backups.backupRow(REFUSED)).toHaveCount(0);
      });
    },
  );
});
