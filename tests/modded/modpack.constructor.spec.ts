/**
 * modpack.constructor.spec.ts
 * ───────────────────────────
 * Конструктор модпаков (/custom-minecraft-modpacks-constructor/) — совместимость модов и
 * кнопка Download Client Mods. Web-component на Shadow DOM с ленивой гидрацией; всё драйвится
 * через ModpackConstructorPage (mouse-нудж в waitReady, поиск по Enter — см. Page Object).
 *
 * Регрессия на фикс DEV-315: раньше мод, несовместимый с выбранной версией MC, можно было
 * добавить, он помечался client-side + Setup Status GOOD + активная кнопка Download, а бэкенд
 * POST /mod-configurator/client-mods отдавал невнятную 400 "No client-side mods to download".
 * После фикса несовместимый мод помечается "Incompatible", Setup Status → WARNING, Download
 * заблокирован. Совместимый клиентский мод по-прежнему отдаёт zip (нет регресса).
 * Confirmed live 20-Jul-2026: Mod Menu Stylizer (max 1.21) несовместим с Fabric 1.21.1; Athena — совместим.
 *
 * ⚠️ Live-prod safety: только read-only + install + скачивание zip. "Proceed with test run" и
 * "Start 3-hour Demo" НЕ жмём (поднимают реальный демо-сервер).
 *
 * Запуск:
 *   npx playwright test tests/modded/modpack.constructor.spec.ts --project=storefront
 */
import { test, expect } from "../../fixtures/base";
import { ModpackConstructorPage } from "../../pages/ModpackConstructorPage";

// Мод, у которого нет файла под выбранную версию MC (max game version 1.21).
const INCOMPATIBLE_MOD = "Mod Menu Stylizer";
// Клиентский мод, совместимый с Fabric 1.21.1 (есть файл под 1.21.1).
const COMPATIBLE_CLIENT_MOD = "Athena";

test.describe("Modpack Constructor — совместимость модов и Download Client Mods", () => {
  let mc: ModpackConstructorPage;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(90_000);
    mc = new ModpackConstructorPage(page);
    await mc.open();
    // Конфиг, в котором INCOMPATIBLE_MOD несовместим, а COMPATIBLE_CLIENT_MOD — совместим.
    await mc.changeConfig({ loader: /^Fabric$/i, gameVersion: "Minecraft 1.21.1" });
  });

  test("@regression несовместимый мод: бейдж Incompatible, Setup Status WARNING, Download disabled (DEV-315)", async () => {
    await test.step("установить мод, несовместимый с версией (фильтр Hide incompatible снят)", async () => {
      await mc.setHideIncompatible(false);
      await mc.searchMod(INCOMPATIBLE_MOD);
      await mc.installMod(INCOMPATIBLE_MOD);
      await mc.clearSearch();
    });

    await test.step("мод помечен Incompatible", async () => {
      // бейдж/статус проставляются после асинхронного пересчёта estimation → poll
      await expect
        .poll(() => mc.isInstalledModIncompatible(INCOMPATIBLE_MOD), {
          message: "несовместимый мод должен иметь бейдж Incompatible",
          timeout: 15_000,
        })
        .toBe(true);
    });

    await test.step("Setup Status = WARNING", async () => {
      await expect.poll(() => mc.setupStatus(), { timeout: 15_000 }).toMatch(/WARNING/i);
    });

    await test.step("Download Client Mods заблокирован (невнятная 400 больше не вызывается)", async () => {
      await expect(mc.downloadButton()).toBeDisabled();
    });
  });

  test("@critical совместимый клиентский мод: Download Client Mods отдаёт zip", async () => {
    await test.step("установить совместимый клиентский мод", async () => {
      await mc.searchMod(COMPATIBLE_CLIENT_MOD);
      await mc.installMod(COMPATIBLE_CLIENT_MOD);
      await mc.clearSearch();
    });

    await test.step("Setup Status = GOOD, кнопка Download активна", async () => {
      await expect.poll(() => mc.setupStatus(), { timeout: 15_000 }).toMatch(/GOOD/i);
      await expect(mc.downloadButton()).toBeEnabled();
    });

    await test.step("Download возвращает 200 и zip", async () => {
      const res = await mc.downloadClientMods();
      expect(res.status, `тело ответа: ${res.body ?? "(zip)"}`).toBe(200);
      expect(res.isZip, "ответ должен быть zip-архивом").toBe(true);
    });
  });

  test("@regression Download Client Mods disabled без установленных модов (DoD)", async () => {
    await expect(mc.downloadButton()).toBeDisabled();
  });
});
