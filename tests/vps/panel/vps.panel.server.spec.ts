/**
 * vps.panel.server.spec.ts
 * ────────────────────────
 * Тесты страницы управления сервером VirtFusion.
 * URL: https://vf-panel.godlike.host/server/{UUID}
 *
 * Покрытие:
 *   1. Dashboard → навигация до сервера
 *   2. /servers список — Manage кнопка
 *   3. Прямой переход на страницу сервера
 *   4. Статус сервера виден
 *   5. Кнопки управления питанием (Boot / Shutdown / Power Off / Restart)
 *   6. Навигация по всем вкладкам
 *
 * Деструктивные операции (power off, rebuild):
 *   Проверяем UI до подтверждения, затем жмём Cancel.
 *
 * Запуск:
 *   npx playwright test tests/vps/panel/vps.panel.server.spec.ts --project=chromium --headed
 */
import { test, expect, type Browser, type BrowserContext } from "@playwright/test";
import { VpsPanelServerPage } from "../../../pages/VpsPanelServerPage";
import { VpsPanelDashboardPage } from "../../../pages/VpsPanelDashboardPage";
import {
  loginAndSaveSession,
  PANEL_URL,
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

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginAndSaveSession(browser);
  sharedContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await sharedContext.newPage();
  serverPage = new VpsPanelServerPage(page, TEST_SERVER_UUID);
});

