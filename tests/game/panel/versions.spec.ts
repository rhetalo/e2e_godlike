/**
 * Game panel — Versions (server software), структурный, read-only.
 *
 * /minecraft/versions (редизайн 12-Nov-2026): карточка «Currently running <тип>» + карточка «Change version»
 * с тремя пикерами (Server type / Minecraft version / Build), каждый открывает диалог. Работает offline.
 * ⚠️ Install = деструктивный rebuild — кнопку только читаем, диалоги закрываем без выбора.
 *
 * Подтверждено live recon 12-Nov-2026.
 */
import { type BrowserContext } from "@playwright/test";
import { test, expect } from "../../../fixtures/diagnostics";
import { GamePanelVersionsPage } from "../../../pages/game/GamePanelVersionsPage";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_UUID,
} from "../../../utils/gameAuth";

test.describe.configure({ mode: "serial" });

test.describe("@regression [game-panel] Versions (server software)", () => {
  let context: BrowserContext;
  let versions: GamePanelVersionsPage;
  /** Тип и версия, которые сейчас стоят на сервере (из карточки «Currently running»). */
  let currentType = "";
  let currentVersion = "";

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    versions = new GamePanelVersionsPage(await context.newPage(), GAME_SERVER_UUID);
    await versions.goto();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("TC-GP-VER-001 | «Currently running» и «Change version»: текущая сборка, 3 пикера, Install по текущей", async () => {
    await test.step("карточка «Currently running <тип>» с версией Minecraft и номером билда", async () => {
      await expect(versions.currentCard).toBeVisible();
      await expect(versions.currentTitle).toHaveText(/^Currently running \S+/);
      await expect(versions.currentChip("Minecraft")).toHaveText(/Minecraft\s+\d+\.\d+/);
      await expect(versions.currentChip("Build")).toHaveText(/Build\s+#\d+/);
      currentType = (await versions.currentTitle.innerText()).replace(/^Currently running\s+/, "").trim();
      currentVersion = (await versions.currentChip("Minecraft").innerText()).replace(/^Minecraft\s+/, "").trim();
    });

    await test.step("«Change version»: 3 пикера, по умолчанию текущие тип и версия", async () => {
      await expect(versions.changeCard).toBeVisible();
      await expect(versions.pickers).toHaveCount(3);
      await expect(versions.pickerTitle("type")).toHaveText(currentType);
      await expect(versions.pickerTitle("version")).toHaveText(currentVersion);
    });

    await test.step("кнопка Install подписана текущими типом и версией (не жмём)", async () => {
      await expect(versions.installButton).toBeVisible();
      await expect(versions.installButton).toHaveText(`Install ${currentType} ${currentVersion}`);
    });
  });

  test("TC-GP-VER-002 | Server type: группы VANILLA / MODS / PLUGINS (+ другие), текущий тип отмечен Installed", async () => {
    await versions.openPicker("type");

    await test.step("диалог «Choose a server type» с тремя группами", async () => {
      await expect(versions.dialogTitle).toHaveText(/Choose a server type/i);
      const groups = (await versions.typeGroupTitles.allInnerTexts()).map((t) => t.trim().toUpperCase());
      expect(groups).toEqual(expect.arrayContaining(["VANILLA", "MODS", "PLUGINS"]));
    });

    await test.step("известные типы есть, текущий отмечен Installed", async () => {
      for (const name of ["Vanilla", "Fabric", "NeoForge", "Paper"]) {
        await expect(versions.typeOption(name), `тип ${name}`).toBeVisible();
      }
      await expect(versions.typeOption(currentType)).toContainText(/Installed/i);
    });

    await versions.closePicker();
  });

  test("TC-GP-VER-003 | Minecraft version: линии с бейджем Java, текущая версия Installed, есть Latest", async () => {
    await versions.openPicker("version");

    await test.step("диалог «Choose a Minecraft version», версии сгруппированы по линиям", async () => {
      await expect(versions.dialogTitle).toHaveText(/Choose a Minecraft version/i);
      await expect.poll(() => versions.versionLines.count()).toBeGreaterThan(3);
      await expect(versions.versionLines.first()).toContainText(/Java \d+/);
    });

    await test.step("текущая версия выбрана и отмечена Installed, свежая - Latest", async () => {
      await expect(versions.activeTile).toContainText(currentVersion);
      await expect(versions.activeTile).toContainText(/Installed/i);
      await expect(versions.latestTag).toBeVisible();
    });

    await versions.closePicker();
  });

  test("TC-GP-VER-004 | Build: «Latest» сверху, список билдов, «Show more» догружает старые", async () => {
    await versions.openPicker("build");

    await test.step("диалог «Choose a build», первая плитка - Latest", async () => {
      await expect(versions.dialogTitle).toHaveText(/Choose a build/i);
      await expect(versions.tiles.first()).toContainText(/Latest/i);
    });

    const before = await versions.tiles.count();

    await test.step("«Show more» добавляет старые билды", async () => {
      expect(before).toBeGreaterThan(1);
      await expect(versions.buildMore).toBeVisible();
      await versions.buildMore.click();
      await expect.poll(() => versions.tiles.count()).toBeGreaterThan(before);
    });

    await versions.closePicker();
  });
});
