/**
 * Client-only моды: сканер отключает клиентский мод на старте (DEV-492 / DEV-556) и делает это снова
 * после Uninstall → Install той же версии (DEV-558: Uninstall стирает «память» сканера по хешу файла).
 *
 * COM-001: Install Controlling → Start → мод в `client-only-notice` (лежит как .jar.disabled) + окно
 *          «Some mods were disabled» со строкой мода.
 * COM-002: Uninstall (UI) → Install той же версии → Start → мод снова отключён, revision вырос, окно снова.
 *          До DEV-558 запись override жила вечно, и переустановленный мод оставался включённым.
 *
 * ⚠️ МУТАЦИЯ, только test_e2e_mut_fabric (75d1175e, Fabric 1.21.1, D-026; ок владельца 23-Oct-2026):
 * установка/удаление мода, старт/стоп. Teardown: окно закрыто, сервер Offline, мод удалён, notice
 * подтверждён (ack) - следующий прогон стартует без висящего окна.
 * Источник правды - `client-only-notice` (`mods` = файлы, которые сейчас .jar.disabled);
 * список `/minecraft/mods/installed` кеширует имена ~5 мин и для проверки отключения не годится.
 */
import type { APIRequestContext, BrowserContext } from "@playwright/test";
import { test, expect } from "../../../fixtures/diagnostics";
import { GamePanelServerPage } from "../../../pages/game/GamePanelServerPage";
import { GamePanelExtensionsPage } from "../../../pages/game/GamePanelExtensionsPage";
import { ClientOnlyModsDialog } from "../../../components/game/ClientOnlyModsDialog";
import { ClientOnlyTestMod } from "../../../fixtures/test-data";
import { deleteServerV2, getServerV2, postServerV2, readPanelToken } from "../../../utils/panelApi";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_MUT_FABRIC_UUID,
} from "../../../utils/gameAuth";

interface Notice {
  pending: boolean;
  revision: number | null;
  mods: string[];
}

const UUID = GAME_SERVER_MUT_FABRIC_UUID;

test.describe.configure({ mode: "serial" });