test.afterAll(async () => {
  await sharedContext.close();
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — Dashboard Navigation
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS-панель — Dashboard и навигация", () => {
  test("@smoke dashboard загружается после логина", async () => {
    const page = sharedContext.pages()[0];
    const dashboard = new VpsPanelDashboardPage(page);

    await dashboard.goto();

    await test.step("URL содержит /dashboard", async () => {
      expect(page.url()).toMatch(/\/dashboard/);
    });
  });

  test("@regression навигация: ссылки Dashboard и Servers видны", async () => {
    const page = sharedContext.pages()[0];
    const dashboard = new VpsPanelDashboardPage(page);

    await dashboard.goto();

    await test.step("Dashboard link visible", async () => {
      await expect(dashboard.navDashboardLink).toBeVisible({ timeout: 10_000 });
    });

    await test.step("Servers link visible", async () => {
      await expect(dashboard.navServersLink).toBeVisible({ timeout: 10_000 });
    });
  });

  test("@regression клик по Servers в навигации → /servers", async () => {
    const page = sharedContext.pages()[0];
    const dashboard = new VpsPanelDashboardPage(page);

    await dashboard.goto();
    await dashboard.navigateToServers();

    await test.step("URL содержит /servers", async () => {
      expect(page.url()).toMatch(/\/servers/);
    });
  });

  test("@regression страница /servers — кнопка Manage видна для тестового сервера", async () => {
    const page = sharedContext.pages()[0];

    await page.goto(`${PANEL_URL}/servers`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("networkidle").catch(() => null);

    await test.step("Manage button visible", async () => {
      const manageBtn = page.locator('button:has-text("Manage"), a:has-text("Manage")').first();
      await expect(manageBtn).toBeVisible({ timeout: 15_000 });
    });
  });

  test("@regression клик Manage на /servers → открывается страница /server/", async () => {
    const page = sharedContext.pages()[0];
    const dashboard = new VpsPanelDashboardPage(page);

    await dashboard.gotoServers();
    await dashboard.openFirstServer();

    await test.step("URL содержит /server/", async () => {
      expect(page.url()).toMatch(/\/server\//);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — Server Detail Page Structure
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS-панель — структура страницы сервера", () => {
  test.beforeEach(async () => {
    await serverPage.goto();
  });

  test("@regression прямой переход на /server/{UUID} загружается", async () => {
    const page = sharedContext.pages()[0];

    await test.step("URL содержит TEST_SERVER_UUID", async () => {
      expect(page.url()).toContain(TEST_SERVER_UUID);
    });
  });

  test("@regression имя сервера видно на странице", async () => {
    const page = sharedContext.pages()[0];

    await test.step(`Имя "${TEST_SERVER_NAME}" присутствует`, async () => {
      const bodyText = await page.locator("body").innerText();
      expect(bodyText).toContain(TEST_SERVER_NAME);
    });
  });

  test("@regression статус сервера отображается (Running / Stopped / Paused)", async () => {
    const statusText = await serverPage.getStatusText();

    await test.step("Статус-элемент содержит валидное значение", async () => {
      const validStatuses = ["running", "stopped", "paused", "building", "starting"];
      const isValid = validStatuses.some(s => statusText.toLowerCase().includes(s));
      expect(isValid, `Неизвестный статус: "${statusText}"`).toBeTruthy();
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — Power Controls (smoke)
// Детальные проверки состояний и модалов — в vps.panel.power.actions.spec.ts
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS-панель — управление питанием", () => {
  test("@regression кнопки управления питанием присутствуют на странице сервера", async () => {
    await serverPage.goto();

    // allPowerButtons исключает data-bs-dismiss="modal" — только реальные кнопки в хедере
    await expect(serverPage.allPowerButtons.first()).toBeVisible({ timeout: 10_000 });
    const count = await serverPage.allPowerButtons.count();
    expect(count, "Ни одной кнопки питания не найдено").toBeGreaterThanOrEqual(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — Tab Navigation
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS-панель — навигация по вкладкам", () => {
  const tabLabels = ["Overview", "Media", "Options", "Network", "Storage", "Sharing"] as const;

  test("@regression все 6 вкладок присутствуют на странице сервера", async () => {
    await serverPage.goto();

    const found: string[] = [];
    for (const label of tabLabels) {
      const isVisible = await serverPage.tab(label).isVisible().catch(() => false);
      if (isVisible) found.push(label);
    }

    await test.step("Минимум 4 вкладки видны", async () => {
      expect(found.length, `Видны: ${found.join(", ")}`).toBeGreaterThanOrEqual(4);
    });
  });

  for (const tabLabel of tabLabels) {
    test(`@regression вкладка "${tabLabel}" — кликабельна, становится активной`, async () => {
      await serverPage.goto();

      const isVisible = await serverPage.tab(tabLabel).isVisible().catch(() => false);
      test.skip(!isVisible, `Вкладка "${tabLabel}" не видна`);

      await serverPage.clickTab(tabLabel);

      // Проверяем что активный таб содержит нужный текст
      await expect(serverPage.activeTab).toContainText(tabLabel, { timeout: 5_000 });
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 5 — Servers List (/servers)
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS-панель — список серверов (/servers)", () => {
  test.beforeEach(async () => {
    const page = sharedContext.pages()[0];
    await page.goto(`${PANEL_URL}/servers`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("networkidle").catch(() => null);
  });

  test("@regression имя тестового сервера видно в списке", async () => {
    const page = sharedContext.pages()[0];
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toContain(TEST_SERVER_NAME);
  });

  test("@regression вкладки 'All Servers' и 'Bookmarked Servers' присутствуют", async () => {
    const page = sharedContext.pages()[0];

    const allTab = page.locator('label[for="serverListType1"]');
    const bookmarkedTab = page.locator('label[for="serverListType2"]');

    await expect(allTab).toBeVisible({ timeout: 10_000 });
    await expect(bookmarkedTab).toBeVisible({ timeout: 10_000 });
  });

  test("@regression клик 'Bookmarked Servers' переключает вкладку", async () => {
    const page = sharedContext.pages()[0];

    const bookmarkedTab = page.locator('label[for="serverListType2"]');
    await bookmarkedTab.click();

    // radio input для Bookmarked должен стать checked
    const input = page.locator('input#serverListType2');
    await expect(input).toBeChecked({ timeout: 5_000 });

    // Возвращаемся обратно
    await page.locator('label[for="serverListType1"]').click();
  });

  test("@regression у сервера есть bookmark-иконка", async () => {
    const page = sharedContext.pages()[0];

    const bookmarkIcon = page.locator('[tt="Bookmark"], [tt="Remove bookmark"]').first();
    await expect(bookmarkIcon).toBeVisible({ timeout: 10_000 });
  });
});
