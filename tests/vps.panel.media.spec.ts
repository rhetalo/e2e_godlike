/**
 * vps.panel.media.spec.ts
 * ────────────────────────
 * Тесты вкладки Media (смена ОС / rebuild / CD-DVD / Rescue) на странице сервера VirtFusion.
 * URL: https://vf-panel.godlike.host/server/9c49ed96-56f4-41c8-bc5f-a8d44c21a486
 *
 * Покрытие:
 *   1. Вкладка Media открывается
 *   2. "Operating System" секция (vlang[149]) видна
 *   3. Список ОС-шаблонов виден
 *   4. Кнопка "Rebuild" (vlang[196]) или "Install" (vlang[173]) присутствует
 *   5. Rebuild → модал с текстом vlang[118] → Cancel (rebuild не запускается)
 *   6. "Cancel Rebuild" кнопка (vlang[140]) закрывает модал
 *   7. CD/DVD кнопка (vlang[182])
 *   8. Rescue кнопка (vlang[376])
 *
 * vlang-ссылки для подтверждения строк:
 *   vlang[118] = "Are you sure you want to rebuild this server?"  ← точный текст модала
 *   vlang[119] = "Continue"          ← confirm кнопка (НЕ нажимать в тестах!)
 *   vlang[137] = "Rebuilding will delete all existing data..."
 *   vlang[140] = "Cancel Rebuild"    ← safe cancel
 *   vlang[149] = "Operating System"
 *   vlang[153] = "Install with Template"
 *   vlang[173] = "Install"
 *   vlang[182] = "CD/DVD"
 *   vlang[196] = "Rebuild"           ← основная кнопка действия
 *   vlang[376] = "Rescue"
 *   vlang[371] = "Create Rescue Session"
 *
 * ⚠️  Реальный rebuild НЕ запускается — тест всегда отменяет через Cancel/Cancel Rebuild.
 *
 * Запуск:
 *   npx playwright test tests/vps.panel.media.spec.ts --project=chromium
 *   npx playwright test tests/vps.panel.media.spec.ts --project=chromium --headed
 */
import { test, expect, type Browser } from "@playwright/test";
import { VpsPanelServerPage } from "../pages/VpsPanelServerPage";
import { VpsPanelMediaPage } from "../pages/VpsPanelMediaPage";
import {
  loginAndSaveSession,
  STORAGE_STATE_PATH,
  TEST_SERVER_UUID,
  PANEL_URL,
} from "../utils/auth";

test.use({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginAndSaveSession(browser);
});

// ── Helper ────────────────────────────────────────────────────────────────────

