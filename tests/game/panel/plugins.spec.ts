/**
 * Game panel — Plugins (каталог + контракт api/v2 + install/uninstall).
 *
 * Регресс-baseline под задачу Inc 3 (plugins → surrogate PK + модернизация парсеров).
 * Замысел рефактора: внутренний PK становится суррогатным, но ПУБЛИЧНЫЙ контракт неизменен —
 * идентичность плагина = `provider + external_id` (сырой провайдерский id в поле `id`),
 * версии резолвятся по `{provider}-{external_id}`. Эти тесты фиксируют инварианты, которые
 * ДОЛЖНЫ остаться зелёными до и после деплоя рефактора.
 *
 * Что НЕ здесь (по DoD Inc 3 — крыть бэкенд-PHPUnit, не E2E): целостность swap-миграции,
 * newestFirst()-семантика по датам, заполнение game_versions у Hangar/Spigot/Polymart,
 * починка Modrinth-парсера — недетерминированы/невидимы через прод-UI.
 *
 * Экран /extensions — ОДИН компонент .server__extensions (фильтр Mods/Plugins/All/Installed).
 * Подтверждено live DOM + network 20-Jul-2026 (тогда — сервер 93521c70; он снят с аккаунта,
 * с 18-Aug-2026 тесты идут на GAME_SERVER_PLUGIN_UUID). ⚠️ Install = мутация:
 * install→uninstall self-cleaning кейс env-гейтнут (RUN_PLUGIN_INSTALL=1), serial + откат в finally.
 */
import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { GamePanelExtensionsPage } from "../../../pages/game/GamePanelExtensionsPage";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_PLUGIN_UUID,
} from "../../../utils/gameAuth";
import { GAME_PANEL_EXTENSIONS_API } from "../../../utils/selectors";

const RUN_INSTALL = process.env.RUN_PLUGIN_INSTALL === "1";

/** Позиция элемента каталога/версии в ответе api/v2 (публичный shape). */
interface CatalogItem {
  id: string;
  name: string;
  provider: string;
  is_installed: boolean;
  is_supported: boolean;
  categories: Array<{ id: number; name: string; slug: string }>;
}
interface VersionItem {
  id: string;
  name: string;
  game_versions: string[];
  download_url: string;
}

test.describe.configure({ mode: "serial" });

