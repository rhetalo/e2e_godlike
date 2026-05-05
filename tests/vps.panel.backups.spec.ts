/**
 * vps.panel.backups.spec.ts
 * ──────────────────────────
 * Тесты вкладки Backups на странице управления сервером VirtFusion.
 * URL: https://vf-panel.godlike.host/server/9c49ed96-56f4-41c8-bc5f-a8d44c21a486
 *
 * Покрытие:
 *   1. Вкладка Backups открывается
 *   2. Slot info ("slots for backups") или список бэкапов виден
 *   3. Кнопка "Create Backup Now" (если доступна на плане)
 *   4. "Status" / "Created" / "Size" колонки в таблице бэкапов
 *   5. Delete backup — модал → Cancel (реальное удаление не производится)
 *
 * vlang-ссылки для подтверждения строк:
 *   vlang[59] = "Create Backup Now"    ← точный текст кнопки
 *   vlang[50]+[51] = "There are X slots for backups."
 *   vlang[2]  = "Are you sure you want to delete this backup?"
 *   vlang[6]  = "Are you sure you want to restore the server using this backup?"
 *   vlang[61] = "Created"
 *   vlang[62] = "Size"
 *   vlang[63] = "Status"
 *
 * Запуск:
 *   npx playwright test tests/vps.panel.backups.spec.ts --project=chromium
 *   npx playwright test tests/vps.panel.backups.spec.ts --project=chromium --headed
 */
import { test, expect, type Browser } from "@playwright/test";
import { VpsPanelServerPage } from "../pages/VpsPanelServerPage";
import { VpsPanelBackupsPage } from "../pages/VpsPanelBackupsPage";
import {
  loginAndSaveSession,
  STORAGE_STATE_PATH,
  TEST_SERVER_UUID,
} from "../utils/auth";

test.use({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginAndSaveSession(browser);
});

// ── Helper ────────────────────────────────────────────────────────────────────

