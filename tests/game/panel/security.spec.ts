/**
 * Game panel — Security / negative (Phase 5).
 *
 * TC-GP-SEC-001 (IDOR / broken access control): по UUID нельзя достучаться до чужого/
 *   несуществующего сервера — панель отдаёт «resource does not exist» и НЕ показывает
 *   power-контролы. Свой сервер для контраста — контролы есть. Read-only.
 * TC-GP-SEC-002 (stored XSS в имени бэкапа): имя-payload «<img onerror>» НЕ исполняется
 *   и рендерится экранированно (как текст). Мутация — self-cleaning (бэкап удаляется).
 *
 * ⚠️ Прод живой/общий: IDOR — только навигация (безопасно); XSS — создаём СВОЙ бэкап
 *   с payload-именем и удаляем его (квота 3 слота, чужой «111» не трогаем). Детали — KB §5h/§5i.
 */
import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { GamePanelServerPage } from "../../../pages/game/GamePanelServerPage";
import { GamePanelBackupsPage } from "../../../pages/game/GamePanelBackupsPage";
import { GamePanelFilesPage } from "../../../pages/game/GamePanelFilesPage";
import { GamePanelConfigPage } from "../../../pages/game/GamePanelConfigPage";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_UUID,
  GAME_SERVER_NAME,
} from "../../../utils/gameAuth";

// Чужие/несуществующие UUID (валидный формат). Реальный — для baseline-контраста.
const FOREIGN_UUIDS = [
  "00000000-0000-0000-0000-000000000000", // несуществующий
  "aaaaaaaa-48bf-46f1-95dd-a45d07f0d23d", // реальный UUID с подменённым префиксом
];
const XSS_NAME = "<img src=x onerror=alert(1)>"; // имя бэкапа (лимит 38)
const XSS_FOLDER = "<img src=x onerror=alert(2)>"; // имя папки в файловом менеджере
const XSS_MOTD = "<img src=x onerror=alert(7)>"; // payload в config motd (sink — значение <input>)
const SQLI_MOTD = "'; DROP TABLE servers;-- e2e"; // SQLi-строка в motd: round-trip = БД не пострадала

test.describe.configure({ mode: "serial" });

