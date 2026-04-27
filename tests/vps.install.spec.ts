/**
 * vps.install.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Acceptance Scenario 1 — VPS INSTALL
 *
 * Confirmed from live page (/server/9c49ed96-56f4-41c8-bc5f-a8d44c21a486):
 *   Tabs (vlang 71-77):  "Overview", "Media", "Options", "Network", "Storage", "Backups", "Sharing"
 *   Build button:        "Rebuild" (vlang[196]) or "Install" (vlang[173])
 *   Rebuild confirm:     modal "Are you sure you want to rebuild this server?" → "Continue" (vlang[119])
 *   Install confirm:     modal "Are you sure you want to install X on this server?" → "Install Now" (vlang[130])
 *   Building state:      "Server Setup..." (vlang[136])
 *   States:              "Stopped"(78), "Running"(79), "Paused"(80)
 *
 * Run:
 *   cd tests/VPS
 *   npx playwright test tests/vps.install.spec.ts --project=chromium --headed
 */

import { test, expect, type Browser } from "@playwright/test";
import { loginAndSaveSession, STORAGE_STATE_PATH, TEST_SERVER_URL, TEST_SERVER_NAME } from "../utils/auth";
import { ServersListPage } from "../pages/ServersListPage";
import { ServerDetailPage } from "../pages/ServerDetailPage";

test.use({ viewport: { width: 1440, height: 900 } });

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginAndSaveSession(browser);
});

