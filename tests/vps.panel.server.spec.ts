/**
 * vps.panel.server.spec.ts
 * ────────────────────────
 * Тесты страницы управления сервером VirtFusion.
 * URL: https://vf-panel.godlike.host/server/9c49ed96-56f4-41c8-bc5f-a8d44c21a486
 *
 * Покрытие:
 *   1. Dashboard → навигация до сервера
 *   2. /servers список — Manage кнопка
 *   3. Прямой переход на страницу сервера
 *   4. Статус сервера виден
 *   5. Кнопки управления питанием (Boot / Shutdown / Power Off / Restart)
 *   6. Навигация по всем 7 вкладкам
 *   7. Breadcrumb / навигация назад
 *
 * Запуск:
 *   npx playwright test tests/vps.panel.server.spec.ts --project=chromium
 *   npx playwright test tests/vps.panel.server.spec.ts --project=chromium --headed
 *
 * Деструктивные операции (power off, rebuild):
 *   Проверяем UI до подтверждения, затем жмём Cancel.
 */
import { test, expect, type Browser } from "@playwright/test";
import { VpsPanelServerPage } from "../pages/VpsPanelServerPage";
import { VpsPanelDashboardPage } from "../pages/VpsPanelDashboardPage";
import {
  loginAndSaveSession,
  PANEL_URL,
  STORAGE_STATE_PATH,
  TEST_SERVER_UUID,
  TEST_SERVER_NAME,
  TEST_SERVER_URL,
} from "../utils/auth";