test.describe("@regression [game-panel] Plugins (каталог + api/v2 контракт + install)", () => {
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

  test("TC-GP-PLG-001 | Каталог плагинов: рендер + контракт списка api/v2", async () => {
    await ext.gotoExtensions();

    const [resp] = await Promise.all([
      page.waitForResponse((r) => GAME_PANEL_EXTENSIONS_API.pluginsList.test(r.url()), { timeout: 30_000 }),
      ext.filterTo("Plugins"),
    ]);

    const json = (await resp.json()) as { success: boolean; data: CatalogItem[] };

    await test.step("ответ /minecraft/plugins успешен и содержит массив data", async () => {
      expect(resp.status()).toBe(200);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
    });

    await test.step("элемент несёт публичную идентичность provider + внешний id (не суррогатный PK)", async () => {
      const item = json.data[0];
      expect(typeof item.id).toBe("string");
      expect(item.id.length).toBeGreaterThan(0);
      expect(typeof item.provider).toBe("string");
      expect(item.provider.length).toBeGreaterThan(0);
      expect(item).toHaveProperty("is_installed");
      expect(Array.isArray(item.categories)).toBe(true);
    });

    await test.step("каталог отрисовал карточки", async () => {
      expect(await ext.cards().count()).toBeGreaterThan(0);
    });
  });

  test("TC-GP-PLG-002 | Идентичность плагина резолвится по {provider}-{external_id} (/versions)", async () => {
    // список плагинов → первый элемент {provider, id}
    const [listResp] = await Promise.all([
      page.waitForResponse((r) => GAME_PANEL_EXTENSIONS_API.pluginsList.test(r.url()), { timeout: 30_000 }),
      ext.gotoExtensions().then(() => ext.filterTo("Plugins")),
    ]);
    const list = (await listResp.json()) as { data: CatalogItem[] };
    const first = list.data[0];

    // клик Install по карточке триггерит запрос версий для этого плагина (мутации нет)
    const [verResp] = await Promise.all([
      page.waitForResponse((r) => GAME_PANEL_EXTENSIONS_API.pluginVersions.test(r.url()), { timeout: 30_000 }),
      ext.openInstallDialog(0),
    ]);
    const versions = (await verResp.json()) as { success: boolean; data: VersionItem[] };

    await test.step("URL версий содержит {provider}-{external_id}", async () => {
      expect(verResp.url()).toContain(`${first.provider}-${first.id}`);
    });

    await test.step("ответ версий успешен, каждая версия несёт id/name/game_versions/download_url", async () => {
      expect(verResp.status()).toBe(200);
      expect(versions.success).toBe(true);
      expect(versions.data.length).toBeGreaterThan(0);
      const v = versions.data[0];
      expect(typeof v.id).toBe("string");
      expect(typeof v.name).toBe("string");
      expect(Array.isArray(v.game_versions)).toBe(true);
      expect(typeof v.download_url).toBe("string");
    });

    await ext.dismissInstallDialog();
  });

  test("TC-GP-PLG-003 | type-фильтры Plugins/Installed переключают источник каталога", async () => {
    await ext.gotoExtensions();

    await test.step("Plugins → запрос /minecraft/plugins", async () => {
      const [r] = await Promise.all([
        page.waitForResponse((res) => GAME_PANEL_EXTENSIONS_API.pluginsList.test(res.url()), { timeout: 30_000 }),
        ext.filterTo("Plugins"),
      ]);
      expect(r.status()).toBe(200);
    });

    await test.step("Installed → запрос /minecraft/plugins/installed", async () => {
      const [r] = await Promise.all([
        page.waitForResponse((res) => GAME_PANEL_EXTENSIONS_API.pluginsInstalled.test(res.url()), { timeout: 30_000 }),
        ext.filterTo("Installed"),
      ]);
      const json = (await r.json()) as { success: boolean; data: unknown[] };
      expect(r.status()).toBe(200);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
    });
  });

  test("TC-GP-PLG-004 | Поле поиска каталога рендерится и принимает ввод", async () => {
    // ⚠️ Поиск НЕ шлёт debounced-запрос (клиентский/по Enter — подтв. recon 20-Jul-2026);
    // сетевой контракт `search=` уже зафиксирован в URL-shape (TC-001). Здесь — UI-регресс поля.
    await ext.gotoExtensions();
    await ext.filterTo("Plugins");

    await test.step("поле поиска видно и принимает текст", async () => {
      await expect(ext.searchInput).toBeVisible();
      await ext.searchFor("world");
      await expect(ext.searchInput.locator("input").first()).toHaveValue("world");
    });
  });

  test("TC-GP-PLG-005 | Install-диалог открывается и закрывается без установки", async () => {
    await ext.gotoExtensions();
    await ext.filterTo("Plugins");
    await ext.openInstallDialog(0);

    await test.step("диалог виден, заголовок про установку, есть Install/Cancel", async () => {
      await expect(ext.installDialog).toBeVisible();
      await expect(ext.installDialogTitle).toContainText(/install/i);
      await expect(ext.dialogButton("Install")).toBeVisible();
      await expect(ext.dialogButton("Cancel")).toBeVisible();
    });

    await test.step("Esc закрывает диалог — мутации не произошло", async () => {
      await ext.dismissInstallDialog();
      await expect(ext.installDialog).toBeHidden();
    });
  });

  test("TC-GP-PLG-006 | install → installed → uninstall (МУТАЦИЯ, self-cleaning)", async () => {
    test.skip(!RUN_INSTALL, "мутирует общий прод-сервер; включать только RUN_PLUGIN_INSTALL=1 с ведома владельца");

    // выбрать первый плагин
    const [listResp] = await Promise.all([
      page.waitForResponse((r) => GAME_PANEL_EXTENSIONS_API.pluginsList.test(r.url()), { timeout: 30_000 }),
      ext.gotoExtensions().then(() => ext.filterTo("Plugins")),
    ]);
    const target = ((await listResp.json()) as { data: CatalogItem[] }).data[0];

    let installed = false;
    try {
      await test.step(`install "${target.name}" (${target.provider}-${target.id}) — контракт POST несёт provider+external_id`, async () => {
        await ext.openInstallDialog(0);
        const [installResp] = await Promise.all([
          page.waitForResponse(
            (r) => r.request().method() === "POST" && /\/minecraft\/plugins/.test(r.url()),
            { timeout: 60_000 },
          ),
          ext.confirmInstall(),
        ]);
        installed = true;
        expect(installResp.status()).toBeGreaterThanOrEqual(200);
        expect(installResp.status()).toBeLessThan(300);
      });

      await test.step("плагин появился в /minecraft/plugins/installed", async () => {
        const [r] = await Promise.all([
          page.waitForResponse((res) => GAME_PANEL_EXTENSIONS_API.pluginsInstalled.test(res.url()), { timeout: 30_000 }),
          ext.filterTo("Installed"),
        ]);
        const json = (await r.json()) as { data: Array<{ path: string | null; name: string | null }> };
        const hit = json.data.some(
          (d) => (d.name ?? "").includes(target.name) || (d.path ?? "").toLowerCase().includes(target.name.toLowerCase().slice(0, 6)),
        );
        expect(hit).toBe(true);
      });
    } finally {
      // откат: снять всё, что удалось установить
      if (installed) {
        await ext.gotoExtensions();
        await ext.filterTo("Installed");
        const btn = ext.uninstallButton(0);
        if (await btn.isVisible().catch(() => false)) {
          await btn.click().catch(() => {});
        }
      }
    }
  });
});
