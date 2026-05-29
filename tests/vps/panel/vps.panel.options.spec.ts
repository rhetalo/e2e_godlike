/**
 * vps.panel.options.spec.ts
 * ──────────────────────────
 * Тесты вкладки Options VirtFusion VPS панели.
 * URL: https://vf-panel.godlike.host/server/{UUID}
 *
 * Структура Options (подтверждена из live HTML, май 2026):
 *   Options tab → 4 под-таба (Bootstrap pills):
 *     #pills-options-vnc-tab      → VNC (дефолтный при открытии Options)
 *     #pills-options-rescue-tab   → Rescue
 *     #pills-options-password-tab → Password (Reset Password button)
 *     #pills-options-settings-tab → Settings (Boot Type, BIOS/UEFI, Protect Server)
 *
 * Hostname/Save — в #editNameModal (gear-иконка в сайдбаре, Vue-click), не в Options.
 * Reset Password — может быть disabled когда сервер Stopped.
 * Protect Server — div.bubble[data-bs-target="#protectServerModal"] в сайдбаре.
 *
 * Запуск:
 *   npx playwright test tests/vps/panel/vps.panel.options.spec.ts --project=chromium --headed
 */
import { test, expect, type Browser, type BrowserContext } from "@playwright/test";
import { VpsPanelServerPage } from "../../../pages/VpsPanelServerPage";
import { VpsPanelOptionsPage } from "../../../pages/VpsPanelOptionsPage";
import {
  loginAndSaveSession,
  STORAGE_STATE_PATH,
  TEST_SERVER_UUID,
} from "../../../utils/auth";

test.use({ viewport: { width: 1440, height: 900 } });
test.describe.configure({ mode: "serial" });

let sharedContext: BrowserContext;
let serverPage: VpsPanelServerPage;
let optionsPage: VpsPanelOptionsPage;

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginAndSaveSession(browser);
  sharedContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await sharedContext.newPage();
  serverPage = new VpsPanelServerPage(page, TEST_SERVER_UUID);
  optionsPage = new VpsPanelOptionsPage(page);
});

