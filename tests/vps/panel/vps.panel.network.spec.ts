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
  // Navigate once; remaining tests run on the open Network tab
  await serverPage.goto();
  await serverPage.clickTab("Network");
  await networkPage.waitForNetworkTab();
});

test.afterAll(async () => {
  await sharedContext.close();
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — Навигация
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Network Tab: навигация", () => {
  test("вкладка Network присутствует на странице сервера", async () => {
    await expect(serverPage.tab("Network")).toBeVisible({ timeout: 10_000 });
  });

  test("клик по Network — вкладка становится активной", async () => {
    // activeTab uses [role="tab"][aria-selected="true"] which targets pill-tab
    // buttons only — skips the top navbar <a class="main nav-link active">
    await expect(serverPage.activeTab).toContainText("Network", { timeout: 5_000 });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — Карточка Primary Network
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Network Tab: Primary Network", () => {
  test("заголовок 'Primary Network' (h2) виден в таб-панели", async () => {
    await expect(networkPage.primaryNetworkHeading).toBeVisible({ timeout: 10_000 });
  });

  test("IPv4-адрес сервера присутствует на странице", async () => {
    const ips = await networkPage.getVisibleIpAddresses();
    expect(ips.length, "Ни одного IPv4 адреса не найдено на Network tab").toBeGreaterThanOrEqual(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — Statistics (трафик-чарты)
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Network Tab: Statistics", () => {
  test("кнопка Statistics видна в карточке Primary Network", async () => {
    await expect(networkPage.statisticsButton).toBeVisible({ timeout: 10_000 });
  });

  test("клик по Statistics — Plotly-чарт #traffic-chart-monthly рендерится", async () => {
    await networkPage.statisticsButton.click();

    await test.step("chart container получает class js-plotly-plot", async () => {
      // Plotly adds class="js-plotly-plot" after rendering the chart
      await expect(networkPage.trafficChartMonthly).toHaveClass(/js-plotly-plot/, {
        timeout: 15_000,
      });
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — Reverse DNS модал
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Network Tab: Reverse DNS", () => {
  test("кнопка Reverse DNS видна в таб-панели", async () => {
    await expect(networkPage.reverseDnsButton).toBeVisible({ timeout: 10_000 });
  });

  test("клик Reverse DNS → модал открывается → Cancel закрывает", async () => {
    await networkPage.reverseDnsButton.click();

    await test.step("модал #rdnsModal виден", async () => {
      await expect(networkPage.rdnsModal).toBeVisible({ timeout: 10_000 });
    });

    await test.step("заголовок содержит 'Reverse DNS'", async () => {
      await expect(networkPage.rdnsModalTitle).toContainText("Reverse DNS", { timeout: 5_000 });
    });

    await test.step("поле ввода rdns присутствует", async () => {
      await expect(networkPage.rdnsModalInput).toBeVisible({ timeout: 5_000 });
    });

    await test.step("Cancel закрывает модал", async () => {
      await networkPage.rdnsModalCancel.click();
      await expect(networkPage.rdnsModal).not.toBeVisible({ timeout: 5_000 });
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 5 — DNS Resolver (multiselect)
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Network Tab: DNS Resolvers", () => {
  test("Cloudflare DNS resolver отображён в multiselect", async () => {
    await expect(networkPage.primaryDnsResolverLabel).toBeVisible({ timeout: 10_000 });
  });
});