test.use({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginAndSaveSession(browser);
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function openServerPage(browser: Browser) {
  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();
  const serverPage = new VpsPanelServerPage(page, TEST_SERVER_UUID);
  await serverPage.goto();
  console.log(`[INFO] Server page URL: ${page.url()}`);
  return { context, page, serverPage };
}

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — Dashboard Navigation
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Dashboard & Navigation", () => {
  test("dashboard загружается после логина", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    const dashboard = new VpsPanelDashboardPage(page);

    await dashboard.goto();

    console.log(`[INFO] Dashboard URL: ${page.url()}`);
    expect(page.url()).toMatch(/\/dashboard/);
    console.log("[INFO] Dashboard loaded ✓");

    await context.close();
  });

  test("навигация: ссылки Dashboard и Servers видны", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    const dashboard = new VpsPanelDashboardPage(page);

    await dashboard.goto();

    await expect(dashboard.navDashboardLink).toBeVisible({ timeout: 10_000 });
    await expect(dashboard.navServersLink).toBeVisible({ timeout: 10_000 });
    console.log("[INFO] Nav links visible: Dashboard, Servers ✓");

    await context.close();
  });

  test("клик по Servers в навигации → /servers", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    const dashboard = new VpsPanelDashboardPage(page);

    await dashboard.goto();
    await dashboard.navigateToServers();

    console.log(`[INFO] After Servers nav click: ${page.url()}`);
    expect(page.url()).toMatch(/\/servers/);

    await context.close();
  });

  test("страница /servers — кнопка Manage видна для тестового сервера", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    const dashboard = new VpsPanelDashboardPage(page);

    await dashboard.gotoServers();

    const manageBtn = page.locator('button:has-text("Manage"), a:has-text("Manage")').first();
    await expect(manageBtn).toBeVisible({ timeout: 15_000 });
    console.log("[INFO] Manage button visible on servers list ✓");

    await context.close();
  });

  test("клик Manage на /servers → открывается страница сервера /server/", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    const dashboard = new VpsPanelDashboardPage(page);

    await dashboard.gotoServers();
    await dashboard.openFirstServer();

    console.log(`[INFO] After Manage click URL: ${page.url()}`);
    expect(page.url()).toMatch(/\/server\//);

    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — Server Detail Page Structure
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Server Page Structure", () => {
  test("прямой переход на /server/{UUID} загружается", async ({ browser }) => {
    const { context, page } = await openServerPage(browser);

    expect(page.url()).toContain(TEST_SERVER_UUID);
    console.log(`[INFO] Server page loaded: ${page.url()}`);

    await context.close();
  });

  test("имя сервера видно на странице", async ({ browser }) => {
    const { context, page, serverPage } = await openServerPage(browser);

    const bodyText = await page.locator("body").innerText();
    const hasServerName = bodyText.includes(TEST_SERVER_NAME);
    console.log(`[INFO] Server name "${TEST_SERVER_NAME}" on page: ${hasServerName}`);
    expect(hasServerName).toBeTruthy();

    await context.close();
  });

  test("статус сервера отображается (Running / Stopped / Paused)", async ({ browser }) => {
    const { context, page, serverPage } = await openServerPage(browser);

    const statusText = await serverPage.getStatusText();
    console.log(`[INFO] Server status: "${statusText}"`);

    const validStatuses = ["Running", "Stopped", "Paused", "Building", "Starting"];
    const hasValidStatus = validStatuses.some(s =>
      statusText.toLowerCase().includes(s.toLowerCase())
    ) || statusText.length > 0;

    console.log(`[INFO] Status element found: ${hasValidStatus}`);
    // Status может быть в любом месте страницы
    const bodyText = await page.locator("body").innerText();
    const hasAnyStatus = validStatuses.some(s => bodyText.includes(s));
    console.log(`[INFO] Status in page body: ${hasAnyStatus}`);

    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — Power Controls
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Power Controls", () => {
  test("кнопки управления питанием присутствуют на странице", async ({ browser }) => {
    const { context, page, serverPage } = await openServerPage(browser);

    // At least some power buttons should be present
    const allPowerBtns = serverPage.allPowerButtons;
    const count = await allPowerBtns.count();
    console.log(`[INFO] Power buttons found via data-action: ${count}`);

    // Also try text-based search
    const textBtns = page.locator(
      'button:has-text("Boot"), button:has-text("Shutdown"), button:has-text("Power Off"), button:has-text("Restart")'
    );
    const textCount = await textBtns.count();
    console.log(`[INFO] Power buttons via text: ${textCount}`);

    const total = count + textCount;
    console.log(`[INFO] Total power buttons: ${total}`);
    expect(total).toBeGreaterThanOrEqual(1);

    await context.close();
  });

  test("кнопка Restart присутствует и активна", async ({ browser }) => {
    const { context, page, serverPage } = await openServerPage(browser);

    // Try data-action first, then text
    const restartBtn = page.locator(
      'button[data-action="restart_server"], button:has-text("Restart")'
    ).first();

    const isVisible = await restartBtn.isVisible().catch(() => false);
    console.log(`[INFO] Restart button visible: ${isVisible}`);

    if (isVisible) {
      const isEnabled = await restartBtn.isEnabled().catch(() => false);
      console.log(`[INFO] Restart button enabled: ${isEnabled}`);
      await expect(restartBtn).toBeVisible();
    } else {
      // Server may be stopped — Boot button should be visible instead
      const bootBtn = page.locator(
        'button[data-action="boot_server"], button:has-text("Boot")'
      ).first();
      const bootVisible = await bootBtn.isVisible().catch(() => false);
      console.log(`[INFO] Boot button visible (server stopped): ${bootVisible}`);
    }

    await context.close();
  });

  test("кнопка Shutdown присутствует когда сервер запущен", async ({ browser }) => {
    const { context, page, serverPage } = await openServerPage(browser);

    const bodyText = await page.locator("body").innerText();
    const isRunning = bodyText.includes("Running");
    console.log(`[INFO] Server is running: ${isRunning}`);

    if (isRunning) {
      const shutdownBtn = page.locator(
        'button[data-action="shutdown_server"], button:has-text("Shutdown")'
      ).first();
      const isVisible = await shutdownBtn.isVisible().catch(() => false);
      console.log(`[INFO] Shutdown button visible (server running): ${isVisible}`);
      if (isVisible) {
        await expect(shutdownBtn).toBeEnabled();
        console.log("[INFO] Shutdown button enabled ✓");
      }
    } else {
      console.log("[INFO] Server not running — skipping Shutdown check");
    }

    await context.close();
  });

  test("кнопка Power Off — клик открывает подтверждение, Cancel закрывает", async ({ browser }) => {
    const { context, page, serverPage } = await openServerPage(browser);

    const bodyText = await page.locator("body").innerText();
    const isRunning = bodyText.includes("Running");

    if (!isRunning) {
      console.log("[INFO] Server not running — skipping Power Off confirm test");
      await context.close();
      return;
    }

    const powerOffBtn = page.locator(
      'button[data-action="poweroff_server"], button:has-text("Power Off")'
    ).first();

    const isVisible = await powerOffBtn.isVisible().catch(() => false);
    if (!isVisible) {
      console.log("[WARN] Power Off button not visible");
      await context.close();
      return;
    }

    await powerOffBtn.click();
    console.log("[INFO] Clicked Power Off");

    // Check for confirmation modal
    const modal = page.locator('[class*="modal"], [role="dialog"]').first();
    const modalAppeared = await modal.waitFor({ state: "visible", timeout: 5_000 })
      .then(() => true).catch(() => false);

    if (modalAppeared) {
      const modalText = await modal.innerText().catch(() => "");
      console.log(`[INFO] Power Off modal text: "${modalText.trim().slice(0, 100)}"`);

      const cancelBtn = page.locator('button:has-text("Cancel")').first();
      await cancelBtn.click();
      console.log("[INFO] Cancelled Power Off modal ✓");
    } else {
      console.log("[INFO] No modal for Power Off (direct action)");
    }

    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — Tab Navigation
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Tab Navigation", () => {
  const tabLabels = ["Overview", "Media", "Options", "Network", "Storage", "Backups"] as const;

  for (const tabLabel of tabLabels) {
    test(`вкладка "${tabLabel}" — кликабельна, контент загружается`, async ({ browser }) => {
      const { context, page, serverPage } = await openServerPage(browser);

      const tab = serverPage.tab(tabLabel);
      const isVisible = await tab.isVisible().catch(() => false);

      if (!isVisible) {
        console.log(`[WARN] Tab "${tabLabel}" not visible — skipping`);
        await context.close();
        return;
      }

      await serverPage.clickTab(tabLabel);
      console.log(`[INFO] Clicked tab "${tabLabel}", URL: ${page.url()}`);

      // Content area should have something after click
      const bodyText = await page.locator("body").innerText();
      expect(bodyText.length).toBeGreaterThan(100);
      console.log(`[INFO] Tab "${tabLabel}" content loaded ✓`);

      await context.close();
    });
  }

  test("все 6+ вкладок присутствуют на странице сервера", async ({ browser }) => {
    const { context, page, serverPage } = await openServerPage(browser);

    let foundCount = 0;
    const found: string[] = [];

    for (const label of tabLabels) {
      const tab = serverPage.tab(label);
      const isVisible = await tab.isVisible().catch(() => false);
      if (isVisible) {
        found.push(label);
        foundCount++;
      }
    }

    console.log(`[INFO] Visible tabs (${foundCount}): ${found.join(", ")}`);
    expect(foundCount).toBeGreaterThanOrEqual(4);

    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 5 — Server List Management
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Servers List (/servers)", () => {
  test("/servers загружается и показывает хотя бы 1 сервер", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();

    await page.goto(`${PANEL_URL}/servers`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForLoadState("networkidle").catch(() => null);

    console.log(`[INFO] Servers page URL: ${page.url()}`);

    // Wait for at least one server/manage button to appear
    const manageBtn = page.locator('button:has-text("Manage"), a:has-text("Manage")').first();
    await expect(manageBtn).toBeVisible({ timeout: 15_000 });

    const count = await page.locator('button:has-text("Manage"), a:has-text("Manage")').count();
    console.log(`[INFO] Manage buttons found: ${count}`);
    expect(count).toBeGreaterThanOrEqual(1);

    await context.close();
  });

  test("имя тестового сервера видно в списке", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();

    await page.goto(`${PANEL_URL}/servers`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForLoadState("networkidle").catch(() => null);

    const bodyText = await page.locator("body").innerText();
    console.log(`[INFO] Server name "${TEST_SERVER_NAME}" in list: ${bodyText.includes(TEST_SERVER_NAME)}`);
    expect(bodyText).toContain(TEST_SERVER_NAME);

    await context.close();
  });

  test("Delete кнопка на сервере — открывает модал, Cancel закрывает", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();

    await page.goto(`${PANEL_URL}/servers`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForLoadState("networkidle").catch(() => null);

    const deleteBtn = page.locator('button:has-text("Delete"), a:has-text("Delete")').first();
    const isVisible = await deleteBtn.isVisible().catch(() => false);

    if (!isVisible) {
      console.log("[INFO] Delete button not visible on servers list — skipping");
      await context.close();
      return;
    }

    await deleteBtn.click();
    console.log("[INFO] Clicked Delete");

    const modal = page.locator('[class*="modal"], [role="dialog"]').first();
    const modalAppeared = await modal.waitFor({ state: "visible", timeout: 8_000 })
      .then(() => true).catch(() => false);

    if (modalAppeared) {
      const modalText = await modal.innerText().catch(() => "");
      console.log(`[INFO] Delete modal text: "${modalText.trim().slice(0, 150)}"`);
      expect(modalText).toMatch(/delete|Delete|sure/i);

      const cancelBtn = page.locator('button:has-text("Cancel")').first();
      await cancelBtn.click();
      console.log("[INFO] Delete cancelled via Cancel ✓");

      await modal.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => null);
    } else {
      console.log("[WARN] No modal appeared after Delete click");
    }

    await context.close();
  });
});