test.describe("@regression [game-panel] Client-only моды: отключение на старте и после переустановки", () => {
  let context: BrowserContext;
  let request: APIRequestContext;
  let token: string;
  let srv: GamePanelServerPage;
  let ext: GamePanelExtensionsPage;
  let notice: ClientOnlyModsDialog;
  let firstRevision = 0;

  const readNotice = async (): Promise<Notice> =>
    ((await (await getServerV2(request, token, UUID, "minecraft/client-only-notice")).json()) as { data: Notice }).data;
  const serverState = async (): Promise<string> =>
    ((await (await getServerV2(request, token, UUID, "resources")).json()) as { data: { state: string } }).data.state;
  /** Тест-мод на диске: POST install отвечает 200 раньше, чем файл скачан (загрузка асинхронная, live 23-Oct-2026). */
  const testModInstalled = async (): Promise<boolean> => {
    const json = (await (await getServerV2(request, token, UUID, "minecraft/mods/installed")).json()) as {
      data: Array<{ path: string | null }>;
    };
    return json.data.some((m) => /\/Controlling-/.test(m.path ?? ""));
  };
  /** Install тест-мода и дождаться, пока файл появится. */
  const installTestMod = async (): Promise<number> => {
    const status = (await postServerV2(request, token, UUID, "minecraft/mods", { ...ClientOnlyTestMod.install })).status();
    await expect.poll(testModInstalled, { timeout: 60_000, intervals: [2_000] }).toBe(true);
    return status;
  };
  const disabledTestMod = async (): Promise<boolean> =>
    (await readNotice()).mods.some((m) => ClientOnlyTestMod.fileName.test(m));

  /** Uninstall тест-мода через UI (вкладка Installed); DELETE по API - страховка, если карточки нет. */
  const uninstallTestMod = async (): Promise<void> => {
    await ext.gotoExtensions();
    await notice.dismissIfPresent();
    if (!(await ext.uninstallByName("Mods", ClientOnlyTestMod.catalogName))) {
      await deleteServerV2(request, token, UUID, `minecraft/mods/${ClientOnlyTestMod.uninstallKey}`); // 4xx, если мода нет
    }
  };

  /**
   * Привести сервер в исходное состояние: окно закрыто, Offline, тест-мода нет, записи сканера по нему нет,
   * notice подтверждён.
   * ⚠️ Запись override по хешу иногда переживает Uninstall: Uninstall её стирает, а сканер через ~10 с пишет заново
   * (live 23-Oct-2026, DEV-558/OBS-5, причина не установлена; чаще сразу после Shut Down). С такой записью следующий
   * Install отключается молча, без окна. Поэтому чистка - контрольной парой Install → Uninstall: Uninstall установленного
   * файла стирает запись по его хешу (проверено).
   */
  const resetServer = async (): Promise<void> => {
    await srv.goto();
    await notice.dismissIfPresent();
    await srv.ensureOffline(120_000);
    await expect.poll(serverState, { timeout: 90_000, intervals: [3_000] }).toBe("offline"); // UI показывает Start раньше ноды
    await uninstallTestMod();
    await installTestMod();
    await uninstallTestMod();
    await postServerV2(request, token, UUID, "minecraft/client-only-notice/ack");
  };

  test.beforeAll(async ({ browser, playwright }) => {
    test.setTimeout(240_000);
    await loginAndSaveGameSession(browser);
    token = readPanelToken(GAME_STORAGE_STATE_PATH);
    request = await playwright.request.newContext();
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    const page = await context.newPage();
    srv = new GamePanelServerPage(page, UUID);
    ext = new GamePanelExtensionsPage(page, UUID);
    notice = new ClientOnlyModsDialog(page);
    await resetServer();
  });

  test.afterAll(async () => {
    test.setTimeout(240_000);
    await resetServer();
    await request.dispose();
    await context.close();
  });

  test(
    "TC-GP-COM-001 | клиентский мод отключается на старте, окно «Some mods were disabled» его называет",
    { tag: "@regression", annotation: { type: "issue", description: "DEV-492, DEV-556" } },
    async () => {
      test.setTimeout(480_000);

      await test.step("исходное состояние: тест-мод не отключён, окно не ждёт показа", async () => {
        const n = await readNotice();
        expect(n.mods.filter((m) => ClientOnlyTestMod.fileName.test(m))).toEqual([]);
        expect(n.pending).toBe(false);
      });

      await test.step("Install Controlling (прямой POST: в каталоге клиентские моды скрыты)", async () => {
        expect(await installTestMod()).toBe(200); // ждёт, пока файл ляжет на диск
      });

      await srv.goto();
      await srv.ensureOnline(300_000);

      await test.step("сканер отключил мод: он в client-only-notice, окно ждёт показа", async () => {
        await expect.poll(disabledTestMod, { timeout: 120_000, intervals: [5_000] }).toBe(true);
        const n = await readNotice();
        expect(n.pending).toBe(true);
        expect(n.revision).not.toBeNull();
        firstRevision = n.revision ?? 0;
      });

      await srv.goto();

      await test.step("окно «Some mods were disabled» перечисляет Controlling", async () => {
        await expect(notice.title).toHaveText(/Some mods were disabled/i, { timeout: 30_000 });
        await expect(notice.modNames().filter({ hasText: ClientOnlyTestMod.fileName })).toHaveCount(1);
      });

      await notice.gotIt();
      await srv.ensureOffline(120_000);
    },
  );

  test(
    "TC-GP-COM-002 | Uninstall → Install той же версии → на старте мод снова отключён",
    { tag: "@regression", annotation: { type: "issue", description: "DEV-558" } },
    async () => {
      test.setTimeout(600_000);
      test.skip(firstRevision === 0, "COM-001 не дошёл до отключения мода - нечего переустанавливать");

      await ext.gotoExtensions();
      await notice.dismissIfPresent();

      await test.step("Uninstall через UI: файл мода ушёл с сервера", async () => {
        expect(await ext.uninstallByName("Mods", ClientOnlyTestMod.catalogName)).toBe(true);
        await expect.poll(disabledTestMod, { timeout: 60_000, intervals: [5_000] }).toBe(false);
      });

      await test.step("Install той же версии", async () => {
        expect(await installTestMod()).toBe(200); // ждёт, пока файл ляжет на диск
      });

      await srv.goto();
      await notice.dismissIfPresent();
      await srv.ensureOnline(300_000);

      await test.step("мод снова отключён новой записью (revision вырос)", async () => {
        await expect.poll(disabledTestMod, { timeout: 120_000, intervals: [5_000] }).toBe(true);
        const n = await readNotice();
        expect(n.pending).toBe(true);
        expect(n.revision ?? 0).toBeGreaterThan(firstRevision);
      });

      await srv.goto();

      await test.step("окно показывается снова (Got it помнит только старую revision)", async () => {
        await expect(notice.modNames().filter({ hasText: ClientOnlyTestMod.fileName })).toHaveCount(1, { timeout: 30_000 });
      });
    },
  );
});
