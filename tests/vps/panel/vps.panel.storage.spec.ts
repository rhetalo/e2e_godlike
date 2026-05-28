/**
 * vps.panel.storage.spec.ts
 * ──────────────────────────
 * Тесты вкладки Storage на странице управления сервером VirtFusion.
 * URL: https://vf-panel.godlike.host/server/{UUID}
 *
 * Покрытие:
 *   1. Вкладка Storage открывается
 *   2. "Drive:" label (vlang[206]) — подтверждена, всегда на странице
 *   3. "Primary" disk designation (vlang[207]) — подтверждена, всегда на странице
 *   4. "HDD" disk type (vlang[308]) — зависит от плана, test.skip если не найдено
 *   5. Размер диска в GB присутствует
 *
 * vlang-строки подтверждены на живом сервере (май 2026):
 *   vlang[199] = "Storage:"
 *   vlang[206] = "Drive:"      ← точная метка диска
 *   vlang[207] = "Primary"     ← тип/статус диска
 *   vlang[308] = "HDD"         ← тип диска (только если HDD-план)
 *
 * Запуск:
 *   npx playwright test tests/vps/panel/vps.panel.storage.spec.ts --project=chromium --headed
 */
import { test, expect, type Browser, type BrowserContext } from "@playwright/test";
import { VpsPanelServerPage } from "../../../pages/VpsPanelServerPage";
import { VpsPanelStoragePage } from "../../../pages/VpsPanelStoragePage";
import {
  loginAndSaveSession,
  STORAGE_STATE_PATH,
  TEST_SERVER_UUID,
} from "../../../utils/auth";

test.use({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});

test.describe.configure({ mode: "serial" });

let sharedContext: BrowserContext;
let serverPage: VpsPanelServerPage;
let storagePage: VpsPanelStoragePage;

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginAndSaveSession(browser);
  sharedContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await sharedContext.newPage();
  serverPage = new VpsPanelServerPage(page, TEST_SERVER_UUID);
  storagePage = new VpsPanelStoragePage(page);
});

test.afterAll(async () => {
  await sharedContext.close();
});

// ── Helper ────────────────────────────────────────────────────────────────────

async function openStorageTab() {
  await serverPage.goto();
  const storageTab = serverPage.tab("Storage");
  await expect(storageTab).toBeVisible({ timeout: 15_000 });
  await serverPage.clickTab("Storage");
  await storagePage.waitForStorageTab();
}

// ══════════════════════════════════════════════════════════════════════════════
// SUITE — Storage Tab
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Storage Tab", () => {
  test("вкладка Storage присутствует на странице сервера", async () => {
    await serverPage.goto();

    await test.step("Storage tab visible", async () => {
      await expect(serverPage.tab("Storage")).toBeVisible({ timeout: 15_000 });
    });
  });

  test("клик по Storage — Drive: и Primary labels загружаются", async () => {
    await openStorageTab();

    await expect(storagePage.driveLabel).toBeVisible({ timeout: 10_000 });
    await expect(storagePage.primaryDiskLabel).toBeVisible({ timeout: 10_000 });
  });

  test("'HDD' disk type (vlang[308]) — проверяем если HDD-план", async () => {
    await openStorageTab();

    const page = sharedContext.pages()[0];
    const bodyText = await page.locator("body").innerText();
    const isHdd = bodyText.includes("HDD");

    test.skip(!isHdd, "Диск не HDD на этом плане — пропускаем HDD-проверку");

    await test.step('"HDD" label видна (vlang[308])', async () => {
      await expect(storagePage.hddLabel).toBeVisible({ timeout: 10_000 });
    });
  });

  test("размер диска в GB присутствует", async () => {
    await openStorageTab();

    await test.step("Найдено хотя бы одно значение NNN GB", async () => {
      const diskText = await storagePage.getDiskInfoText();
      expect(diskText, "Размер диска в GB не найден на Storage tab").not.toBe("");
    });
  });
});
