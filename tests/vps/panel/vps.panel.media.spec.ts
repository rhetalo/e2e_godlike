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
 *   npx playwright test tests/vps/panel/vps.panel.media.spec.ts --project=vps-panel
 *   npx playwright test tests/vps/panel/vps.panel.media.spec.ts --project=vps-panel --headed
 */
import { test, expect, type Browser, type BrowserContext } from "@playwright/test";
import { VpsPanelServerPage } from "../../../pages/VpsPanelServerPage";
import { VpsPanelMediaPage } from "../../../pages/VpsPanelMediaPage";
import { loginAndSaveSession, STORAGE_STATE_PATH, TEST_SERVER_UUID } from "../../../utils/auth";

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
});

test.afterAll(async () => {
  await sharedContext.close();
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — Boot Order: переключение устройства загрузки
// ══════════════════════════════════════════════════════════════════════════════

test.describe("VPS-медиа — Boot Order", () => {

  test("@smoke TC-VPS-MED-001 | вкладка Media открыта, Boot Order секция видна, устройство определено", async () => {
    await test.step("Проверяем URL сервера", () => {
      expect(serverPage.page.url()).toContain(TEST_SERVER_UUID);
    });

    await test.step("Заголовок Boot Order виден", async () => {
      await expect(mediaPage.bootOrderHeading).toBeVisible({ timeout: 10_000 });
    });

    await test.step("Boot Order контрол реален: оба radio в DOM и ровно один выбран", async () => {
      // ⚠️ radio-инпуты НАМЕРЕННО скрыты кастомным tile-UI → toBeVisible тут неприменим
      // (упадёт легитимно). Фантом-защита: проверяем не просто наличие в DOM (toBeAttached
      // прошёл бы и на нерендерящемся контроле), а РАБОЧЕЕ состояние — ровно один radio checked.
      await expect(mediaPage.hddRadio).toBeAttached({ timeout: 5_000 });
      await expect(mediaPage.cdDvdRadio).toBeAttached({ timeout: 5_000 });
      const hddChecked = await mediaPage.hddRadio.isChecked();
      const cdChecked = await mediaPage.cdDvdRadio.isChecked();
      expect(hddChecked || cdChecked, "ровно один boot-device должен быть выбран").toBe(true);
      expect(hddChecked && cdChecked, "не оба сразу").toBe(false);
    });

    await test.step("Apply кнопка видна и активна (контрол интерактивен, не фантом)", async () => {
      await expect(mediaPage.applyButton).toBeVisible({ timeout: 5_000 });
      await expect(mediaPage.applyButton).toBeEnabled({ timeout: 5_000 });
    });

    await test.step("Текущее устройство определено", () => {
      expect(["HDD", "CD/DVD"]).toContain(initialDevice);
    });
  });

  test("@critical TC-VPS-MED-002 | переключение на противоположное устройство → Apply → Complete в таблице", async () => {
    // Читаем текущее состояние непосредственно перед действием — не полагаемся только на beforeAll
    const currentDevice = await mediaPage.getSelectedBootDevice();
    const targetDevice = currentDevice === "HDD" ? "CD/DVD" : "HDD";
    const rowsBefore = await mediaPage.getActivityRowCount();

    await test.step(`Выбираем ${targetDevice} (radio.check с force:true — input скрыт custom UI)`, async () => {
      if (targetDevice === "CD/DVD") {
        await mediaPage.selectCDDVD();
      } else {
        await mediaPage.selectHDD();
      }
    });

    await test.step("Нажимаем Apply", async () => {
      await expect(mediaPage.applyButton).toBeEnabled({ timeout: 5_000 });
      await mediaPage.applyButton.click();
    });

    await test.step("Ждём новую строку в activity table", async () => {
      await mediaPage.waitForNewRow(rowsBefore, 30_000);
      expect(await mediaPage.getActivityRowCount()).toBeGreaterThan(rowsBefore);
    });

    await test.step("Задача 'Boot Order' завершилась со статусом Complete", async () => {
      await mediaPage.waitForLatestTaskComplete(90_000);
      expect(await mediaPage.getLatestTaskName()).toMatch(/boot order/i);
    });
  });

  test("@critical TC-VPS-MED-003 | возврат на исходное устройство → Apply → Complete в таблице", async () => {
    // Читаем текущее состояние — после теста 1.2 оно должно быть противоположным initialDevice.
    const currentDevice = await mediaPage.getSelectedBootDevice();
    // Если уже на исходном (тест 1.2 не изменил состояние или пропущен) — восстанавливать нечего.
    test.skip(
      currentDevice === initialDevice,
      `Уже на исходном устройстве "${initialDevice}" — восстановление не требуется`,
    );

    const rowsBefore = await mediaPage.getActivityRowCount();

    await test.step(`Возвращаемся на ${initialDevice}`, async () => {
      if (initialDevice === "HDD") {
        await mediaPage.selectHDD();
      } else {
        await mediaPage.selectCDDVD();
      }
    });

    await test.step("Нажимаем Apply", async () => {
      await expect(mediaPage.applyButton).toBeEnabled({ timeout: 5_000 });
      await mediaPage.applyButton.click();
    });

    await test.step("Ждём новую строку в activity table", async () => {
      await mediaPage.waitForNewRow(rowsBefore, 30_000);
      expect(await mediaPage.getActivityRowCount()).toBeGreaterThan(rowsBefore);
    });

    await test.step("Задача 'Boot Order' завершилась со статусом Complete", async () => {
      await mediaPage.waitForLatestTaskComplete(90_000);
      expect(await mediaPage.getLatestTaskName()).toMatch(/boot order/i);
    });
  });

});