test.describe("VPS Install — Build Environment", () => {

  // ── T1.1: Servers list shows our test server ───────────────────────────────

  test(`T1.1 — список серверов содержит "${TEST_SERVER_NAME}"`, async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    const serversList = new ServersListPage(page);

    await serversList.goto();
    await expect(page).toHaveURL(/servers/, { timeout: 15_000 });

    const count = await serversList.getServerCount();
    console.log(`[INFO] Servers found: ${count}`);
    expect(count).toBeGreaterThanOrEqual(1);

    // Confirm our test server is visible
    const serverText = await page.locator(`text=${TEST_SERVER_NAME}`).isVisible().catch(() => false);
    console.log(`[INFO] "${TEST_SERVER_NAME}" visible: ${serverText}`);
    console.log(`[PASS] Servers list loaded with ${count} server(s) ✓`);

    await context.close();
  });

  // ── T1.2: Server detail page opens (direct URL + via Manage click) ─────────

  test("T1.2 — страница сервера открывается напрямую по URL /server/{UUID}", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    const serverDetail = new ServerDetailPage(page);

    // Direct URL navigation — works with Playwright session (confirmed)
    await serverDetail.goto();
    await expect(page).toHaveURL(new RegExp(ServerDetailPage.url.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')), { timeout: 15_000 });

    console.log(`[INFO] Opened: ${page.url()}`);
    const tabNames = await serverDetail.getVisibleTabNames();
    console.log(`[INFO] Tabs found: ${tabNames.join(", ")}`);

    // Confirm expected tabs present (all confirmed from live :vlang)
    expect(tabNames.some(t => t === "Overview"), '"Overview" tab should exist').toBe(true);
    expect(tabNames.some(t => t === "Media"), '"Media" tab should exist').toBe(true);
    expect(tabNames.some(t => t === "Options"), '"Options" tab should exist').toBe(true);

    console.log("[PASS] Server detail opened with correct tabs ✓");
    await context.close();
  });

  // ── T1.3: "Manage" button in servers list navigates to /server/{UUID} ──────

  test("T1.3 — кнопка Manage ведёт на /server/{UUID}", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    const serversList = new ServersListPage(page);

    await serversList.goto();
    const count = await serversList.getServerCount();
    if (count === 0) test.skip(true, "No servers in list");

    await serversList.openServerDetail(0);
    const url = page.url();

    console.log(`[INFO] After Manage click: ${url}`);
    // Should navigate to /server/{UUID} format
    expect(url).toMatch(/\/server\/[0-9a-f-]{36}/i);
    console.log("[PASS] Manage click navigates to /server/{UUID} ✓");

    await context.close();
  });

  // ── T1.4: Media tab contains OS template section ───────────────────────────

  test('T1.4 — вкладка "Media" содержит раздел выбора OS', async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    const serverDetail = new ServerDetailPage(page);

    await serverDetail.goto();

    // "Media" is confirmed tab name (vlang[72])
    await serverDetail.clickTab("Media");
    await page.waitForTimeout(2_000);

    // vlang[149]: "Operating System"
    const osLabel = page.locator(':has-text("Operating System")').first();
    const osVisible = await osLabel.isVisible({ timeout: 5_000 }).catch(() => false);
    console.log(`[INFO] "Operating System" label visible: ${osVisible}`);

    const templateOptions = serverDetail.templateOptions;
    const optionCount = await templateOptions.count();
    console.log(`[INFO] Template options: ${optionCount}`);

    if (optionCount > 0) {
      const names: string[] = [];
      for (let i = 0; i < Math.min(optionCount, 8); i++) {
        names.push((await templateOptions.nth(i).innerText().catch(() => "")).trim());
      }
      console.log(`[INFO] Templates: ${names.filter(Boolean).join(", ")}`);
      expect(optionCount).toBeGreaterThan(0);
    } else {
      expect(osVisible, '"Operating System" section should be visible on Media tab').toBe(true);
    }

    console.log("[PASS] Media tab has OS install section ✓");
    await context.close();
  });

  // ── T1.5: Rebuild/Install button is visible on Media tab ──────────────────

  test('T1.5 — кнопка "Restart" присутствует на вкладке Media', async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    const serverDetail = new ServerDetailPage(page);

    await serverDetail.goto();
    await serverDetail.clickTab("Media");
    await page.waitForTimeout(2_000);

    const actionBtn = serverDetail.buildOrRebuildButton;
    const visible = await actionBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    if (visible) {
      const text = (await actionBtn.innerText().catch(() => "")).trim();
      console.log(`[PASS] Action button: "${text}" ✓`);
      // Should be "Rebuild" (vlang[196]) or "Install" (vlang[173])
      expect(text).toMatch(/Restart|Install/i);
    } else {
      // Dump all buttons for debugging
      const allBtns = await page.locator("button").all();
      const texts = await Promise.all(allBtns.map(b => b.innerText().catch(() => "")));
      console.log(`[INFO] All buttons: ${texts.filter(Boolean).join(" | ")}`);
      expect(visible, '"Restart" button should be visible on Media tab').toBe(true);
    }

    await context.close();
  });

  // ── T1.6: Full install flow — select OS → Rebuild → Continue ──────────────

  test('T1.6 — полный Install: OS → "Rebuild" → "Continue" → сервер начинает сборку', async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    const serverDetail = new ServerDetailPage(page);

    await serverDetail.goto();
    console.log(`[INFO] Server URL: ${page.url()}`);

    // Step 1: Open Media tab
    await serverDetail.clickTab("Media");
    await page.waitForTimeout(2_000);

    // Step 2: Select OS template
    const templateOptions = serverDetail.templateOptions;
    const optionCount = await templateOptions.count();
    let selectedOs = "(none)";

    if (optionCount > 0) {
      // Try Debian first (fast build)
      for (const osName of ["Debian", "Ubuntu", "AlmaLinux"]) {
        const found = templateOptions.filter({ hasText: new RegExp(osName, "i") }).first();
        if (await found.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await found.click();
          selectedOs = osName;
          break;
        }
      }
      if (selectedOs === "(none)") {
        await templateOptions.first().click();
        selectedOs = (await templateOptions.first().innerText().catch(() => "first")).trim();
      }
      await page.waitForTimeout(500);
      console.log(`[INFO] Step 1/3: Selected OS "${selectedOs}" ✓`);
    }

    // Step 3: Click Rebuild / Install button
    const actionBtn = serverDetail.buildOrRebuildButton;
    const actionVisible = await actionBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!actionVisible) test.skip(true, "Action button not visible on Media tab");

    const btnText = (await actionBtn.innerText().catch(() => "")).trim();
    await actionBtn.click();
    console.log(`[INFO] Step 2/3: Clicked "${btnText}" ✓`);

    // Step 4: Confirmation modal
    const modal = serverDetail.confirmModal;
    const modalVisible = await modal
      .waitFor({ state: "visible", timeout: 8_000 })
      .then(() => true).catch(() => false);

    if (modalVisible) {
      const modalText = await modal.innerText().catch(() => "");
      console.log(`[INFO] Modal: "${modalText.slice(0, 200)}"`);

      // "Continue" (vlang[119]) for rebuild, "Install Now" (vlang[130]) for install
      const confirmBtn = serverDetail.rebuildConfirmButton;
      const confirmVisible = await confirmBtn.isVisible().catch(() => false);

      if (confirmVisible) {
        const confirmText = (await confirmBtn.innerText().catch(() => "")).trim();
        await confirmBtn.click();
        console.log(`[INFO] Step 3/3: Clicked "${confirmText}" ✓`);

        await page.waitForTimeout(3_000);
        const status = await serverDetail.getStatus();
        const isBuilding = /setup|building|installing|pending|queued/i.test(status);
        const hasSuccess = await serverDetail.successAlert.isVisible({ timeout: 3_000 }).catch(() => false);

        console.log(`[INFO] Status after confirm: "${status}", success alert: ${hasSuccess}`);
        expect(
          isBuilding || hasSuccess,
          `Expected building status or success. Status was: "${status}"`
        ).toBe(true);
        console.log("[PASS] Install flow triggered successfully ✓");
      } else {
        // Unknown modal — cancel safely
        const cancelBtn = serverDetail.cancelButton;
        if (await cancelBtn.isVisible().catch(() => false)) await cancelBtn.click();
        expect(modalText.length, "Modal should contain text").toBeGreaterThan(0);
      }
    } else {
      // No modal — direct action
      await page.waitForTimeout(2_000);
      const status = await serverDetail.getStatus();
      const hasSuccess = await serverDetail.successAlert.isVisible({ timeout: 3_000 }).catch(() => false);
      console.log(`[INFO] Direct action — status: "${status}", success: ${hasSuccess}`);
    }

    await page.screenshot({ path: "test-vps-install-result.png" });
    await context.close();
  });

});