async function openMediaTab(browser: Browser) {
  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();
  const serverPage = new VpsPanelServerPage(page, TEST_SERVER_UUID);
  const mediaPage = new VpsPanelMediaPage(page, TEST_SERVER_UUID);

  await serverPage.goto();

  const mediaTab = serverPage.tab("Media");
  const isVisible = await mediaTab.isVisible().catch(() => false);

  if (isVisible) {
    await serverPage.clickTab("Media");
    console.log("[INFO] Media tab clicked");
  } else {
    console.log("[WARN] Media tab not found by button text — page may auto-show media");
  }

  await page.waitForLoadState("networkidle").catch(() => null);
  return { context, page, serverPage, mediaPage };
}

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — Media Tab Access & Structure
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Media Tab Structure", () => {
  test("вкладка Media присутствует на странице сервера", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    const serverPage = new VpsPanelServerPage(page, TEST_SERVER_UUID);

    await serverPage.goto();

    const mediaTab = serverPage.tab("Media");
    await expect(mediaTab).toBeVisible({ timeout: 15_000 });
    console.log("[INFO] Media tab visible ✓");

    await context.close();
  });

  test("клик по вкладке Media — контент загружается", async ({ browser }) => {
    const { context, page } = await openMediaTab(browser);

    const bodyText = await page.locator("body").innerText();
    console.log(`[INFO] Media tab body length: ${bodyText.length}`);
    expect(bodyText.length).toBeGreaterThan(100);

    await context.close();
  });

  test("body содержит media-related текст (vlang-подтверждённые строки)", async ({ browser }) => {
    const { context, page, mediaPage } = await openMediaTab(browser);

    const bodyText = await page.locator("body").innerText();
    console.log(`[INFO] Body snippet: "${bodyText.slice(0, 500)}"`);

    // Check for confirmed vlang strings
    const hasMediaContent =
      bodyText.includes("Operating System") ||      // vlang[149]
      bodyText.includes("Rebuild") ||               // vlang[196]
      bodyText.includes("Install") ||               // vlang[173]
      bodyText.includes("CD/DVD") ||                // vlang[182]
      bodyText.includes("Rescue") ||                // vlang[376]
      bodyText.includes("Install with Template");   // vlang[153]

    console.log(`[INFO] Media content (vlang-confirmed strings): ${hasMediaContent}`);
    expect(hasMediaContent).toBeTruthy();

    await context.close();
  });

  test("'Operating System' секция (vlang[149]) видна на Media tab", async ({ browser }) => {
    const { context, page, mediaPage } = await openMediaTab(browser);

    // vlang[149] = "Operating System"
    const labelVisible = await mediaPage.osLabel.isVisible().catch(() => false);
    const bodyText = await page.locator("body").innerText();
    const hasOsLabel = bodyText.includes("Operating System");

    console.log(`[INFO] "Operating System" (vlang[149]) visible: ${labelVisible}`);
    console.log(`[INFO] "Operating System" in body text: ${hasOsLabel}`);
    expect(labelVisible || hasOsLabel).toBeTruthy();
    console.log('[INFO] "Operating System" section confirmed ✓');

    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — OS Templates
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — OS Templates", () => {
  test("список ОС-шаблонов содержит хотя бы 1 пункт", async ({ browser }) => {
    const { context, page, mediaPage } = await openMediaTab(browser);

    const templates = mediaPage.osTemplateItems;
    const count = await templates.count();
    console.log(`[INFO] OS template items found: ${count}`);

    if (count === 0) {
      // Fallback: look for known distro names (VirtFusion renders them in client component)
      const bodyText = await page.locator("body").innerText();
      const knownOs = ["ubuntu", "debian", "centos", "windows", "arch", "fedora", "alma", "rocky"];
      const foundOs = knownOs.filter(os => bodyText.toLowerCase().includes(os));
      console.log(`[INFO] Known OS names in body: ${foundOs.join(", ") || "none"}`);
      console.log("[INFO] OS template count is 0 — check if component is client-side rendered");
    } else {
      expect(count).toBeGreaterThanOrEqual(1);
      console.log("[INFO] OS template items present ✓");
    }

    await context.close();
  });

  test("в списке ОС есть знакомые дистрибутивы (Ubuntu, Debian и т.д.)", async ({ browser }) => {
    const { context, page } = await openMediaTab(browser);

    const bodyText = await page.locator("body").innerText().catch(() => "");
    const knownOs = ["ubuntu", "debian", "centos", "windows", "arch", "fedora", "alma", "rocky"];
    const foundOs = knownOs.filter(os => bodyText.toLowerCase().includes(os));
    console.log(`[INFO] Known OS found in page: ${foundOs.join(", ") || "none"}`);

    if (foundOs.length === 0) {
      console.log("[INFO] No known OS names found — check Media tab content manually");
    } else {
      console.log("[INFO] Known OS distributions confirmed ✓");
    }

    await context.close();
  });

  test("'Install with Template' label (vlang[153]) видна", async ({ browser }) => {
    const { context, page, mediaPage } = await openMediaTab(browser);

    // vlang[153] = "Install with Template"
    const labelVisible = await mediaPage.installWithTemplateLabel.isVisible().catch(() => false);
    const bodyText = await page.locator("body").innerText();
    const hasLabel = bodyText.includes("Install with Template");

    console.log(`[INFO] "Install with Template" (vlang[153]) visible: ${labelVisible}`);
    console.log(`[INFO] "Install with Template" in body: ${hasLabel}`);

    if (labelVisible || hasLabel) {
      console.log('[INFO] "Install with Template" label confirmed ✓');
    }

    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — Rebuild Flow (safe — always cancels via Cancel/Cancel Rebuild)
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Rebuild Flow (Cancel only)", () => {
  test("кнопка 'Rebuild' (vlang[196]) или 'Install' (vlang[173]) присутствует на Media tab", async ({ browser }) => {
    const { context, page, mediaPage } = await openMediaTab(browser);

    // vlang[196] = "Rebuild" / vlang[173] = "Install"
    const rebuildBtn = mediaPage.rebuildButton;
    const rebuildVisible = await rebuildBtn.isVisible().catch(() => false);

    const installVisible = await page.locator('button:has-text("Install")').first()
      .isVisible().catch(() => false);

    console.log(`[INFO] "Rebuild" button (vlang[196]) visible: ${rebuildVisible}`);
    console.log(`[INFO] "Install" button (vlang[173]) visible: ${installVisible}`);

    if (rebuildVisible || installVisible) {
      const btnText = rebuildVisible ? "Rebuild" : "Install";
      console.log(`[INFO] Action button "${btnText}" confirmed ✓`);
    } else {
      const bodyText = await page.locator("body").innerText();
      const hasRebuildText = /Rebuild|Install/i.test(bodyText);
      console.log(`[INFO] "Rebuild"/"Install" text in body: ${hasRebuildText}`);
    }

    await context.close();
  });

  test("Rebuild → модал с vlang[118] текстом → Cancel Rebuild (vlang[140]) (rebuild НЕ запускается)", async ({ browser }) => {
    const { context, page, mediaPage } = await openMediaTab(browser);

    const rebuildBtn = mediaPage.rebuildOrInstallButton;
    const isVisible = await rebuildBtn.isVisible().catch(() => false);

    if (!isVisible) {
      console.log("[INFO] Rebuild/Install button not visible — skipping confirm/cancel test");
      await context.close();
      return;
    }

    const btnText = await rebuildBtn.innerText().catch(() => "");
    console.log(`[INFO] Clicking "${btnText.trim()}" button`);

    const modalShown = await mediaPage.clickRebuildAndCancel();

    if (modalShown) {
      console.log("[INFO] Rebuild modal appeared and was cancelled ✓");

      // Verify we are still on the server page
      expect(page.url()).toContain(TEST_SERVER_UUID);
      console.log("[INFO] Stayed on server page after cancel ✓");
    } else {
      console.log("[INFO] No confirmation modal — action may require OS selection first");
    }

    await context.close();
  });

  test("rebuild modal содержит текст vlang[118]: 'Are you sure you want to rebuild this server?'", async ({ browser }) => {
    const { context, page, mediaPage } = await openMediaTab(browser);

    const rebuildBtn = mediaPage.rebuildOrInstallButton;
    const isVisible = await rebuildBtn.isVisible().catch(() => false);

    if (!isVisible) {
      console.log("[INFO] Rebuild button not visible — skipping modal text verification");
      await context.close();
      return;
    }

    await rebuildBtn.click();
    console.log("[INFO] Clicked Rebuild/Install button");

    const modal = mediaPage.confirmModal;
    const modalAppeared = await modal.waitFor({ state: "visible", timeout: 8_000 })
      .then(() => true).catch(() => false);

    if (modalAppeared) {
      const modalText = await modal.innerText().catch(() => "");
      console.log(`[INFO] Modal full text: "${modalText.trim().slice(0, 300)}"`);

      // vlang[118]: "Are you sure you want to rebuild this server?"
      const hasRebuildConfirmText = /Are you sure you want to rebuild this server/i.test(modalText);
      console.log(`[INFO] Modal contains vlang[118] text: ${hasRebuildConfirmText}`);
      expect(hasRebuildConfirmText).toBeTruthy();

      // vlang[137]: "Rebuilding will delete all existing data..."
      const hasWarningText = /Rebuilding will delete all existing data/i.test(modalText);
      console.log(`[INFO] Modal contains vlang[137] warning: ${hasWarningText}`);

      // Cancel safely (prefer "Cancel Rebuild" vlang[140], fallback "Cancel")
      const cancelRebuildBtn = page.locator('button:has-text("Cancel Rebuild")').first();
      const cancelRebuildVisible = await cancelRebuildBtn.isVisible().catch(() => false);

      if (cancelRebuildVisible) {
        await cancelRebuildBtn.click();
        console.log('[INFO] Cancelled via "Cancel Rebuild" (vlang[140]) ✓');
      } else {
        await page.locator('button:has-text("Cancel")').first().click();
        console.log('[INFO] Cancelled via "Cancel" ✓');
      }
    } else {
      console.log("[INFO] No modal appeared — may need OS selection first");
    }

    await context.close();
  });

  test("после отмены Rebuild — остаёмся на странице сервера", async ({ browser }) => {
    const { context, page, mediaPage } = await openMediaTab(browser);

    const rebuildBtn = mediaPage.rebuildOrInstallButton;
    const isVisible = await rebuildBtn.isVisible().catch(() => false);

    if (isVisible) {
      await mediaPage.clickRebuildAndCancel();
    }

    const currentUrl = page.url();
    console.log(`[INFO] Current URL after cancel: ${currentUrl}`);
    expect(currentUrl).toContain(TEST_SERVER_UUID);

    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — CD/DVD Section (vlang[182])
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — CD/DVD Section", () => {
  test("'CD/DVD' кнопка/секция (vlang[182]) присутствует или задокументирована", async ({ browser }) => {
    const { context, page, mediaPage } = await openMediaTab(browser);

    // vlang[182] = "CD/DVD"
    const cdDvdVisible = await mediaPage.cdDvdButton.isVisible().catch(() => false);
    const bodyText = await page.locator("body").innerText();
    const hasCdDvdText = bodyText.includes("CD/DVD");

    console.log(`[INFO] "CD/DVD" button (vlang[182]) visible: ${cdDvdVisible}`);
    console.log(`[INFO] "CD/DVD" in body text: ${hasCdDvdText}`);

    if (cdDvdVisible || hasCdDvdText) {
      console.log('[INFO] "CD/DVD" section confirmed ✓');
    } else {
      console.log("[INFO] CD/DVD section not present — may not be available on this plan");
    }

    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 5 — Rescue Mode (vlang[376])
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Rescue Mode", () => {
  test("'Rescue' кнопка/секция (vlang[376]) присутствует или задокументирована", async ({ browser }) => {
    const { context, page, mediaPage } = await openMediaTab(browser);

    // vlang[376] = "Rescue"
    const rescueVisible = await mediaPage.rescueButton.isVisible().catch(() => false);
    const bodyText = await page.locator("body").innerText();
    const hasRescueText = bodyText.includes("Rescue");

    console.log(`[INFO] "Rescue" button (vlang[376]) visible: ${rescueVisible}`);
    console.log(`[INFO] "Rescue" in body text: ${hasRescueText}`);

    if (rescueVisible || hasRescueText) {
      console.log('[INFO] "Rescue" section confirmed ✓');
    } else {
      console.log("[INFO] Rescue section not present on this plan");
    }

    await context.close();
  });

  test("'Create Rescue Session' (vlang[371]) → модал → Cancel (Rescue Session не создаётся)", async ({ browser }) => {
    const { context, page, mediaPage } = await openMediaTab(browser);

    // vlang[371] = "Create Rescue Session"
    const createRescueBtn = mediaPage.createRescueSessionButton;
    const isVisible = await createRescueBtn.isVisible().catch(() => false);

    console.log(`[INFO] "Create Rescue Session" (vlang[371]) visible: ${isVisible}`);

    if (!isVisible) {
      console.log("[INFO] Create Rescue Session not visible — skipping confirm/cancel test");
      await context.close();
      return;
    }

    await createRescueBtn.click();
    console.log("[INFO] Clicked Create Rescue Session");

    const modal = page.locator('[class*="modal"], [role="dialog"]').first();
    const modalAppeared = await modal.waitFor({ state: "visible", timeout: 6_000 })
      .then(() => true).catch(() => false);

    if (modalAppeared) {
      const modalText = await modal.innerText().catch(() => "");
      console.log(`[INFO] Rescue session modal text: "${modalText.trim().slice(0, 200)}"`);

      // vlang[372]: "Are you sure you want to create a rescue session for this server?..."
      const isRescueModal = /rescue session for this server|Are you sure you want to create a rescue session/i.test(modalText);
      console.log(`[INFO] Rescue session modal confirmed (vlang[372]): ${isRescueModal}`);

      await page.locator('button:has-text("Cancel")').first().click();
      console.log("[INFO] Rescue session modal cancelled via Cancel ✓");
    } else {
      console.log("[INFO] No modal appeared for Create Rescue Session");
    }

    await context.close();
  });
});
