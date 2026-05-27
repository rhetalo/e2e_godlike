/**
 * vps.panel.media.spec.ts
 * ────────────────────────
 * E2E тесты вкладки Media на странице сервера VirtFusion.
 * URL: https://vf-panel.godlike.host/server/{UUID}
 *
 * Покрытые сценарии:
 *   Happy path: переключение Boot Order HDD → CD/DVD → Apply → Complete в таблице
 *   Teardown:   возврат к исходному устройству → Apply → Complete в таблице
 *
 * ── ВАЖНЫЕ ЗАМЕЧАНИЯ ────────────────────────────────────────────────────────
 *
 * ⚠️  Radio tile click: .radio-tile (div) НЕЛЬЗЯ кликать — radio input
 *     перехватывает события указателя. Используй radio.check() напрямую.
 *
 * ── ПОДТВЕРЖДЁННЫЕ СЕЛЕКТОРЫ (DevTools, May 2026) ──────────────────────────
 *
 *   HDD radio:    input.radio-button[type="radio"][value="1"] — check() для выбора
 *   CD/DVD radio: input.radio-button[type="radio"][value="2"] — check() для выбора
 *   Apply button: button#server-boot-order-button
 *   Activity:     table.table.table-normal (debug tr исключаются через :has())
 *   Complete:     span.badge.badge-active
 *
 * Запуск:
 *   npx playwright test tests/vps.panel.media.spec.ts --project=chromium
 *   npx playwright test tests/vps.panel.media.spec.ts --project=chromium --headed
 */
import { test, expect, type Browser, type BrowserContext } from "@playwright/test";
import { VpsPanelServerPage } from "../pages/VpsPanelServerPage";
import { VpsPanelMediaPage } from "../pages/VpsPanelMediaPage";
import { loginAndSaveSession, STORAGE_STATE_PATH, TEST_SERVER_UUID } from "../utils/auth";

// ── Config ────────────────────────────────────────────────────────────────────

test.use({ viewport: { width: 1440, height: 900 } });
test.describe.configure({ mode: "serial" });

// ── Shared state ──────────────────────────────────────────────────────────────

let sharedContext: BrowserContext;
let serverPage: VpsPanelServerPage;
let mediaPage: VpsPanelMediaPage;
let initialDevice: "HDD" | "CD/DVD" | "unknown";

// ── Setup ─────────────────────────────────────────────────────────────────────

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginAndSaveSession(browser);
  sharedContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await sharedContext.newPage();

  serverPage = new VpsPanelServerPage(page, TEST_SERVER_UUID);
  mediaPage = new VpsPanelMediaPage(page, TEST_SERVER_UUID);

  await serverPage.goto();
  await serverPage.clickTab("Media");

  initialDevice = await mediaPage.getSelectedBootDevice();
  console.log(`[SETUP] Initial boot device: "${initialDevice}"`);
});

