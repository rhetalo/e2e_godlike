/**
 * Game panel — источник расширений = CurseForge / Modrinth напрямую (задача «Заміна джерела
 * модів, плагінів і збірок у новій адмін-панелі»).
 *
 * Проверяем, что для источников CurseForge и Modrinth список модов/плагинов/сборок в новой панели
 * тянется НАПРЯМУЮ из их API (не через свою библиотеку): запрос несёт ?provider=<cf|modrinth>,
 * ответ - тот же provider + сырые провайдерские URL/иконки (curseforge.com/forgecdn vs
 * modrinth.com/cdn.modrinth.com). Плюс фиксируем набор Source-опций по вкладкам.
 *
 * ⚠️ Read-only: только навигация + смена Source-фильтра. Install/uninstall тут НЕ трогаем
 * (мутации живут в mods.spec.ts / plugins.spec.ts под RUN_PLUGIN_INSTALL=1).
 *
 * ⚠️ Поля ram / is_optimized в ответе - это оверлей своей библиотеки поверх CF/Modrinth (by design,
 * подтв. комментарием разработчика) → их наличие НЕ нарушает «прямой источник».
 *
 * AC-фича «обновление установленных модов» здесь НЕ покрыта: на момент 03-Sep-2026 в новой панели
 * отсутствует (нет индикатора «доступна новее версия», нет кнопки Update, нет поля в /installed) -
 * см. test-docs/ultra.panel/cf-modrinth-source-REPORT.md. Появится фича → добавить update-flow тест.
 *
 * Сервер: d2f7fff5 (Minecraft/Paper 26.2, тестовый акк), env GAME_PANEL_SOURCE_SERVER_UUID.
 * Подтверждено live network+DOM 03-Sep и 05-Oct-2026.
 */
import { test, expect, type BrowserContext, type Page, type Response } from "@playwright/test";
import { GamePanelExtensionsPage } from "../../../pages/game/GamePanelExtensionsPage";
import { loginAndSaveGameSession, GAME_STORAGE_STATE_PATH } from "../../../utils/gameAuth";
import { GAME_PANEL_EXTENSIONS_API } from "../../../utils/selectors";

// Сервер из ТЗ (источник CF/Modrinth). Переопределяемо env (сервера не вечны).
// Прежний ac8aa1e0 ушёл в suspended (05-Oct) и ронял весь serial-спек → d2f7fff5 (Paper, тест-акк).
const SERVER = process.env.GAME_PANEL_SOURCE_SERVER_UUID ?? "d2f7fff5";

interface CatalogItem {
  provider: string;
  url: string;
  icon_url: string;
}
type ListResp = { success: boolean; data: CatalogItem[] };

// Домены прямого источника: если список пришёл из CF/Modrinth напрямую, элементы несут их URL.
const PROVIDER_DOMAIN: Record<string, RegExp> = {
  curseforge: /curseforge\.com/i,
  modrinth: /modrinth\.com/i,
};

test.describe.configure({ mode: "serial" });

