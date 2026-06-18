/**
 * vps.panel.options.spec.ts
 * ──────────────────────────
 * Тесты вкладки Options VirtFusion VPS панели.
 * URL: https://vf-panel.godlike.host/server/{UUID}
 *
 * Структура Options (подтверждена из live HTML, май 2026):
 *   Options tab → 4 под-таба (Bootstrap pills): VNC (дефолт) / Rescue / Password / Settings.
 *   Reset Password — может быть disabled когда сервер Stopped.
 *   VNC toggle и Reset Password обратимы (toggle откатываем; Reset только до Cancel).
 *
 * Запуск:
 *   npx playwright test tests/vps/panel/vps.panel.options.spec.ts --project=vps-panel --headed
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

const SUB_TABS = ["VNC", "Rescue", "Password", "Settings"] as const;

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

async function gotoOptions(): Promise<void> {
  await serverPage.goto();
  await expect(serverPage.tab("Options")).toBeVisible({ timeout: 15_000 });
  await serverPage.clickTab("Options");
  await optionsPage.waitForOptionsTab();
}

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — Навигация: Options tab + под-табы
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS-панель — Options: навигация", () => {
  test("@regression TC-VPS-OPT-001 | Options открывается, 4 под-таба видны, VNC активен по умолчанию", async () => {
    await gotoOptions();

    await test.step("все 4 под-таба видны (VNC, Rescue, Password, Settings)", async () => {
      for (const name of SUB_TABS) {
        await expect(optionsPage.subTab(name)).toBeVisible({ timeout: 10_000 });
      }
    });

    await test.step("VNC — активный под-таб по умолчанию", async () => {
      await expect(optionsPage.subTab("VNC")).toHaveClass(/active/, { timeout: 5_000 });
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — VNC под-таб (vlang[168])
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS-панель — Options: VNC", () => {
  test("@critical TC-VPS-OPT-002 | VNC toggle: клик меняет состояние и задача появляется в activity table", async () => {
    await gotoOptions();

    await test.step("секция VNC и кнопка toggle присутствуют", async () => {
      await expect(optionsPage.vncSectionTitle).toBeVisible({ timeout: 10_000 });
      await expect(optionsPage.vncToggleButton).toBeVisible({ timeout: 10_000 });
    });

    const toggleBtn = optionsPage.vncToggleButton;
    const labelBefore = (await toggleBtn.innerText()).trim();
    // "Enable VNC Access" / "Disable VNC Access" → действие в activity: "Enable VNC" / "Disable VNC".
    const actionExpected = labelBefore.replace(/\s*Access$/i, "");

    await test.step(`клик toggle → текст меняется, задача "${actionExpected}" в activity`, async () => {
      await toggleBtn.click();
      await expect(toggleBtn).not.toHaveText(labelBefore, { timeout: 15_000 });
      await expect
        .poll(async () => optionsPage.latestActivityRow.innerText().catch(() => ""), {
          timeout: 15_000,
          message: `Activity table не показала задачу "${actionExpected}"`,
        })
        .toMatch(new RegExp(actionExpected, "i"));
    });

    await test.step("откат: повторный клик возвращает исходное состояние", async () => {
      await toggleBtn.click();
      await expect(toggleBtn).toHaveText(labelBefore, { timeout: 15_000 });
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — Password под-таб: Reset Password (vlang[102])
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS-панель — Options: Reset Password", () => {
  test("@regression TC-VPS-OPT-003 | Reset Password: модал с текстом про email открывается и закрывается по Cancel", async () => {
    await gotoOptions();
    await optionsPage.clickSubTab("Password");

    await expect(optionsPage.resetPasswordButton).toBeVisible({ timeout: 10_000 });
    const isEnabled = await optionsPage.resetPasswordButton.isEnabled().catch(() => false);
    test.skip(!isEnabled, "Reset Password недоступен — сервер остановлен или функция отключена");

    await test.step("клик → модал с предупреждением про email; кнопку Reset НЕ жмём", async () => {
      await optionsPage.resetPasswordButton.click();
      await expect(optionsPage.activeModal).toBeVisible({ timeout: 8_000 });
      await expect(optionsPage.activeModal).toContainText(
        /resetting the password|new password will sent|account email/i,
      );
      await expect(optionsPage.resetConfirmButton).toBeVisible({ timeout: 5_000 });
    });

    await test.step("Cancel закрывает модал, кнопка Reset Password снова доступна", async () => {
      await optionsPage.modalCancelButton.click();
      await expect(optionsPage.activeModal).not.toBeVisible({ timeout: 5_000 });
      await expect(optionsPage.resetPasswordButton).toBeEnabled({ timeout: 5_000 });
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — Settings под-таб: Boot Type (vlang[354–356])
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS-панель — Options: Settings / Boot Type", () => {
  test("@regression TC-VPS-OPT-004 | Settings: секция Boot Type и опции BIOS / UEFI присутствуют", async () => {
    await gotoOptions();
    await optionsPage.clickSubTab("Settings");

    await test.step("заголовок Boot Type виден", async () => {
      await expect(optionsPage.bootTypeLabel).toBeVisible({ timeout: 10_000 });
    });

    await test.step("опции BIOS (Legacy Mode) и UEFI присутствуют", async () => {
      await expect(optionsPage.biosOption).toBeVisible({ timeout: 8_000 });
      await expect(optionsPage.uefiOption).toBeVisible({ timeout: 8_000 });
    });
  });
});