test.afterAll(async () => {
  await sharedContext.close();
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — Boot Order: переключение устройства загрузки
// ══════════════════════════════════════════════════════════════════════════════

test.describe("VPS Media — Boot Order", () => {

  test("@smoke 1.1 вкладка Media открыта, Boot Order секция видна, устройство определено", async () => {
    await test.step("Проверяем URL сервера", () => {
      expect(serverPage.page.url()).toContain(TEST_SERVER_UUID);
    });

    await test.step("Заголовок Boot Order виден", async () => {
      await expect(mediaPage.bootOrderHeading).toBeVisible({ timeout: 10_000 });
    });

    await test.step("HDD и CD/DVD radio присутствуют", async () => {
      await expect(mediaPage.hddRadio).toBeAttached({ timeout: 5_000 });
      await expect(mediaPage.cdDvdRadio).toBeAttached({ timeout: 5_000 });
    });

    await test.step("Apply кнопка видна", async () => {
      await expect(mediaPage.applyButton).toBeVisible({ timeout: 5_000 });
    });

    await test.step("Текущее устройство определено", () => {
      console.log(`[T1.1] Boot device: "${initialDevice}"`);
      expect(["HDD", "CD/DVD"]).toContain(initialDevice);
    });
  });

  test("@critical 1.2 переключение на противоположное устройство → Apply → Complete в таблице", async () => {
    const targetDevice = initialDevice === "HDD" ? "CD/DVD" : "HDD";
    const rowsBefore = await mediaPage.getActivityRowCount();
    console.log(`[T1.2] Switching: ${initialDevice} → ${targetDevice} | rows before: ${rowsBefore}`);

    await test.step(`Выбираем ${targetDevice}`, async () => {
      if (targetDevice === "CD/DVD") {
        await mediaPage.cdDvdRadio.check();
        await expect(mediaPage.cdDvdRadio).toBeChecked({ timeout: 5_000 });
      } else {
        await mediaPage.hddRadio.check();
        await expect(mediaPage.hddRadio).toBeChecked({ timeout: 5_000 });
      }
      console.log(`[T1.2] ${targetDevice} radio checked ✓`);
    });

    await test.step("Нажимаем Apply", async () => {
      await expect(mediaPage.applyButton).toBeEnabled({ timeout: 5_000 });
      await mediaPage.applyButton.click();
      console.log("[T1.2] Apply clicked");
    });

    await test.step("Ждём новую строку в activity table", async () => {
      await mediaPage.waitForNewRow(rowsBefore, 30_000);
      const rowsAfter = await mediaPage.getActivityRowCount();
      console.log(`[T1.2] Rows after Apply: ${rowsAfter}`);
      expect(rowsAfter).toBeGreaterThan(rowsBefore);
    });

    await test.step("Задача 'Boot Order' завершилась со статусом Complete", async () => {
      await mediaPage.waitForLatestTaskComplete(90_000);
      const taskName = await mediaPage.getLatestTaskName();
      console.log(`[T1.2] Latest task: "${taskName}" — Complete ✓`);
      expect(taskName).toMatch(/boot order/i);
    });
  });

  test("@critical 1.3 возврат на исходное устройство → Apply → Complete в таблице", async () => {
    const rowsBefore = await mediaPage.getActivityRowCount();
    console.log(`[T1.3] Returning to ${initialDevice} | rows before: ${rowsBefore}`);

    await test.step(`Выбираем исходное устройство (${initialDevice})`, async () => {
      if (initialDevice === "HDD") {
        await mediaPage.hddRadio.check();
        await expect(mediaPage.hddRadio).toBeChecked({ timeout: 5_000 });
      } else if (initialDevice === "CD/DVD") {
        await mediaPage.cdDvdRadio.check();
        await expect(mediaPage.cdDvdRadio).toBeChecked({ timeout: 5_000 });
      } else {
        test.skip();
      }
      console.log(`[T1.3] ${initialDevice} radio checked ✓`);
    });

    await test.step("Нажимаем Apply", async () => {
      await expect(mediaPage.applyButton).toBeEnabled({ timeout: 5_000 });
      await mediaPage.applyButton.click();
      console.log("[T1.3] Apply clicked");
    });

    await test.step("Ждём новую строку в activity table", async () => {
      await mediaPage.waitForNewRow(rowsBefore, 30_000);
      const rowsAfter = await mediaPage.getActivityRowCount();
      console.log(`[T1.3] Rows after Apply: ${rowsAfter}`);
      expect(rowsAfter).toBeGreaterThan(rowsBefore);
    });

    await test.step("Задача 'Boot Order' завершилась со статусом Complete", async () => {
      await mediaPage.waitForLatestTaskComplete(90_000);
      const taskName = await mediaPage.getLatestTaskName();
      console.log(`[T1.3] Latest task: "${taskName}" — Complete ✓`);
      expect(taskName).toMatch(/boot order/i);
      console.log(`[T1.3] Boot device restored to "${initialDevice}" ✓`);
    });
  });

});
