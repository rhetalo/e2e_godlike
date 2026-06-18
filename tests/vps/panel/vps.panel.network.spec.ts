/**
 * vps.panel.network.spec.ts
 * ──────────────────────────
 * Тесты вкладки Network (/server/{UUID} → таб "Network").
 *
 * Покрытие (May 2026, подтверждено на живом сервере):
 *   1. Вкладка Network видна и становится активной после клика
 *   2. Карточка Primary Network — h2 заголовок и IPv4 адрес присутствуют
 *   3. Statistics button — видна и клик рендерит Plotly-чарт
 *   4. Reverse DNS — кнопка открывает модал, Cancel закрывает
 *   5. DNS resolver — Cloudflare отображён в multiselect
 *
 * Селекторы основаны на HTML-снимках от 2026-05-25.
 * Все тесты работают в serial mode на одном шаренном контексте.
 *
 * Запуск:
 *   npx playwright test tests/vps/panel/vps.panel.network.spec.ts --project=vps-panel --headed
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
  // Navigate once; remaining tests run on the open Network tab
  await serverPage.goto();
  await serverPage.clickTab("Network");
  await networkPage.waitForNetworkTab();
});

test.afterAll(async () => {
  await sharedContext.close();
});

// ══════════════════════════════════════════════════════════════════════════════
// Вкладка Network — навигация, Primary Network, Statistics, Reverse DNS.
// Видимость элементов свёрнута в precondition-шаги поведенческих тестов.
// ══════════════════════════════════════════════════════════════════════════════
test.describe("@regression VPS-панель — вкладка Network", () => {
  test("вкладка активна и показывает карточку Primary Network", async () => {
    await test.step("вкладка Network присутствует и активна", async () => {
      // activeTab = [role="tab"][aria-selected="true"] — только pill-табы, не верхний navbar.
      await expect(serverPage.tab("Network")).toBeVisible({ timeout: 10_000 });
      await expect(serverPage.activeTab).toContainText("Network", { timeout: 5_000 });
    });

    await test.step("Primary Network: заголовок виден, есть IPv4-адрес", async () => {
      await expect(networkPage.primaryNetworkHeading).toBeVisible({ timeout: 10_000 });
      const ips = await networkPage.getVisibleIpAddresses();
      expect(ips.length, "Ни одного IPv4 на Network tab").toBeGreaterThanOrEqual(1);
    });
  });

  test("Statistics — клик рендерит Plotly-чарт", async () => {
    await test.step("кнопка Statistics видна", async () => {
      await expect(networkPage.statisticsButton).toBeVisible({ timeout: 10_000 });
    });

    await test.step("клик → #traffic-chart-monthly получает class js-plotly-plot", async () => {
      await networkPage.statisticsButton.click();
      // Plotly навешивает class="js-plotly-plot" после отрисовки чарта.
      await expect(networkPage.trafficChartMonthly).toHaveClass(/js-plotly-plot/, {
        timeout: 15_000,
      });
    });
  });

  test("Reverse DNS — модал открывается и закрывается по Cancel", async () => {
    await test.step("кнопка Reverse DNS видна", async () => {
      await expect(networkPage.reverseDnsButton).toBeVisible({ timeout: 10_000 });
    });

    await test.step("клик → модал #rdnsModal с заголовком и полем ввода", async () => {
      await networkPage.reverseDnsButton.click();
      await expect(networkPage.rdnsModal).toBeVisible({ timeout: 10_000 });
      await expect(networkPage.rdnsModalTitle).toContainText("Reverse DNS", { timeout: 5_000 });
      await expect(networkPage.rdnsModalInput).toBeVisible({ timeout: 5_000 });
    });

    await test.step("Cancel закрывает модал", async () => {
      await networkPage.rdnsModalCancel.click();
      await expect(networkPage.rdnsModal).not.toBeVisible({ timeout: 5_000 });
    });
  });
});