test.describe("[game-panel] Security — IDOR + input validation", () => {
  let context: BrowserContext;
  let page: Page;
  let backups: GamePanelBackupsPage;
  let files: GamePanelFilesPage;
  let config: GamePanelConfigPage;
  let originalMotd = "";
  let dialogFired = false;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000);
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    page = await context.newPage();
    // Любой нативный диалог (alert/confirm) = сработавший XSS — фиксируем и гасим.
    page.on("dialog", async (d) => {
      dialogFired = true;
      await d.dismiss().catch(() => {});
    });
    backups = new GamePanelBackupsPage(page, GAME_SERVER_UUID, GAME_SERVER_NAME);
    files = new GamePanelFilesPage(page, GAME_SERVER_UUID);
    await backups.goto();
    await backups.deleteIfPresent(XSS_NAME); // мусор от прошлого упавшего прогона
    await files.goto();
    await files.deleteEntryIfPresent(XSS_FOLDER);
    config = new GamePanelConfigPage(page, GAME_SERVER_UUID);
    await config.goto();
    originalMotd = await config.getValue("motd");
    // самолечение: если прошлый упавший прогон оставил payload — не берём его за «оригинал»
    if (/onerror=alert|DROP TABLE/i.test(originalMotd)) originalMotd = "A Minecraft Server";
  });

  test.afterAll(async () => {
    try {
      await backups.goto();
      await backups.deleteIfPresent(XSS_NAME);
      await files.goto();
      await files.deleteEntryIfPresent(XSS_FOLDER);
      await config.setValue("motd", originalMotd); // обязательный откат motd
    } catch {
      /* best-effort teardown */
    }
    await context.close();
  });

  test("@critical TC-GP-SEC-001 | IDOR: чужой/несуществующий UUID — доступ закрыт", async () => {
    test.setTimeout(120_000);

    await test.step("baseline: к своему серверу доступ есть (power-контролы видны)", async () => {
      const own = new GamePanelServerPage(page, GAME_SERVER_UUID);
      await own.goto();
      expect(await own.hasPowerControls()).toBe(true);
    });

    for (const uuid of FOREIGN_UUIDS) {
      await test.step(`UUID ${uuid.slice(0, 8)}… — нет контролов + сообщение об отказе`, async () => {
        const foreign = new GamePanelServerPage(page, uuid);
        await foreign.goto();
        expect(await foreign.hasPowerControls()).toBe(false);
        await expect(foreign.notFoundError).toBeVisible();
      });
    }
  });

  test("@critical TC-GP-SEC-002 | stored XSS в имени бэкапа не исполняется и экранируется", async () => {
    test.setTimeout(600_000); // create — async-джоба (см. §5h)
    dialogFired = false;

    await test.step("создаём бэкап с XSS-именем → строка появляется (имя как текст)", async () => {
      await backups.goto(); // SEC-001 увёл общий page на страницу сервера — вернуться на backups
      await backups.createBackup(XSS_NAME);
      // строка нашлась по ЛИТЕРАЛЬНОМУ тексту payload → имя сохранено/отрендерено как текст, не как HTML
      await expect(backups.backupRow(XSS_NAME)).toBeVisible();
    });

    await test.step("XSS не исполнился: нативный диалог не появлялся", async () => {
      expect(dialogFired).toBe(false);
    });

    await test.step("дожидаемся COMPLETED и удаляем (self-cleaning)", async () => {
      await expect
        .poll(async () => {
          await backups.refresh();
          return backups.isCompleted(XSS_NAME);
        }, { timeout: 540_000, intervals: [5_000, 10_000, 15_000] })
        .toBe(true);
      expect(dialogFired).toBe(false); // и после рендера готовой строки — тоже без диалога
      await backups.deleteBackup(XSS_NAME);
      await expect(backups.backupRow(XSS_NAME)).toBeHidden();
    });
  });

  test("@critical TC-GP-SEC-003 | stored XSS в имени папки (файл-менеджер) не исполняется и экранируется", async () => {
    test.setTimeout(120_000);
    dialogFired = false;

    await test.step("создаём папку с XSS-именем → появляется в списке (имя как текст)", async () => {
      await files.goto(); // вернуться на файл-менеджер (общий page мог уйти)
      await files.createFolder(XSS_FOLDER);
      // запись нашлась по ЛИТЕРАЛЬНОМУ имени → отрендерено как текст, не как HTML
      await expect(files.fileEntry(XSS_FOLDER)).toBeVisible();
    });

    await test.step("XSS не исполнился: нативный диалог не появлялся", async () => {
      expect(dialogFired).toBe(false);
    });

    await test.step("удаляем папку (self-cleaning)", async () => {
      await files.deleteEntry(XSS_FOLDER);
      await expect(files.fileEntry(XSS_FOLDER)).toBeHidden();
    });
  });

  test("@regression TC-GP-SEC-004 | XSS/SQLi в config motd не исполняются и хранятся как текст (self-cleaning)", async () => {
    test.setTimeout(120_000);

    await test.step("XSS-payload в motd → автосейв → reload: значение как текст, без диалога", async () => {
      dialogFired = false;
      await config.goto();
      await config.setValue("motd", XSS_MOTD);
      await config.goto(); // reload → проверяем персист
      expect(await config.getValue("motd")).toContain(XSS_MOTD); // сохранён дословно (как текст)
      expect(dialogFired).toBe(false); // alert не сработал → stored-XSS нет
    });

    await test.step("SQLi-строка в motd → автосейв → reload: строка цела (инъекции нет)", async () => {
      await config.setValue("motd", SQLI_MOTD);
      await config.goto();
      expect(await config.getValue("motd")).toContain(SQLI_MOTD);
      expect(dialogFired).toBe(false);
    });

    await test.step("откат motd к оригиналу (обязательный recovery)", async () => {
      await config.setValue("motd", originalMotd);
      await config.goto();
      expect(await config.getValue("motd")).toBe(originalMotd);
    });
  });
});
