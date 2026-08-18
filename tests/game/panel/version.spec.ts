/**
 * Game panel — loader/version single source (регресс под Inc 0).
 *
 * Замысел Inc 0: тип лоадера и версия Minecraft берутся из ОДНОГО источника, а публичный
 * ответ `GET /api/v2/servers/{uuid}/minecraft/version` не меняется. Этот тест фиксирует
 * shape ответа — он должен остаться идентичным до и после деплоя рефактора.
 *
 * Что НЕ здесь (→ backend PHPUnit `--filter=Minecraft`): resolver, backfill колонок, дерив
 * mcversion, миграция 13 callers — через UI/API не наблюдаемы.
 *
 * Baseline (playbook §2, 20-Jul-2026):
 *   {"minecraft_version":"26.2","minecraft_type":"PAPER","minecraft_build":"285825","egg":"PC-Paper"}
 * ⚠️ Ассерты СТРУКТУРНЫЕ: конкретные значения дрейфуют (апдейт Paper/билда на живом проде) —
 * прибивать «26.2» нельзя, иначе тест ляжет на первом же апдейте сервера.
 *
 * Запрос уходит при открытии `/extensions` (каталог фильтрует расширения по версии сервера),
 * поэтому переиспользуем GamePanelExtensionsPage — отдельный PO не нужен.
 *
 * ⚠️ ID кейса — `TC-GP-VERAPI-001`, НЕ `TC-GP-VER-001`: последний уже занят UI-тестом экрана
 * Versions (`versions.spec.ts`). В playbook'е Inc 0 он назван TC-GP-VER-001 — коллизия имён
 * в доке, здесь разведено, чтобы кейсы не склеивались в отчётах.
 */
import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { GamePanelExtensionsPage } from "../../../pages/game/GamePanelExtensionsPage";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_PLUGIN_UUID,
} from "../../../utils/gameAuth";
import { GAME_PANEL_EXTENSIONS_API } from "../../../utils/selectors";

/** Публичный shape ответа /minecraft/version (то, что не должен сломать Inc 0). */
interface VersionPayload {
  minecraft_version: string;
  minecraft_type: string;
  minecraft_build: string;
  egg: string;
}

test.describe.configure({ mode: "serial" });

test.describe("@regression [game-panel] Server loader/version (Inc 0)", () => {
  let context: BrowserContext;
  let page: Page;
  let ext: GamePanelExtensionsPage;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    page = await context.newPage();
    ext = new GamePanelExtensionsPage(page, GAME_SERVER_PLUGIN_UUID);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("TC-GP-VERAPI-001 | /minecraft/version отдаёт непустой тип+версию (единый источник)", async () => {
    const [resp] = await Promise.all([
      page.waitForResponse((r) => GAME_PANEL_EXTENSIONS_API.minecraftVersion.test(r.url()), {
        timeout: 30_000,
      }),
      ext.gotoExtensions(),
    ]);
    const json = (await resp.json()) as { success: boolean; data: VersionPayload };

    await test.step("ответ успешен и несёт объект data", async () => {
      expect(resp.status()).toBe(200);
      expect(json.success).toBe(true);
      expect(typeof json.data).toBe("object");
    });

    await test.step("minecraft_type и minecraft_version не пустые (единый источник заполнен)", async () => {
      // Суть Inc 0: после переезда на единый источник оба поля обязаны остаться непустыми.
      // Пустая строка/null здесь = резолвер потерял значение — ровно тот регресс, что ловим.
      expect(typeof json.data.minecraft_type).toBe("string");
      expect(json.data.minecraft_type.trim().length).toBeGreaterThan(0);
      expect(typeof json.data.minecraft_version).toBe("string");
      expect(json.data.minecraft_version).toMatch(/\d/); // содержит цифру — это версия, а не заглушка
    });

    await test.step("build и egg присутствуют строками (shape ответа не изменился)", async () => {
      expect(json.data).toHaveProperty("minecraft_build");
      expect(json.data).toHaveProperty("egg");
      expect(typeof json.data.egg).toBe("string");
      expect(json.data.egg.trim().length).toBeGreaterThan(0);
    });

    console.log(
      `[version] ${json.data.minecraft_type} ${json.data.minecraft_version} ` +
        `(build ${json.data.minecraft_build}, egg ${json.data.egg})`,
    );
  });
});
