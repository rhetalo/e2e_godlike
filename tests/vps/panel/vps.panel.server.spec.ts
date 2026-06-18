/**
 * vps.panel.server.spec.ts
 * ────────────────────────
 * Тесты страницы управления сервером VirtFusion и навигации к ней.
 * URL: https://vf-panel.godlike.host/server/{UUID}
 *
 * Покрытие:
 *   1. Dashboard → навигация Servers → Manage → страница сервера
 *   2. Страница сервера: имя и статус
 *   3. Кнопки управления питанием присутствуют (smoke; детали — power.actions)
 *   4. Навигация по вкладкам (каждая активируется)
 *   5. Список /servers: имя сервера, All/Bookmarked, иконка закладки
 *
 * Read-only: деструктивные операции тут не выполняются (см. power.actions/rebuild).
 *
 * Запуск:
 *   npx playwright test tests/vps/panel/vps.panel.server.spec.ts --project=vps-panel --headed
 */
import { test, expect, type Browser, type BrowserContext } from "@playwright/test";
import { VpsPanelServerPage } from "../../../pages/VpsPanelServerPage";
import { VpsPanelDashboardPage } from "../../../pages/VpsPanelDashboardPage";
import {
  loginAndSaveSession,
  STORAGE_STATE_PATH,
  TEST_SERVER_UUID,
  TEST_SERVER_NAME,
} from "../../../utils/auth";

test.use({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});

test.describe.configure({ mode: "serial" });

let sharedContext: BrowserContext;
let serverPage: VpsPanelServerPage;
let dashboardPage: VpsPanelDashboardPage;

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginAndSaveSession(browser);
  sharedContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await sharedContext.newPage();
  serverPage = new VpsPanelServerPage(page, TEST_SERVER_UUID);
  dashboardPage = new VpsPanelDashboardPage(page);
});

test.afterAll(async () => {
  await sharedContext.close();
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — Dashboard и навигация к серверу
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS-панель — Dashboard и навигация", () => {
  test("@smoke TC-VPS-SRV-001 | dashboard загружается, ссылки Dashboard и Servers видны", async () => {
    await dashboardPage.goto();

    await test.step("URL содержит /dashboard", async () => {
      expect(serverPage.page.url()).toMatch(/\/dashboard/);
    });

    await test.step("ссылки навигации Dashboard и Servers видны", async () => {
      await expect(dashboardPage.navDashboardLink).toBeVisible({ timeout: 10_000 });
      await expect(dashboardPage.navServersLink).toBeVisible({ timeout: 10_000 });
    });
  });

  test("@regression TC-VPS-SRV-002 | Servers → /servers → Manage → страница /server/", async () => {
    const page = serverPage.page;

    await test.step("клик Servers в навигации → /servers", async () => {
      await dashboardPage.goto();
      await dashboardPage.navigateToServers();
      expect(page.url()).toMatch(/\/servers/);
    });

    await test.step("у тестового сервера видна кнопка Manage", async () => {
      await expect(dashboardPage.manageButtons.first()).toBeVisible({ timeout: 15_000 });
    });

    await test.step("клик Manage → открывается страница /server/", async () => {
      await dashboardPage.openFirstServer();
      expect(page.url()).toMatch(/\/server\//);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — Страница сервера: идентичность и статус
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS-панель — страница сервера", () => {
  test.beforeEach(async () => {
    await serverPage.goto();
  });

  test("@regression TC-VPS-SRV-003 | имя сервера и валидный статус отображаются", async () => {
    await test.step(`имя "${TEST_SERVER_NAME}" присутствует на странице`, async () => {
      await expect(serverPage.serverNameLabel(TEST_SERVER_NAME)).toBeVisible({ timeout: 15_000 });
    });

    await test.step("статус сервера — одно из валидных значений", async () => {
      const statusText = (await serverPage.getStatusText()).toLowerCase();
      const valid = ["running", "stopped", "paused", "building", "starting"];
      expect(
        valid.some((s) => statusText.includes(s)),
        `Неизвестный статус: "${statusText}"`,
      ).toBeTruthy();
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — Power Controls (smoke; детали — vps.panel.power.actions.spec.ts)
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS-панель — управление питанием", () => {
  test("@regression TC-VPS-SRV-004 | кнопки управления питанием присутствуют", async () => {
    await serverPage.goto();
    // allPowerButtons исключает data-bs-dismiss="modal" — только реальные кнопки в хедере.
    await expect(serverPage.allPowerButtons.first()).toBeVisible({ timeout: 10_000 });
    expect(await serverPage.allPowerButtons.count(), "Ни одной кнопки питания").toBeGreaterThanOrEqual(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — Навигация по вкладкам (каждая активируется)
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS-панель — навигация по вкладкам", () => {
  const tabLabels = ["Overview", "Media", "Options", "Network", "Storage", "Sharing"] as const;

  for (const tabLabel of tabLabels) {
    test(`@regression вкладка "${tabLabel}" — кликабельна и становится активной`, async () => {
      await serverPage.goto();

      const isVisible = await serverPage.tab(tabLabel).isVisible().catch(() => false);
      test.skip(!isVisible, `Вкладка "${tabLabel}" не видна`);

      await serverPage.clickTab(tabLabel);
      await expect(serverPage.activeTab).toContainText(tabLabel, { timeout: 5_000 });
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 5 — Список серверов (/servers)
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS-панель — список серверов (/servers)", () => {
  test.beforeEach(async () => {
    await dashboardPage.gotoServers();
    await dashboardPage.waitForServersList();
  });

  test("@regression TC-VPS-SRV-005 | имя тестового сервера видно в списке", async () => {
    await expect(serverPage.serverNameLabel(TEST_SERVER_NAME)).toBeVisible({ timeout: 15_000 });
  });

  test("@regression TC-VPS-SRV-006 | вкладки All/Bookmarked есть, переключение работает, есть иконка закладки", async () => {
    await test.step("вкладки All Servers и Bookmarked Servers видны", async () => {
      await expect(dashboardPage.allServersTab).toBeVisible({ timeout: 10_000 });
      await expect(dashboardPage.bookmarkedServersTab).toBeVisible({ timeout: 10_000 });
    });

    await test.step("клик Bookmarked Servers → radio становится checked", async () => {
      await dashboardPage.bookmarkedServersTab.click();
      await expect(dashboardPage.bookmarkedServersRadio).toBeChecked({ timeout: 5_000 });
      // Возвращаемся на All Servers, чтобы не оставлять состояние списка изменённым.
      await dashboardPage.allServersTab.click();
    });

    await test.step("у сервера есть иконка закладки", async () => {
      await expect(dashboardPage.bookmarkIcon).toBeVisible({ timeout: 10_000 });
    });
  });
});
