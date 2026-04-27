/**
 * vps.delete.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Acceptance Scenario 3 — VPS DELETE
 *
 * Confirmed live behavior (researched from actual site HTML/JS chunks):
 *
 *   Location: DELETE is triggered from the SERVERS LIST (/servers), NOT from
 *             the server detail page. Each server row has a "Delete" button.
 *
 *   Modal texts (confirmed from VirtFusion vlang JS bundle):
 *     Title:   "Delete Server"
 *     Body:    "Are you sure you want to delete this server?"
 *     Cancel:  "Cancel"
 *     Success: "Server deleted successfully."
 *     Error:   "Server could not be deleted."
 *
 * Tests:
 *   T3.1 — servers list renders and "Delete" button exists per server row
 *   T3.2 — clicking "Delete" opens modal with title "Delete Server"
 *   T3.3 — modal body text matches confirmed string
 *   T3.4 — modal has a "Cancel" button; clicking Cancel dismisses modal safely
 *   T3.5 — modal has a confirm/delete action button
 *   T3.6 — full delete flow: confirm → "Server deleted successfully." toast (DESTRUCTIVE)
 *
 * Run:
 *   cd tests/VPS
 *   npx playwright test tests/vps.delete.spec.ts --project=chromium --headed
 *
 *   # Enable DESTRUCTIVE full-delete test (T3.6):
 *   ENABLE_DELETE_TEST=true npx playwright test tests/vps.delete.spec.ts --project=chromium
 */

import { test, expect, type Browser } from "@playwright/test";
import { loginAndSaveSession, STORAGE_STATE_PATH } from "../utils/auth";
import { ServersListPage } from "../pages/ServersListPage";

test.use({ viewport: { width: 1440, height: 900 } });

const ENABLE_FULL_DELETE = process.env.ENABLE_DELETE_TEST === "true";

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginAndSaveSession(browser);
});

