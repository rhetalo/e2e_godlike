/**
 * vps.panel.network.spec.ts
 * ──────────────────────────
 * Тесты вкладки Network на странице управления сервером VirtFusion.
 * URL: https://vf-panel.godlike.host/server/{UUID}
 *
 * Покрытие:
 *   1. Вкладка Network открывается и становится активной
 *   2. IP-адрес(а) сервера видны
 *   3. "Primary IPv4:" / "Primary Network:" labels видны
 *   4. "Reverse DNS" секция — жёсткий expect если присутствует, test.skip если план не поддерживает
 *   5. "Network Traffic" секция — аналогично
 *
 * vlang-строки подтверждены на живом сервере (май 2026):
 *   vlang[83]  = "Reverse DNS"
 *   vlang[194] = "Network Traffic"
 *   vlang[201] = "Primary Network:"
 *   vlang[203] = "Primary IPv4:"
 *
 * Запуск:
 *   npx playwright test tests/vps/panel/vps.panel.network.spec.ts --project=chromium --headed
 */
import { test, expect, type Browser, type BrowserContext } from "@playwright/test";
import { VpsPanelServerPage } from "../../../pages/VpsPanelServerPage";
import { VpsPanelNetworkPage } from "../../../pages/VpsPanelNetworkPage";
import {
  loginAndSaveSession,
  STORAGE_STATE_PATH,
  TEST_SERVER_UUID,
} from "../../../utils/auth";

test.use({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});

test.describe.configure({ mode: "serial" });

let sharedContext: BrowserContext;
let serverPage: VpsPanelServerPage;
let networkPage: VpsPanelNetworkPage;

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginAndSaveSession(browser);
  sharedContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await sharedContext.newPage();
  serverPage = new VpsPanelServerPage(page, TEST_SERVER_UUID);
  networkPage = new VpsPanelNetworkPage(page);
});

test.afterAll(async () => {
  await sharedContext.close();
});

async function openNetworkTab(): Promise<void> {
  await serverPage.goto();
  await expect(serverPage.tab("Network")).toBeVisible({ timeout: 15_000 });
  await serverPage.clickTab("Network");
  await networkPage.waitForNetworkTab();
}

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — Навигация
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Network Tab: навигация", () => {
  test("вкладка Network присутствует на странице сервера", async () => {
    await serverPage.goto();
    await expect(serverPage.tab("Network")).toBeVisible({ timeout: 15_000 });
  });

  test("клик по Network — вкладка становится активной", async () => {
    await openNetworkTab();
    await expect(serverPage.activeTab).toContainText("Network", { timeout: 5_000 });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — IP-адреса
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Network Tab: IP-адреса", () => {
  test("'Primary IPv4:' label (vlang[203]) видна на вкладке Network", async () => {
    await openNetworkTab();
    await expect(networkPage.primaryIpv4Label).toBeVisible({ timeout: 10_000 });
  });

  test("'Primary Network:' label (vlang[201]) видна на вкладке Network", async () => {
    await openNetworkTab();
    await expect(networkPage.primaryNetworkLabel).toBeVisible({ timeout: 10_000 });
  });

  test("IPv4-адрес сервера присутствует на странице", async () => {
    await openNetworkTab();
    const ips = await networkPage.getVisibleIpAddresses();
    expect(ips.length, "Ни одного IPv4 адреса не найдено на Network tab").toBeGreaterThanOrEqual(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — Reverse DNS (vlang[83])
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Network Tab: Reverse DNS", () => {
  test("'Reverse DNS' секция (vlang[83]) — видна если план поддерживает", async () => {
    await openNetworkTab();

    const page = sharedContext.pages()[0];
    const bodyText = await page.locator("body").innerText();
    const hasReverseDns = bodyText.includes("Reverse DNS");

    test.skip(!hasReverseDns, "Reverse DNS не включён на этом плане — пропускаем");

    await expect(networkPage.reverseDnsSection).toBeVisible({ timeout: 10_000 });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — Network Traffic (vlang[194])
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Network Tab: Network Traffic", () => {
  test("'Network Traffic' секция (vlang[194]) — видна если план поддерживает", async () => {
    await openNetworkTab();

    const page = sharedContext.pages()[0];
    const bodyText = await page.locator("body").innerText();
    const hasTraffic = bodyText.includes("Network Traffic");

    test.skip(!hasTraffic, "Network Traffic не включён на этом плане — пропускаем");

    await expect(networkPage.networkTrafficSection).toBeVisible({ timeout: 10_000 });
  });
});