test.describe("@regression [game-panel] Источник расширений = CurseForge/Modrinth напрямую", () => {
  let context: BrowserContext;
  let page: Page;
  let ext: GamePanelExtensionsPage;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    page = await context.newPage();
    ext = new GamePanelExtensionsPage(page, SERVER);
  });

  test.afterAll(async () => {
    await context.close();
  });

  /** Утверждает: ответ списка пришёл именно от provider напрямую (provider в URL, в каждом элементе,
   *  и провайдерский домен в url первого элемента). */
  async function assertDirectSource(resp: Response, provider: "curseforge" | "modrinth"): Promise<void> {
    expect(resp.url()).toContain(`provider=${provider}`);
    expect(resp.status()).toBe(200);
    const json = (await resp.json()) as ListResp;
    expect(json.success).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
    // каждый элемент помечен запрошенным провайдером
    expect(json.data.every((d) => d.provider === provider)).toBe(true);
    // сырой провайдерский URL = данные пришли из API провайдера, а не из своей библиотеки
    const first = json.data[0];
    expect(first.url).toMatch(PROVIDER_DOMAIN[provider]);
  }

  test("TC-GP-SRC-001 | Моды: список из CurseForge и Modrinth напрямую", async () => {
    await test.step("CurseForge (дефолтный источник) — /minecraft/mods?provider=curseforge", async () => {
      const [resp] = await Promise.all([
        page.waitForResponse((r) => GAME_PANEL_EXTENSIONS_API.modsList.test(r.url()), { timeout: 30_000 }),
        ext.gotoExtensions(),
      ]);
      await assertDirectSource(resp, "curseforge");
    });

    await test.step("переключение Source → Modrinth перезапрашивает список с provider=modrinth", async () => {
      const [resp] = await Promise.all([
        page.waitForResponse(
          (r) => GAME_PANEL_EXTENSIONS_API.modsList.test(r.url()) && r.url().includes("provider=modrinth"),
          { timeout: 30_000 },
        ),
        ext.selectSource("Modrinth"),
      ]);
      await assertDirectSource(resp, "modrinth");
    });
  });

  test("TC-GP-SRC-002 | Плагины: список из CurseForge и Modrinth напрямую", async () => {
    await test.step("CurseForge — /minecraft/plugins?provider=curseforge", async () => {
      await ext.gotoExtensions();
      const [resp] = await Promise.all([
        page.waitForResponse((r) => GAME_PANEL_EXTENSIONS_API.pluginsList.test(r.url()), { timeout: 30_000 }),
        ext.filterTo("Plugins"),
      ]);
      await assertDirectSource(resp, "curseforge");
    });

    await test.step("Source → Modrinth: provider=modrinth", async () => {
      const [resp] = await Promise.all([
        page.waitForResponse(
          (r) => GAME_PANEL_EXTENSIONS_API.pluginsList.test(r.url()) && r.url().includes("provider=modrinth"),
          { timeout: 30_000 },
        ),
        ext.selectSource("Modrinth"),
      ]);
      await assertDirectSource(resp, "modrinth");
    });
  });

  test("TC-GP-SRC-003 | Сборки/modpacks: список из CurseForge и Modrinth напрямую", async () => {
    await test.step("CurseForge — /minecraft/modpacks?provider=curseforge", async () => {
      const [resp] = await Promise.all([
        page.waitForResponse((r) => GAME_PANEL_EXTENSIONS_API.modpacksList.test(r.url()), { timeout: 30_000 }),
        ext.gotoModpacks(),
      ]);
      await assertDirectSource(resp, "curseforge");
    });

    await test.step("Source → Modrinth: provider=modrinth", async () => {
      const [resp] = await Promise.all([
        page.waitForResponse(
          (r) => GAME_PANEL_EXTENSIONS_API.modpacksList.test(r.url()) && r.url().includes("provider=modrinth"),
          { timeout: 30_000 },
        ),
        ext.selectSource("Modrinth"),
      ]);
      await assertDirectSource(resp, "modrinth");
    });
  });

  test("TC-GP-SRC-004 | Набор источников по вкладкам (CF/Modrinth прямые + own-library провайдеры)", async () => {
    const has = (opts: string[], name: RegExp): boolean => opts.some((o) => name.test(o));

    await test.step("Mods: только Curseforge + Modrinth (оба — прямой API)", async () => {
      await ext.gotoExtensions();
      await ext.cards().first().waitFor({ state: "visible", timeout: 20_000 });
      const opts = await ext.sourceOptions();
      expect(has(opts, /curseforge/i)).toBe(true);
      expect(has(opts, /modrinth/i)).toBe(true);
      // у модов нет own-library провайдеров (Hangar — только для плагинов)
      expect(has(opts, /hangar/i)).toBe(false);
    });

    await test.step("Plugins: CF/Modrinth + Hangar/SpigotMC/Polymart (own library)", async () => {
      await ext.gotoExtensions();
      await ext.filterTo("Plugins");
      await ext.cards().first().waitFor({ state: "visible", timeout: 20_000 });
      const opts = await ext.sourceOptions();
      for (const p of [/curseforge/i, /modrinth/i, /hangar/i, /spigot/i, /polymart/i]) {
        expect(has(opts, p)).toBe(true);
      }
    });

    await test.step("Modpacks: CF/Modrinth + ATLauncher/FTB/Technic/VoidsWrath/All (own library)", async () => {
      await ext.gotoModpacks();
      await ext.cards().first().waitFor({ state: "visible", timeout: 20_000 });
      const opts = await ext.sourceOptions();
      for (const p of [/curseforge/i, /modrinth/i, /atlauncher/i, /feed the beast/i, /technic/i, /voidswrath/i]) {
        expect(has(opts, p)).toBe(true);
      }
    });
  });
});