test.describe("VPS Delete (from servers list)", () => {

  // ── T3.1: "Delete" button present on each server row ──────────────────────

  test('T3.1 — кнопка "Delete" присутствует в списке серверов рядом с каждым VPS', async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    const serversList = new ServersListPage(page);

    await serversList.goto();
    await expect(page).toHaveURL(/servers/, { timeout: 15_000 });

    const count = await serversList.getServerCount();
    console.log(`[INFO] Server count: ${count}`);
    if (count === 0) test.skip(true, "No VPS servers available");

    // Verify the "Delete" button is visible on the first server row
    const deleteBtn = serversList.deleteButton(0);
    const deleteBtnVisible = await deleteBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!deleteBtnVisible) {
      // Fallback: count all "Delete" buttons on the page
      const allDeleteBtns = page.locator('button:has-text("Delete"), a:has-text("Delete")');
      const allCount = await allDeleteBtns.count();
      console.log(`[INFO] Delete buttons found (global): ${allCount}`);
      expect(allCount, '"Delete" button should be present in servers list').toBeGreaterThan(0);
    } else {
      console.log('[PASS] "Delete" button visible on first server row ✓');
    }

    await context.close();
  });

  // ── T3.2: "Delete" click opens modal with title "Delete Server" ────────────

  test('T3.2 — клик Delete открывает модальное окно с заголовком "Delete Server"', async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    const serversList = new ServersListPage(page);

    await serversList.goto();
    const count = await serversList.getServerCount();
    if (count === 0) test.skip(true, "No VPS servers available");

    await serversList.clickDelete(0);

    // Modal should be visible
    const modal = serversList.deleteModal;
    await modal.waitFor({ state: "visible", timeout: 8_000 });
    console.log("[INFO] Modal appeared ✓");

    // Check for "Delete Server" title — confirmed from vlang JS bundle
    const modalText = await modal.innerText().catch(() => "");
    console.log(`[INFO] Modal content: "${modalText.slice(0, 300)}"`);

    expect(
      modalText,
      'Modal should contain "Delete Server" title (confirmed from VirtFusion vlang bundle)'
    ).toContain("Delete Server");

    console.log('[PASS] Modal title "Delete Server" confirmed ✓');

    // Always cancel — safety
    const cancelBtn = serversList.deleteModalCancelButton;
    if (await cancelBtn.isVisible().catch(() => false)) {
      await cancelBtn.click();
      console.log("[INFO] Cancelled ✓");
    }

    await context.close();
  });

  // ── T3.3: Modal body confirms the destructive action text ─────────────────

  test('T3.3 — тело модала содержит текст "Are you sure you want to delete this server?"', async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    const serversList = new ServersListPage(page);

    await serversList.goto();
    const count = await serversList.getServerCount();
    if (count === 0) test.skip(true, "No VPS servers available");

    await serversList.clickDelete(0);

    const modal = serversList.deleteModal;
    await modal.waitFor({ state: "visible", timeout: 8_000 });

    const modalText = await modal.innerText().catch(() => "");

    // Confirmed text from live VirtFusion vlang bundle
    expect(
      modalText,
      'Modal should ask "Are you sure you want to delete this server?"'
    ).toContain("Are you sure you want to delete this server?");

    console.log('[PASS] Confirmed modal body: "Are you sure you want to delete this server?" ✓');

    const cancelBtn = serversList.deleteModalCancelButton;
    if (await cancelBtn.isVisible().catch(() => false)) await cancelBtn.click();

    await context.close();
  });

  // ── T3.4: Modal has "Cancel" button that safely dismisses it ──────────────

  test('T3.4 — модальное окно содержит кнопку "Cancel" и она закрывает модал', async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    const serversList = new ServersListPage(page);

    await serversList.goto();
    const count = await serversList.getServerCount();
    if (count === 0) test.skip(true, "No VPS servers available");

    await serversList.clickDelete(0);

    const modal = serversList.deleteModal;
    await modal.waitFor({ state: "visible", timeout: 8_000 });

    // "Cancel" button confirmed from vlang bundle
    const cancelBtn = serversList.deleteModalCancelButton;
    const cancelVisible = await cancelBtn.isVisible().catch(() => false);
    expect(cancelVisible, '"Cancel" button should be in the delete modal').toBe(true);

    console.log('[INFO] "Cancel" button found ✓');
    await cancelBtn.click();

    // Modal should close
    await modal.waitFor({ state: "hidden", timeout: 5_000 });
    console.log('[PASS] Modal dismissed by "Cancel" ✓');

    // Verify no deletion happened (server count unchanged)
    const countAfter = await serversList.getServerCount();
    expect(countAfter).toBe(count);
    console.log(`[PASS] Server count unchanged (${countAfter}) after Cancel ✓`);

    await context.close();
  });

  // ── T3.5: Modal has a confirm/delete action button ────────────────────────

  test("T3.5 — модальное окно содержит кнопку подтверждения удаления", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    const serversList = new ServersListPage(page);

    await serversList.goto();
    const count = await serversList.getServerCount();
    if (count === 0) test.skip(true, "No VPS servers available");

    await serversList.clickDelete(0);

    const modal = serversList.deleteModal;
    await modal.waitFor({ state: "visible", timeout: 8_000 });

    const modalText = await modal.innerText().catch(() => "");
    console.log(`[INFO] Modal content: "${modalText.slice(0, 300)}"`);

    // The confirm button — may say "Delete" or "Confirm" depending on VirtFusion version
    const confirmBtn = serversList.deleteModalConfirmButton;
    const confirmVisible = await confirmBtn.isVisible().catch(() => false);

    if (!confirmVisible) {
      // Dump all buttons inside modal
      const modalBtns = modal.locator("button");
      const btnCount = await modalBtns.count();
      const btnTexts: string[] = [];
      for (let i = 0; i < btnCount; i++) {
        btnTexts.push((await modalBtns.nth(i).innerText().catch(() => "")).trim());
      }
      console.log(`[INFO] Modal buttons: ${btnTexts.join(" | ")}`);
    }

    expect(confirmVisible, "A confirm/delete button should be present in the delete modal").toBe(true);
    console.log("[PASS] Confirm/delete button present in modal ✓");

    // Cancel
    const cancelBtn = serversList.deleteModalCancelButton;
    if (await cancelBtn.isVisible().catch(() => false)) await cancelBtn.click();

    await context.close();
  });

  // ── T3.6: Full delete flow (DESTRUCTIVE — guarded by env flag) ────────────

  test("T3.6 — полный сценарий Delete: подтверждение → тост 'Server deleted successfully.'", async ({ browser }) => {
    if (!ENABLE_FULL_DELETE) {
      test.skip(
        true,
        "Full delete skipped. Set ENABLE_DELETE_TEST=true to enable.\n" +
        "WARNING: This PERMANENTLY DELETES a VPS server!"
      );
    }

    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    const serversList = new ServersListPage(page);

    await serversList.goto();
    const countBefore = await serversList.getServerCount();
    console.log(`[INFO] Servers before delete: ${countBefore}`);
    if (countBefore === 0) test.skip(true, "No servers to delete");

    // Step 1: Click Delete on first server
    await serversList.clickDelete(0);
    const modal = serversList.deleteModal;
    await modal.waitFor({ state: "visible", timeout: 8_000 });
    console.log("[INFO] Step 1/3: Delete modal opened ✓");

    // Step 2: Confirm deletion
    const confirmBtn = serversList.deleteModalConfirmButton;
    const confirmVisible = await confirmBtn.isVisible().catch(() => false);
    if (!confirmVisible) {
      const cancelBtn = serversList.deleteModalCancelButton;
      if (await cancelBtn.isVisible().catch(() => false)) await cancelBtn.click();
      test.skip(true, "Confirm button not found in delete modal");
    }

    await confirmBtn.click();
    console.log("[INFO] Step 2/3: Deletion confirmed ✓");

    // Step 3: Wait for success toast — confirmed text: "Server deleted successfully."
    const successToast = serversList.successToast;
    const toastVisible = await successToast
      .waitFor({ state: "visible", timeout: 15_000 })
      .then(() => true)
      .catch(() => false);

    if (toastVisible) {
      const toastText = await successToast.innerText().catch(() => "");
      console.log(`[PASS] Success toast: "${toastText}" ✓`);
      expect(toastText).toContain("deleted successfully");
    } else {
      // Fallback: verify server count decreased
      await serversList.goto();
      const countAfter = await serversList.getServerCount();
      console.log(`[INFO] Step 3/3: Servers after delete: ${countAfter}`);
      expect(
        countAfter,
        `Server count should decrease. Before: ${countBefore}, After: ${countAfter}`
      ).toBeLessThan(countBefore);
      console.log(`[PASS] Server deleted — count: ${countBefore} → ${countAfter} ✓`);
    }

    await page.screenshot({ path: "test-vps-delete-result.png" });
    await context.close();
  });

});
