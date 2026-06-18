/**
 * Game panel — Throttling / «Lag Detected» upgrade-модалка (Full E2E, MANUAL-ONLY). КОСТЯК.
 *
 * Поток: вебхук CPU-троттлинга (utils/throttlingWebhook) → панель показывает модалку
 * «Lag Detected» с предложением апгрейда. Проверяем структуру модалки + закрытие через
 * «Keep current plan». Upgrade НЕ жмём — платёжный флоу.
 *
 * ⚠️ MANUAL-ONLY (env-gate `RUN_THROTTLING_TEST`): успешный вебхук «сжигает» 3-дневное
 *    анти-спам-окно троттлинга сервера → НЕ для CI / не для регулярных прогонов. Запуск:
 *      RUN_THROTTLING_TEST=1 GAME_PANEL_THROTTLE_SERVER_UUID=<свежий online MC-сервер> \
 *        npx playwright test tests/game/panel/throttling.notification.spec.ts --project=game-panel
 *
 * ⚠️ ОТКРЫТО (исследует владелец — костяк допилить по итогам): точные условия ТРИГГЕРА
 *    модалки. Известно (live-recon 15-Jun-2026): фича только для Minecraft-серверов,
 *    сервер обычно online, ~1/3дня. Эндпоинт ВСЕГДА отвечает {success:true}, но модалка
 *    появляется не на каждый вызов. См. память throttling-webhook-feature.
 *
 * Селекторы модалки (`.upgrade-dialog__*`, кнопки `.dialog__button` / `-primary`) и эндпоинт
 * подтверждены live DOM 15-Jun-2026. Сервер задаётся через env (свежий, иначе сработает cooldown).
 */
import { test, expect, type BrowserContext } from "@playwright/test";
import { GamePanelServerPage } from "../../../pages/game/GamePanelServerPage";
import { ThrottlingDialog } from "../../../components/game/ThrottlingDialog";
import { GAME_PANEL_THROTTLING } from "../../../utils/selectors";
import { fireThrottlingAlert } from "../../../utils/throttlingWebhook";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_UUID,
} from "../../../utils/gameAuth";

// Цель — СВЕЖИЙ online Minecraft-сервер (иначе cooldown 3 дня → модалки не будет).
const THROTTLE_SERVER_UUID =
  process.env.GAME_PANEL_THROTTLE_SERVER_UUID ?? GAME_SERVER_UUID;

test.describe("@regression [game-panel] Throttling — «Lag Detected» upgrade-модалка", () => {
  let context: BrowserContext;
  let serverPage: GamePanelServerPage;
  let dialog: ThrottlingDialog;

  test.beforeAll(async ({ browser }) => {
    test.skip(
      !process.env.RUN_THROTTLING_TEST,
      "manual-only: вебхук сжигает 3-дневное окно троттлинга сервера; запуск с RUN_THROTTLING_TEST=1 на свежем online MC-сервере",
    );
    test.setTimeout(120_000);
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    const page = await context.newPage();
    serverPage = new GamePanelServerPage(page, THROTTLE_SERVER_UUID);
    dialog = new ThrottlingDialog(page);
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test("TC-GP-THR-001 | вебхук троттлинга → модалка «Lag Detected» с предложением апгрейда", async () => {
    test.setTimeout(120_000);
    await serverPage.goto();

    await test.step("вебхук троттлинга принят (200 / success:true)", async () => {
      const resp = await fireThrottlingAlert(serverPage.page.request, THROTTLE_SERVER_UUID);
      expect(resp.status()).toBe(200);
      expect(await resp.json()).toMatchObject({ success: true });
    });

    // Модалка приходит real-time (websocket) либо на загрузке — reload как страховка.
    await serverPage.goto();

    await test.step("появилась upgrade-модалка троттлинга со структурой", async () => {
      const shown = await dialog.waitForVisible(20_000);
      // ⚠️ Нет модалки = вероятно cooldown 3 дня или невыполненное условие триггера
      // (исследует владелец) → взять свежий online MC-сервер. См. throttling-webhook-feature.
      expect(
        shown,
        "модалка «Lag Detected» не появилась — cooldown 3 дня или условие триггера?",
      ).toBe(true);
      await expect(dialog.title).toHaveText(GAME_PANEL_THROTTLING.titleText);
      await expect(dialog.subtitle).toContainText(/reduced capacity/i);
      await expect(dialog.userLine).toContainText(/we detected server lags/i);
      await expect(dialog.upgradeButton).toContainText(/Upgrade for/i);
    });

    await test.step("закрытие через «Keep current plan» (Upgrade НЕ жмём — платёжный флоу)", async () => {
      await dialog.dismiss();
      await expect(dialog.root).toBeHidden();
    });
  });
});
