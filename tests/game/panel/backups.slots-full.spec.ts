/**
 * Бэкапы: все слоты заняты (DEV-484, prod с 20-Oct-2026) - заглушка «Slots Limit Reached».
 *
 * BKP-006: на сервере с quota.free = 0 форма создания закрыта заглушкой, Create Backup неактивна, счётчик и футер
 *          берут числа из meta.quota, удаление (меню «...» строки) остаётся доступным.
 *
 * Read-only. Сервер 9c891502 «DEV-484-db» (закрытая DEV-484): 3/3 слота заняты бэкапами баз, оставлены владельцем.
 * Ничего не создаём, не удаляем, Upgrade не жмём. Кто-то освободил слот - skip с причиной.
 * (На test_e2e_mut_java слоты не заполнить: тариф Double - 0 баз, ручные бэкапы упираются в окно частоты.)
 */
import type { BrowserContext } from "@playwright/test";
import { test, expect } from "../../../fixtures/diagnostics";
import { GamePanelBackupsPage } from "../../../pages/game/GamePanelBackupsPage";
import { BackupsListResponse } from "../../../utils/schemas";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_FULL_SLOTS_UUID,
  GAME_SERVER_FULL_SLOTS_NAME,
} from "../../../utils/gameAuth";

test.describe("@regression [game-panel] Бэкапы: все слоты заняты (DEV-484)", () => {
  let context: BrowserContext;
  let backups: GamePanelBackupsPage;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    backups = new GamePanelBackupsPage(await context.newPage(), GAME_SERVER_FULL_SLOTS_UUID, GAME_SERVER_FULL_SLOTS_NAME);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test(
    "TC-GP-BKP-006 | free = 0: заглушка Slots Limit Reached, создание закрыто, удаление доступно",
    { tag: "@regression", annotation: { type: "issue", description: "DEV-484" } },
    async () => {
      const list = await backups.gotoCapturingList();
      const { quota } = BackupsListResponse.parse(list.json).meta;
      test.skip(quota.free > 0, `на ${GAME_SERVER_FULL_SLOTS_NAME} освободили слот (free=${quota.free}) - заглушки нет, нужен сервер 3/3`);

      await test.step("meta.quota: слоты кончились, причина no_free_slots", async () => {
        expect(quota.can_create).toBe(false);
        expect(quota.refusal).toBe("no_free_slots");
        expect(quota.retry_after).toBeNull();
      });

      await test.step("заглушка Slots Limit Reached с Upgrade (не жмём), Create Backup неактивна", async () => {
        await expect(backups.slotsLimitTitle).toHaveText(/Slots Limit Reached/i);
        await expect(backups.slotsLimitUpgrade).toHaveAttribute("href", /\/upgrade$/);
        await expect(backups.createButton).toBeDisabled();
      });

      await test.step("счётчик и футер - числа бэкенда", async () => {
        await expect(backups.quota).toHaveText(new RegExp(`^\\s*${quota.used}\\s*/\\s*${quota.limit}\\s+slots used`, "i"));
        await expect(backups.footer).toContainText(/0 backups? remaining/i);
      });

      await test.step("удалить по-прежнему можно: у строк есть меню действий", async () => {
        await expect(backups.rows().first()).toBeVisible();
        await expect(backups.anyManageMenuButton).toBeVisible();
      });
    },
  );
});
