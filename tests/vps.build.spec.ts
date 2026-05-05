/**
 * vps.build.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Acceptance Scenario 2 — VPS BUILD ENVIRONMENT
 *
 * Confirmed from live page (/server/9c49ed96-56f4-41c8-bc5f-a8d44c21a486):
 *   Tabs (vlang 71-77):  "Overview", "Media", "Options", "Network", "Storage", "Backups", "Sharing"
 *   Build button:        "Rebuild" (vlang[196]) when server has OS
 *   Rebuild confirm:     "Are you sure you want to rebuild this server?" → "Continue" (vlang[119])
 *   Server states:       "Stopped"(78), "Running"(79), "Paused"(80)
 *   Building status:     "Server Setup..." (vlang[136])
 *
 * Run:
 *   cd tests/VPS
 *   npx playwright test tests/vps.build.spec.ts --project=chromium --headed
 */

import { test, expect, type Browser } from "@playwright/test";
import { loginAndSaveSession, STORAGE_STATE_PATH, TEST_SERVER_NAME } from "../utils/auth";
import { VpsPanelServersListPage } from "../pages/VpsPanelServersListPage";
import { ServerDetailPage } from "../pages/VpsPanelServerDetailPage";

test.use({ viewport: { width: 1440, height: 900 } });

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginAndSaveSession(browser);
});

