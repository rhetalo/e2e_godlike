/**
 * Game panel — Mods (каталог + контракт api/v2 + versions).
 *
 * Регресс-baseline под задачу Inc 2 (mods → surrogate PK + нормализованные версии).
 * Как и Inc 3 (plugins), рефактор меняет ВНУТРЕННИЙ PK, но публичная идентичность неизменна:
 * `id` в ответе = сырой провайдерский external_id (не суррогат), версии резолвятся по
 * `{provider}-{external_id}`. Зеркало plugins.spec.ts на том же компоненте .server__extensions.
 *
 * Что НЕ здесь (→ backend PHPUnit `--filter=Mod`): swap-миграция, ноль сирот FK, коллизия
 * (modrinth:abc, curseforge:abc) → разные суррогаты, персистенс/парсеры.
 *
 * ⚠️ Install мода = мутация → env-гейт RUN_PLUGIN_INSTALL=1 (общий флаг с plugins), serial + откат.
 * Подтверждено live network 20-Jul-2026 (на сервере 93521c70; с 18-Aug-2026 он удалён — тесты
 * переехали на GAME_PANEL_PLUGIN_SERVER_UUID).
 */
import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { GamePanelExtensionsPage } from "../../../pages/game/GamePanelExtensionsPage";
import { loginAndSaveGameSession, GAME_STORAGE_STATE_PATH } from "../../../utils/gameAuth";
import { GAME_PANEL_EXTENSIONS_API } from "../../../utils/selectors";

/** Тот же сервер, что в plugins.spec (общий env-ключ). ⚠️ Про дрейф `93521c70` → см. plugins.spec. */
const PLUGIN_SERVER_UUID = process.env.GAME_PANEL_PLUGIN_SERVER_UUID ?? "0c743c25";
const RUN_INSTALL = process.env.RUN_PLUGIN_INSTALL === "1";
// Каталог mods/versions агрегируется из внешних провайдеров (Modrinth/CurseForge/…) и стал
// отвечать дольше 30s → стабильные таймауты на CI. Даём запас (в пределах test timeout 120s).
// installed — локальное файловое сканирование, быстрое → его таймаут не трогаем. (18-Aug-2026)
const CATALOG_LOAD_TIMEOUT = 60_000;

interface CatalogItem {
  id: string;
  name: string;
  provider: string;
  is_installed: boolean;
  categories: Array<{ id: number; name: string; slug: string }>;
}
interface VersionItem {
  id: string;
  name: string;
  game_versions: string[];
  download_url: string;
}

test.describe.configure({ mode: "serial" });

test.describe("@regression [game-panel] Mods (каталог + api/v2 контракт)", () => {
  let context: BrowserContext;
  let page: Page;
  let ext: GamePanelExtensionsPage;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    page = await context.newPage();
    ext = new GamePanelExtensionsPage(page, PLUGIN_SERVER_UUID);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("TC-GP-MOD-001 | Каталог модов: рендер + контракт списка api/v2", async () => {
    // /extensions грузит Mods по умолчанию
    const [resp] = await Promise.all([
      page.waitForResponse((r) => GAME_PANEL_EXTENSIONS_API.modsList.test(r.url()), { timeout: CATALOG_LOAD_TIMEOUT }),
      ext.gotoExtensions(),
    ]);
    const json = (await resp.json()) as { success: boolean; data: CatalogItem[] };

    await test.step("ответ /minecraft/mods успешен и содержит массив data", async () => {
      expect(resp.status()).toBe(200);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
    });

    await test.step("элемент несёт provider + внешний id (не суррогатный PK)", async () => {
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

  test("TC-GP-MOD-002 | Идентичность мода резолвится по {provider}-{external_id} (/versions)", async () => {
    const [listResp] = await Promise.all([
      page.waitForResponse((r) => GAME_PANEL_EXTENSIONS_API.modsList.test(r.url()), { timeout: CATALOG_LOAD_TIMEOUT }),
      ext.gotoExtensions(),
    ]);
    const first = ((await listResp.json()) as { data: CatalogItem[] }).data[0];

    const [verResp] = await Promise.all([
      page.waitForResponse((r) => GAME_PANEL_EXTENSIONS_API.modVersions.test(r.url()), { timeout: CATALOG_LOAD_TIMEOUT }),
      ext.openInstallDialog(0),
    ]);
    const versions = (await verResp.json()) as { success: boolean; data: VersionItem[] };

    await test.step("URL версий содержит {provider}-{external_id}", async () => {
      expect(verResp.url()).toContain(`${first.provider}-${first.id}`);
    });

    await test.step("ответ версий успешен, версия несёт id/name/game_versions/download_url", async () => {
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

  test("TC-GP-MOD-003 | Install-диалог мода открывается и закрывается без установки", async () => {
    await ext.gotoExtensions();
    await ext.openInstallDialog(0);

    await test.step("диалог виден, есть Install/Cancel", async () => {
      await expect(ext.installDialog).toBeVisible();
      await expect(ext.dialogButton("Install")).toBeVisible();
      await expect(ext.dialogButton("Cancel")).toBeVisible();
    });

    await test.step("Esc закрывает диалог — мутации не произошло", async () => {
      await ext.dismissInstallDialog();
      await expect(ext.installDialog).toBeHidden();
    });
  });

  test("TC-GP-MOD-004 | install → installed → uninstall мода (МУТАЦИЯ, self-cleaning)", async () => {
    test.skip(!RUN_INSTALL, "мутирует общий прод-сервер; включать только RUN_PLUGIN_INSTALL=1 с ведома владельца");

    const [listResp] = await Promise.all([
      page.waitForResponse((r) => GAME_PANEL_EXTENSIONS_API.modsList.test(r.url()), { timeout: CATALOG_LOAD_TIMEOUT }),
      ext.gotoExtensions(),
    ]);
    const target = ((await listResp.json()) as { data: CatalogItem[] }).data[0];

    let installed = false;
    try {
      await test.step(`install "${target.name}" (${target.provider}-${target.id})`, async () => {
        await ext.openInstallDialog(0);
        const [installResp] = await Promise.all([
          page.waitForResponse(
            (r) => r.request().method() === "POST" && /\/minecraft\/mods/.test(r.url()),
            { timeout: 60_000 },
          ),
          ext.confirmInstall(),
        ]);
        installed = true;
        expect(installResp.status()).toBeGreaterThanOrEqual(200);
        expect(installResp.status()).toBeLessThan(300);
      });

      await test.step("мод появился в /minecraft/mods/installed", async () => {
        const [r] = await Promise.all([
          page.waitForResponse((res) => GAME_PANEL_EXTENSIONS_API.modsInstalled.test(res.url()), { timeout: 30_000 }),
          ext.filterTo("Installed"),
        ]);
        const json = (await r.json()) as { data: Array<{ path: string | null; name: string | null }> };
        const hit = json.data.some(
          (d) => (d.name ?? "").includes(target.name) || (d.path ?? "").toLowerCase().includes(target.name.toLowerCase().slice(0, 6)),
        );
        expect(hit).toBe(true);
      });
    } finally {
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