test.afterAll(async () => {
  await sharedContext.close();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function gotoOptions(): Promise<void> {
  await serverPage.goto();
  await expect(serverPage.tab("Options")).toBeVisible({ timeout: 15_000 });
  await serverPage.clickTab("Options");
  await optionsPage.waitForOptionsTab();
}

async function gotoSubTab(name: "VNC" | "Rescue" | "Password" | "Settings"): Promise<void> {
  await optionsPage.clickSubTab(name);
}

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — Навигация: Options tab + под-табы
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Options: навигация", () => {
  test("вкладка Options присутствует и кликабельна", async () => {
    await serverPage.goto();
    await expect(serverPage.tab("Options")).toBeVisible({ timeout: 15_000 });
  });

  test("клик по Options — URL содержит UUID сервера", async () => {
    await gotoOptions();
    expect(serverPage.page.url()).toContain(TEST_SERVER_UUID);
  });

  test("все 4 под-таба видны: VNC, Rescue, Password, Settings", async () => {
    await gotoOptions();
    const page = serverPage.page;
    for (const id of ["#pills-options-vnc-tab", "#pills-options-rescue-tab",
                       "#pills-options-password-tab", "#pills-options-settings-tab"]) {
      await expect(page.locator(id)).toBeVisible({ timeout: 10_000 });
    }
  });

  test("VNC является активным под-табом по умолчанию", async () => {
    await gotoOptions();
    const vncTab = serverPage.page.locator("#pills-options-vnc-tab");
    await expect(vncTab).toHaveClass(/active/, { timeout: 5_000 });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — VNC под-таб
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Options: VNC (vlang[168])", () => {
  test.beforeEach(async () => { await gotoOptions(); });

  test("заголовок секции 'Virtual Network Computing (VNC)' виден", async () => {
    await expect(optionsPage.vncSectionTitle).toBeVisible({ timeout: 10_000 });
  });

  test("кнопка 'Enable VNC Access' или статус активной сессии присутствует", async () => {
    const page = serverPage.page;
    const enableBtn = page.locator('#pills-options-vnc button:has-text("Enable VNC Access")');
    const activeMsg = optionsPage.vncActiveMessage;

    const hasEnable = await enableBtn.isVisible().catch(() => false);
    const hasActive = await activeMsg.isVisible().catch(() => false);

    expect(hasEnable || hasActive, "Ни Enable VNC Access, ни сообщение об активной сессии не найдено").toBeTruthy();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — Password под-таб: Reset Password
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Options: Reset Password (vlang[102])", () => {
  test.beforeEach(async () => {
    await gotoOptions();
    await gotoSubTab("Password");
  });

  test("кнопка 'Reset Password' присутствует в Password под-табе", async () => {
    await expect(optionsPage.resetPasswordButton).toBeVisible({ timeout: 10_000 });
  });

  test("'Reset Password' → модал открывается → содержит текст о email → Cancel закрывает", async () => {
    const isEnabled = await optionsPage.resetPasswordButton.isEnabled().catch(() => false);
    test.skip(!isEnabled, "Reset Password недоступен — сервер остановлен или функция отключена");

    await optionsPage.resetPasswordButton.click();
    await expect(optionsPage.activeModal).toBeVisible({ timeout: 8_000 });

    const modalText = await optionsPage.activeModal.innerText();
    expect(modalText).toMatch(/resetting the password|new password will sent|account email/i);

    // Проверяем что кнопка Reset (confirm) есть, но НЕ нажимаем её
    await expect(optionsPage.resetConfirmButton).toBeVisible({ timeout: 5_000 });

    await optionsPage.modalCancelButton.click();
    await expect(optionsPage.activeModal).not.toBeVisible({ timeout: 5_000 });
  });

  test("после закрытия модала кнопка 'Reset Password' снова доступна", async () => {
    const isEnabled = await optionsPage.resetPasswordButton.isEnabled().catch(() => false);
    test.skip(!isEnabled, "Reset Password недоступен — сервер остановлен или функция отключена");

    await optionsPage.resetPasswordButton.click();
    await expect(optionsPage.activeModal).toBeVisible({ timeout: 8_000 });
    await optionsPage.modalCancelButton.click();
    await expect(optionsPage.activeModal).not.toBeVisible({ timeout: 5_000 });

    await expect(optionsPage.resetPasswordButton).toBeVisible({ timeout: 5_000 });
    await expect(optionsPage.resetPasswordButton).toBeEnabled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — Settings под-таб: Boot Type
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Options: Settings / Boot Type (vlang[354–356])", () => {
  test.beforeEach(async () => {
    await gotoOptions();
    await gotoSubTab("Settings");
  });

  test("секция 'Boot Type' (vlang[354]) видна в Settings", async () => {
    await expect(optionsPage.bootTypeLabel).toBeVisible({ timeout: 10_000 });
  });

  test("опции 'BIOS (Legacy Mode)' и 'UEFI' присутствуют в Settings", async () => {
    const settingsPane = serverPage.page.locator("#pills-options-settings");
    await expect(settingsPane.getByText("BIOS (Legacy Mode)", { exact: false }).first()).toBeVisible({ timeout: 8_000 });
    await expect(settingsPane.getByText("UEFI", { exact: false }).first()).toBeVisible({ timeout: 8_000 });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 5 — Protect Server (сайдбар, всегда в DOM)
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Options: Protect Server (vlang[106] / vlang[184])", () => {
  test.beforeEach(async () => { await gotoOptions(); });

  test("кнопка Protect или Unprotect присутствует (взаимоисключающие)", async () => {
    const protect = await optionsPage.protectServerButton.isVisible().catch(() => false);
    const unprotect = await optionsPage.unprotectButton.isVisible().catch(() => false);
    expect(protect || unprotect, "Ни Protect, ни Unprotect не найдены").toBeTruthy();
    // XOR: ровно одна должна быть видна
    expect(protect !== unprotect, "Обе кнопки видны одновременно — ошибка состояния").toBeTruthy();
  });

  test("клик Protect Server → модал с предупреждением → Cancel", async () => {
    const isProtected = await optionsPage.unprotectButton.isVisible().catch(() => false);
    test.skip(isProtected, "Сервер уже защищён — тест Protect модала неприменим");

    await optionsPage.protectServerButton.click();
    await expect(optionsPage.activeModal).toBeVisible({ timeout: 8_000 });

    const modalText = await optionsPage.activeModal.innerText();
    expect(modalText).toMatch(/protection prevents|rebuilt accidentally|protect this server/i);

    await optionsPage.modalCancelButton.click();
    await expect(optionsPage.activeModal).not.toBeVisible({ timeout: 5_000 });
  });
});