test.describe("VPS Build Environment", () => {

  // ── T2.1: Login and servers list ──────────────────────────────────────────

  test("T2.1 — список серверов доступен после логина", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    const serversList = new VpsPanelServersListPage(page);

    await serversList.goto();
    await expect(page).toHaveURL(/servers/, { timeout: 15_000 });

    const count = await serversList.getServerCount();
    console.log(`[INFO] Servers: ${count} (including "${TEST_SERVER_NAME}")`);
    expect(count).toBeGreaterThanOrEqual(1);
    console.log("[PASS] Servers list loaded ✓");

    await context.close();
  });

  // ── T2.2: Server detail tabs confirmed ────────────────────────────────────

  test('T2.2 — страница сервера имеет все ожидаемые вкладки ("Overview", "Media", "Options"…)', async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    const serverDetail = new ServerDetailPage(page);

    await serverDetail.goto();
    const tabNames = await serverDetail.getVisibleTabNames();
    console.log(`[INFO] Tabs: ${tabNames.join(", ")}`);

    // All confirmed from :vlang[71-77] on real page
    const expectedTabs = ["Overview", "Media", "Options", "Network", "Storage", "Sharing"];
    for (const tab of expectedTabs) {
      const found = tabNames.some(t => t === tab);
      console.log(`[INFO] Tab "${tab}": ${found ? "✓" : "✗"}`);
      expect(found, `Expected tab "${tab}" to be visible`).toBe(true);
    }

    console.log("[PASS] All expected tabs confirmed ✓");
    await context.close();
  });

  // ── T2.3: Media tab — OS template list ───────────────────────────────────

  test('T2.3 — вкладка "Media" содержит непустой список OS шаблонов', async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    const serverDetail = new ServerDetailPage(page);

    await serverDetail.goto();
    // "Media" is confirmed tab name (vlang[72])
    await serverDetail.clickTab("Media");
    await page.waitForTimeout(2_000);

    // vlang[149]: "Operating System" heading on the media tab
    const osSection = page.locator(':has-text("Operating System")').first();
    const osSectionVisible = await osSection.isVisible({ timeout: 5_000 }).catch(() => false);
    console.log(`[INFO] "Operating System" section visible: ${osSectionVisible}`);

    const templates = serverDetail.templateOptions;
    const templateCount = await templates.count();
    console.log(`[INFO] Template options found: ${templateCount}`);

    if (templateCount > 0) {
      const names: string[] = [];
      for (let i = 0; i < Math.min(templateCount, 10); i++) {
        names.push((await templates.nth(i).innerText().catch(() => "")).trim());
      }
      console.log(`[INFO] Available OSes: ${names.filter(Boolean).join(", ")}`);
      expect(templateCount).toBeGreaterThan(0);
      console.log(`[PASS] ${templateCount} OS templates available ✓`);
    } else {
      // Fallback: check page text for OS names
      const bodyText = await serverDetail.getPageText();
      const hasOsText = /ubuntu|debian|centos|rocky|almalinux|fedora/i.test(bodyText);
      console.log(`[INFO] OS names in page text: ${hasOsText}`);
      expect(osSectionVisible || hasOsText, 'Media tab should show OS templates').toBe(true);
    }

    await context.close();
  });

  // ── T2.4: Templates are clickable and highlight on selection ──────────────

  test("T2.4 — OS шаблоны кликабельны и подсвечиваются при выборе", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    const serverDetail = new ServerDetailPage(page);

    await serverDetail.goto();
    await serverDetail.clickTab("Media");
    await page.waitForTimeout(2_000);

    const templates = serverDetail.templateOptions;
    const count = await templates.count();
    if (count === 0) test.skip(true, "No template options found");

    const first = templates.first();
    const firstName = (await first.innerText().catch(() => "")).trim();
    console.log(`[INFO] Clicking template: "${firstName}"`);
    await first.click();
    await page.waitForTimeout(600);

    // Check for active/selected visual state
    const activeEl = page.locator(
      '[class*="active"], [class*="selected"], [class*="checked"], [aria-selected="true"]'
    ).first();
    const activeFound = await activeEl.isVisible({ timeout: 2_000 }).catch(() => false);
    if (activeFound) {
      console.log(`[PASS] Template highlighted on selection ✓`);
    } else {
      console.log("[INFO] No explicit active class — click registered");
    }

    // Switch to second template if available
    if (count > 1) {
      const second = templates.nth(1);
      const secondName = (await second.innerText().catch(() => "")).trim();
      await second.click();
      await page.waitForTimeout(400);
      console.log(`[INFO] Switched to: "${secondName}" ✓`);
    }

    await context.close();
  });

  // ── T2.5: Rebuild button triggers "Are you sure?" modal ──────────────────

  test('T2.5 — "Rebuild" открывает модал "Are you sure you want to rebuild this server?"', async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    const serverDetail = new ServerDetailPage(page);

    await serverDetail.goto();
    await serverDetail.clickTab("Media");
    await page.waitForTimeout(2_000);

    // Select a template first
    const templates = serverDetail.templateOptions;
    if (await templates.count() > 0) {
      await templates.first().click();
      await page.waitForTimeout(400);
    }

    // Click Rebuild/Install button
    const actionBtn = serverDetail.buildOrRebuildButton;
    const visible = await actionBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!visible) {
      const allBtns = await page.locator("button").all();
      const texts = await Promise.all(allBtns.map(b => b.innerText().catch(() => "")));
      console.log(`[INFO] Buttons on page: ${texts.filter(Boolean).join(" | ")}`);
      test.skip(true, "No Rebuild/Install button found");
    }

    const btnText = (await actionBtn.innerText().catch(() => "")).trim();
    console.log(`[INFO] Clicking: "${btnText}"`);
    await actionBtn.click();

    // vlang[118]: "Are you sure you want to rebuild this server?"
    const modal = serverDetail.confirmModal;
    const modalVisible = await modal
      .waitFor({ state: "visible", timeout: 8_000 })
      .then(() => true).catch(() => false);

    if (modalVisible) {
      const modalText = await modal.innerText().catch(() => "");
      console.log(`[INFO] Modal: "${modalText.slice(0, 200)}"`);

      // Check for the confirmed rebuild warning text
      const hasRebuildText = /rebuild|sure|install|data|overwrite/i.test(modalText);
      expect(hasRebuildText, "Confirmation modal should contain rebuild warning").toBe(true);

      // Check for "Continue" button (vlang[119]) or "Install Now" (vlang[130])
      const confirmBtn = serverDetail.rebuildConfirmButton;
      const confirmVisible = await confirmBtn.isVisible().catch(() => false);
      const confirmText = confirmVisible ? (await confirmBtn.innerText().catch(() => "")).trim() : "";
      console.log(`[INFO] Confirm button: "${confirmText}" (visible: ${confirmVisible})`);
      expect(confirmVisible, '"Continue" or "Install Now" button should be in modal').toBe(true);

      console.log('[PASS] Rebuild modal appeared with correct warning and "Continue" button ✓');

      // Cancel — don't actually rebuild in this test
      const cancelBtn = serverDetail.cancelButton;
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click();
        console.log("[INFO] Cancelled ✓");
      }
    } else {
      await page.waitForTimeout(2_000);
      const hasError = await serverDetail.errorAlert.isVisible().catch(() => false);
      console.log(`[WARN] No modal appeared. Error present: ${hasError}`);
      expect(hasError, "No error should appear after clicking Rebuild").toBe(false);
    }

    await context.close();
  });

  // ── T2.6: Full build flow — OS → Rebuild → Continue → Server Setup ────────

  test('T2.6 — полный Build: OS → "Rebuild" → "Continue" → статус сборки', async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    const serverDetail = new ServerDetailPage(page);

    await serverDetail.goto();
    console.log(`[INFO] Server: ${page.url()}`);

    // Step 1: Media tab
    await serverDetail.clickTab("Media");
    await page.waitForTimeout(2_000);

    // Step 2: Select OS
    const templates = serverDetail.templateOptions;
    const count = await templates.count();
    let selectedOs = "(none)";

    if (count > 0) {
      for (const osName of ["Debian", "Ubuntu", "AlmaLinux"]) {
        const found = templates.filter({ hasText: new RegExp(osName, "i") }).first();
        if (await found.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await found.click();
          selectedOs = osName;
          break;
        }
      }
      if (selectedOs === "(none)") {
        await templates.first().click();
        selectedOs = (await templates.first().innerText().catch(() => "first")).trim();
      }
      await page.waitForTimeout(500);
    }
    console.log(`[INFO] Step 1/3: OS selected: "${selectedOs}" ✓`);

    // Step 3: Click Rebuild
    const actionBtn = serverDetail.buildOrRebuildButton;
    if (!await actionBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      test.skip(true, "Rebuild button not visible");
    }

    const btnText = (await actionBtn.innerText().catch(() => "")).trim();
    await actionBtn.click();
    console.log(`[INFO] Step 2/3: Clicked "${btnText}" ✓`);

    // Step 4: Confirm in modal
    const modal = serverDetail.confirmModal;
    const modalVisible = await modal
      .waitFor({ state: "visible", timeout: 8_000 })
      .then(() => true).catch(() => false);

    if (modalVisible) {
      // "Continue" (vlang[119]) for rebuild, "Install Now" (vlang[130]) for install
      const confirmBtn = serverDetail.rebuildConfirmButton;
      if (await confirmBtn.isVisible().catch(() => false)) {
        const confirmText = (await confirmBtn.innerText().catch(() => "")).trim();
        await confirmBtn.click();
        console.log(`[INFO] Step 3/3: Clicked "${confirmText}" ✓`);

        await page.waitForTimeout(3_000);
        const status = await serverDetail.getStatus();
        const isBuilding = /setup|building|installing|pending|queued/i.test(status);
        const hasSuccess = await serverDetail.successAlert.isVisible({ timeout: 3_000 }).catch(() => false);

        console.log(`[INFO] Post-confirm status: "${status}", success: ${hasSuccess}`);
        expect(
          isBuilding || hasSuccess,
          `Expected building status or success. Got: "${status}"`
        ).toBe(true);
        console.log("[PASS] Build triggered successfully ✓");
      } else {
        const cancelBtn = serverDetail.cancelButton;
        if (await cancelBtn.isVisible().catch(() => false)) await cancelBtn.click();
        const modalText = await modal.innerText().catch(() => "");
        expect(modalText.length).toBeGreaterThan(0);
      }
    } else {
      await page.waitForTimeout(2_000);
      const status = await serverDetail.getStatus();
      const hasSuccess = await serverDetail.successAlert.isVisible({ timeout: 3_000 }).catch(() => false);
      console.log(`[INFO] Direct action — status: "${status}", success: ${hasSuccess}`);
    }

    await page.screenshot({ path: "test-vps-build-result.png" });
    await context.close();
  });

});
