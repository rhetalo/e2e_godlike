/**
 * vps.panel.storage.spec.ts
 * ──────────────────────────
 * Тесты вкладки Storage на странице управления сервером VirtFusion.
 * URL: https://vf-panel.godlike.host/server/{UUID}
 *
 * Покрытие (намеренно минимальное — вкладка только информационная):
 *   1. Вкладка Storage присутствует и кликабельна
 *   2. После клика отображается карточка диска: Drive: <letter> + размер в GB
 *
 * Confirmed HTML (May 2026):
 *   <h4>Drive: A</h4>
 *   <span class="badge badge-warning">Primary</span>
 *   <span class="mt-3">30 GB</span>
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
  await serverPage.goto();
});

test.afterAll(async () => {
  await sharedContext.close();
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE — Storage Tab
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Storage Tab", () => {
  test("вкладка Storage присутствует на странице сервера", async () => {
    await expect(serverPage.tab("Storage")).toBeVisible({ timeout: 15_000 });
  });

  test("клик по Storage — карточка диска отображается", async () => {
    await serverPage.clickTab("Storage");
    await storagePage.waitForStorageTab();

    await test.step("заголовок Drive: <letter> виден", async () => {
      await expect(storagePage.driveHeading).toBeVisible({ timeout: 10_000 });
    });

    await test.step("размер диска в GB отображается", async () => {
      await expect(storagePage.diskSizeLabel).toBeVisible({ timeout: 10_000 });
    });
  });
});
