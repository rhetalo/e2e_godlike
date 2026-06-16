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
// Вкладка Storage — информационная: карточка диска с реальными данными.
// ══════════════════════════════════════════════════════════════════════════════
test.describe("@regression VPS-панель — вкладка Storage", () => {
  test("карточка диска показывает Drive: <letter>, размер в GB и бейдж Primary", async () => {
    await test.step("вкладка Storage присутствует, клик открывает карточку", async () => {
      await expect(serverPage.tab("Storage")).toBeVisible({ timeout: 15_000 });
      await serverPage.clickTab("Storage");
      await storagePage.waitForStorageTab();
    });

    await test.step("заголовок диска — реальный 'Drive: <letter>'", async () => {
      await expect(storagePage.driveHeading).toHaveText(/Drive:\s*[A-Z]/, { timeout: 10_000 });
    });

    await test.step("размер диска — реальное значение в GB", async () => {
      await expect(storagePage.diskSizeLabel).toHaveText(/\d+\s*GB/, { timeout: 10_000 });
    });

    await test.step("диск помечен бейджем Primary", async () => {
      await expect(storagePage.primaryBadge).toContainText("Primary", { timeout: 10_000 });
    });
  });
});