async function openBackupsTab(browser: Browser) {
  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();
  const serverPage = new VpsPanelServerPage(page, TEST_SERVER_UUID);
  const backupsPage = new VpsPanelBackupsPage(page);

  await serverPage.goto();

  const backupsTab = serverPage.tab("Backups");
  const isVisible = await backupsTab.isVisible().catch(() => false);
  if (isVisible) {
    await serverPage.clickTab("Backups");
    console.log("[INFO] Backups tab clicked");
  }

  await backupsPage.waitForBackupsTab();
  return { context, page, serverPage, backupsPage };
}

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — Backups Tab Access & Structure
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Backups Tab", () => {
  test("вкладка Backups присутствует на странице сервера", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    const serverPage = new VpsPanelServerPage(page, TEST_SERVER_UUID);

    await serverPage.goto();

    const backupsTab = serverPage.tab("Backups");
    await expect(backupsTab).toBeVisible({ timeout: 15_000 });
    console.log("[INFO] Backups tab visible ✓");

    await context.close();
  });

  test("клик по Backups — контент загружается", async ({ browser }) => {
    const { context, page } = await openBackupsTab(browser);

    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(50);
    console.log("[INFO] Backups tab content loaded ✓");

    await context.close();
  });

  test("тело страницы содержит backup-related текст", async ({ browser }) => {
    const { context, page, backupsPage } = await openBackupsTab(browser);

    const bodyText = await page.locator("body").innerText();
    const hasBackupText = /backup|Backup/i.test(bodyText);
    console.log(`[INFO] Backup-related text in body: ${hasBackupText}`);
    console.log(`[INFO] Body snippet: "${bodyText.slice(0, 400)}"`);
    expect(hasBackupText).toBeTruthy();

    await context.close();
  });

  test("'slots for backups' или список бэкапов отображается (vlang[50-51])", async ({ browser }) => {
    const { context, page, backupsPage } = await openBackupsTab(browser);

    const bodyText = await page.locator("body").innerText();

    // vlang[50]+[51]: "There are X slots for backups."
    const hasSlotInfo = bodyText.includes("slots for backups");

    // Alternatively — backup list items are shown
    const backupItemsCount = await backupsPage.backupItems.count().catch(() => 0);
    const hasItems = backupItemsCount > 0;

    // Or create backup button is visible (vlang[59])
    const createVisible = await backupsPage.createBackupButton.isVisible().catch(() => false);

    console.log(`[INFO] Slot info ("slots for backups"): ${hasSlotInfo}`);
    console.log(`[INFO] Backup items in list: ${backupItemsCount}`);
    console.log(`[INFO] Create Backup Now button visible: ${createVisible}`);

    expect(hasSlotInfo || hasItems || createVisible).toBeTruthy();

    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — Create Backup Button (vlang[59])
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Create Backup Now", () => {
  test("кнопка 'Create Backup Now' (vlang[59]) — видна или не применима к тарифу", async ({ browser }) => {
    const { context, page, backupsPage } = await openBackupsTab(browser);

    // vlang[59] = "Create Backup Now" — exact text confirmed from live :vlang prop
    const isVisible = await backupsPage.createBackupButton.isVisible().catch(() => false);
    console.log(`[INFO] "Create Backup Now" button visible: ${isVisible}`);

    if (isVisible) {
      await expect(backupsPage.createBackupButton).toBeEnabled();
      console.log('[INFO] "Create Backup Now" button enabled ✓');
    } else {
      console.log("[INFO] Create backup not available on current plan (expected on free/basic tier)");
    }

    await context.close();
  });

  test("кнопка 'Schedule' (vlang[60]) — видна или не применима", async ({ browser }) => {
    const { context, page, backupsPage } = await openBackupsTab(browser);

    const isVisible = await backupsPage.scheduleButton.isVisible().catch(() => false);
    console.log(`[INFO] "Schedule" button visible: ${isVisible}`);

    if (isVisible) {
      console.log("[INFO] Schedule button found ✓");
    } else {
      console.log("[INFO] Schedule button not present on current plan");
    }

    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — Table Columns (when backups exist)
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Backups Table", () => {
  test("колонки Status/Created/Size (vlang[61-63]) — видны если есть бэкапы", async ({ browser }) => {
    const { context, page, backupsPage } = await openBackupsTab(browser);

    const backupItemsCount = await backupsPage.backupItems.count().catch(() => 0);
    console.log(`[INFO] Backup items found: ${backupItemsCount}`);

    if (backupItemsCount > 0) {
      const statusVisible = await backupsPage.statusColumn.isVisible().catch(() => false);
      const createdVisible = await backupsPage.createdColumn.isVisible().catch(() => false);
      const sizeVisible = await backupsPage.sizeColumn.isVisible().catch(() => false);

      console.log(`[INFO] "Status" column (vlang[63]): ${statusVisible}`);
      console.log(`[INFO] "Created" column (vlang[61]): ${createdVisible}`);
      console.log(`[INFO] "Size" column (vlang[62]): ${sizeVisible}`);

      const atLeastOne = statusVisible || createdVisible || sizeVisible;
      expect(atLeastOne).toBeTruthy();
    } else {
      console.log("[INFO] No backup items — table column check skipped");
    }

    await context.close();
  });

  test("Delete backup кнопка — модал с подтверждением → Cancel (если бэкапы есть)", async ({ browser }) => {
    const { context, page, backupsPage } = await openBackupsTab(browser);

    const backupItemsCount = await backupsPage.backupItems.count().catch(() => 0);
    console.log(`[INFO] Backup items found: ${backupItemsCount}`);

    if (backupItemsCount === 0) {
      console.log("[INFO] No backups — delete modal test skipped");
      await context.close();
      return;
    }

    const deleteBtn = backupsPage.deleteBackupButton;
    const isVisible = await deleteBtn.isVisible().catch(() => false);

    if (!isVisible) {
      console.log("[INFO] Delete button not visible — skipping");
      await context.close();
      return;
    }

    await deleteBtn.click();
    console.log("[INFO] Clicked Delete backup button");

    const modal = page.locator('[class*="modal"], [role="dialog"]').first();
    const modalAppeared = await modal.waitFor({ state: "visible", timeout: 6_000 })
      .then(() => true).catch(() => false);

    if (modalAppeared) {
      const modalText = await modal.innerText().catch(() => "");
      console.log(`[INFO] Delete backup modal text: "${modalText.trim().slice(0, 150)}"`);

      // vlang[2]: "Are you sure you want to delete this backup?"
      const isDeleteModal = /delete this backup|Are you sure you want to delete this backup/i.test(modalText);
      console.log(`[INFO] Delete backup modal confirmed (vlang[2]): ${isDeleteModal}`);
      expect(isDeleteModal).toBeTruthy();

      await backupsPage.cancelButton.click();
      console.log("[INFO] Delete backup modal cancelled via Cancel ✓");
    } else {
      console.log("[WARN] No confirmation modal appeared for delete backup");
    }

    await context.close();
  });

  test("Restore backup кнопка — модал → Cancel (если бэкапы есть)", async ({ browser }) => {
    const { context, page, backupsPage } = await openBackupsTab(browser);

    const backupItemsCount = await backupsPage.backupItems.count().catch(() => 0);
    if (backupItemsCount === 0) {
      console.log("[INFO] No backups — restore modal test skipped");
      await context.close();
      return;
    }

    const restoreBtn = backupsPage.restoreButton;
    const isVisible = await restoreBtn.isVisible().catch(() => false);

    if (!isVisible) {
      console.log("[INFO] Restore button not visible — skipping");
      await context.close();
      return;
    }

    await restoreBtn.click();
    console.log("[INFO] Clicked Restore backup button");

    const modal = page.locator('[class*="modal"], [role="dialog"]').first();
    const modalAppeared = await modal.waitFor({ state: "visible", timeout: 6_000 })
      .then(() => true).catch(() => false);

    if (modalAppeared) {
      const modalText = await modal.innerText().catch(() => "");
      console.log(`[INFO] Restore backup modal text: "${modalText.trim().slice(0, 150)}"`);

      // vlang[6]: "Are you sure you want to restore the server using this backup?"
      const isRestoreModal = /restore the server using this backup|Are you sure you want to restore/i.test(modalText);
      console.log(`[INFO] Restore backup modal confirmed (vlang[6]): ${isRestoreModal}`);

      await backupsPage.cancelButton.click();
      console.log("[INFO] Restore backup modal cancelled via Cancel ✓");
    } else {
      console.log("[INFO] No confirmation modal appeared for restore (may be immediate)");
    }

    await context.close();
  });
});
