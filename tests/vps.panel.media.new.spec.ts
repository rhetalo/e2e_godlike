/**
 * vps.panel.media.spec.ts
 * ────────────────────────
 * Тесты вкладки Media на странице сервера VirtFusion.
 * URL: https://vf-panel.godlike.host/server/9c49ed96-56f4-41c8-bc5f-a8d44c21a486
 *
 * ── ЧТО РЕАЛЬНО ЕСТЬ НА ВКЛАДКЕ MEDIA (подтверждено May 2026) ──────────────
 *   1. Кнопки управления питанием (те же Boot/Shutdown/PowerOff/Restart)
 *   2. Таблица активности — история действий с сервером (Poweroff, Boot, …)
 *   3. Секция Boot Order — переключение между HDD и CD/DVD (первичное устройство загрузки)
 *
 * ВАЖНО: OS templates / Rebuild / Rescue на этой вкладке НЕТ.
 *
 * ── ПОДТВЕРЖДЁННЫЕ СЕЛЕКТОРЫ ────────────────────────────────────────────────
 *   Boot Order heading:  h2.mb-4  text="Boot Order"
 *   HDD tile:            .radio-tile > .radio-tile-label:has-text("HDD")
 *   CD/DVD tile:         .radio-tile > .radio-tile-label:has-text("CD/DVD")
 *   HDD radio:           input.radio-button[type="radio"][value="1"]
 *   CD/DVD radio:        input.radio-button[type="radio"][value="2"]
 *   Apply button:        button#server-boot-order-button   ⚠️ НЕ нажимать в тестах
 *   Activity table:      table.table.table-normal
 *   Complete badge:      span.badge.badge-active
 *
 * Запуск:
 *   npx playwright test tests/vps.panel.media.spec.ts --project=chromium
 *   npx playwright test tests/vps.panel.media.spec.ts --project=chromium --headed
 */
import { test, expect, type Browser } from "@playwright/test";
import { VpsPanelServerPage } from "../pages/VpsPanelServerPage.new";
import { VpsPanelMediaPage } from "../pages/VpsPanelMediaPage.new";
import { loginAndSaveSession, STORAGE_STATE_PATH, TEST_SERVER_UUID } from "../utils/auth";

test.use({ viewport: { width: 1440, height: 900 } });

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
  await serverPage.clickTab("Media");

  return { context, page, serverPage, mediaPage };
}

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — Вкладка Media: доступ и базовая структура
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Media Tab: доступ", () => {
  test("вкладка Media присутствует на странице сервера", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    const serverPage = new VpsPanelServerPage(page, TEST_SERVER_UUID);

    await serverPage.goto();
    await expect(serverPage.tab("Media")).toBeVisible({ timeout: 15_000 });

    await context.close();
  });

  test("клик по вкладке Media — страница не ломается, URL остаётся на сервере", async ({
    browser,
  }) => {
    const { context, page } = await openMediaTab(browser);

    expect(page.url()).toContain(TEST_SERVER_UUID);

    await context.close();
  });

  test("страница сервера загружается (body > 200 символов)", async ({ browser }) => {
    const { context, page } = await openMediaTab(browser);

    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(200);

    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — Boot Order: структура секции
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Boot Order: структура", () => {
  test("заголовок 'Boot Order' (h2.mb-4) виден на вкладке Media", async ({ browser }) => {
    const { context, mediaPage } = await openMediaTab(browser);

    await expect(mediaPage.bootOrderHeading).toBeVisible({ timeout: 10_000 });

    await context.close();
  });

  test("плитка HDD (.radio-tile с текстом 'HDD') видна", async ({ browser }) => {
    const { context, mediaPage } = await openMediaTab(browser);

    await expect(mediaPage.hddTile).toBeVisible({ timeout: 10_000 });

    await context.close();
  });

  test("плитка CD/DVD (.radio-tile с текстом 'CD/DVD') видна", async ({ browser }) => {
    const { context, mediaPage } = await openMediaTab(browser);

    await expect(mediaPage.cdDvdTile).toBeVisible({ timeout: 10_000 });

    await context.close();
  });

  test("присутствуют ровно 2 radio-кнопки (HDD value=1 и CD/DVD value=2)", async ({
    browser,
  }) => {
    const { context, mediaPage } = await openMediaTab(browser);

    const radios = mediaPage.bootOrderRadios;
    await expect(radios).toHaveCount(2, { timeout: 10_000 });

    await context.close();
  });

  test("кнопка Apply (#server-boot-order-button) видна", async ({ browser }) => {
    const { context, mediaPage } = await openMediaTab(browser);

    await expect(mediaPage.applyButton).toBeVisible({ timeout: 10_000 });

    await context.close();
  });

  test("один из radio (HDD или CD/DVD) выбран по умолчанию", async ({ browser }) => {
    const { context, mediaPage } = await openMediaTab(browser);

    const selected = await mediaPage.getSelectedBootDevice();
    console.log(`[INFO] Current boot device: ${selected}`);

    expect(["HDD", "CD/DVD"]).toContain(selected);

    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — Boot Order: взаимодействие (без Apply)
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Boot Order: переключение (Apply не нажимаем)", () => {
  test("клик по плитке CD/DVD — radio[value=2] становится checked", async ({ browser }) => {
    const { context, mediaPage } = await openMediaTab(browser);

    await mediaPage.cdDvdTile.click();
    await expect(mediaPage.cdDvdRadio).toBeChecked({ timeout: 5_000 });
    console.log("[INFO] CD/DVD radio checked after tile click ✓");

    await context.close();
  });  

  test("клик по плитке HDD — radio[value=1] становится checked", async ({ browser }) => {
    const { context, mediaPage } = await openMediaTab(browser);

    await mediaPage.hddTile.click();
    await expect(mediaPage.hddRadio).toBeChecked({ timeout: 5_000 });
    console.log("[INFO] HDD radio checked after tile click ✓");

    await context.close();
  });

  test("после клика CD/DVD кнопка Apply видна и активна", async ({ browser }) => {
    const { context, mediaPage } = await openMediaTab(browser);

    await mediaPage.cdDvdTile.click();

    await expect(mediaPage.applyButton).toBeVisible({ timeout: 5_000 });
    await expect(mediaPage.applyButton).toBeEnabled({ timeout: 5_000 });
    console.log("[INFO] Apply button visible and enabled after selecting CD/DVD ✓");

    await context.close();
  });

  test("переключение CD/DVD → HDD → radio[value=1] снова checked", async ({ browser }) => {
    const { context, mediaPage } = await openMediaTab(browser);

    await mediaPage.cdDvdTile.click();
    await expect(mediaPage.cdDvdRadio).toBeChecked({ timeout: 5_000 });

    await mediaPage.hddTile.click();
    await expect(mediaPage.hddRadio).toBeChecked({ timeout: 5_000 });
    await expect(mediaPage.cdDvdRadio).not.toBeChecked({ timeout: 5_000 });
    console.log("[INFO] CD/DVD → HDD toggle works correctly ✓");

    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — Таблица активности
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Таблица активности на вкладке Media", () => {
  test("таблица активности (table.table.table-normal) присутствует", async ({ browser }) => {
    const { context, mediaPage } = await openMediaTab(browser);

    await expect(mediaPage.activityTable).toBeVisible({ timeout: 10_000 });
    console.log("[INFO] Activity table visible ✓");

    await context.close();
  });

  test("заголовки таблицы: Task | Requested | Duration | Progress", async ({ browser }) => {
    const { context, mediaPage } = await openMediaTab(browser);

    const thead = mediaPage.activityTableHead;
    await expect(thead).toBeVisible({ timeout: 10_000 });

    const headText = await thead.innerText();
    console.log(`[INFO] Table headers: "${headText.trim()}"`);

    expect(headText).toContain("Task");
    expect(headText).toContain("Requested");
    expect(headText).toContain("Duration");
    expect(headText).toContain("Progress");

    await context.close();
  });

  test("таблица содержит хотя бы 1 строку с историей действий", async ({ browser }) => {
    const { context, mediaPage } = await openMediaTab(browser);

    const rowCount = await mediaPage.activityRows.count();
    console.log(`[INFO] Activity table rows: ${rowCount}`);
    expect(rowCount).toBeGreaterThanOrEqual(1);

    await context.close();
  });

  test("задачи в таблице содержат известные типы (Boot, Poweroff, Restart и т.д.)", async ({
    browser,
  }) => {
    const { context, mediaPage } = await openMediaTab(browser);

    const tasks = await mediaPage.getActivityTaskNames();
    console.log(`[INFO] Activity tasks: ${tasks.join(", ")}`);

    const known = ["Boot", "Poweroff", "Shutdown", "Restart", "Rebuild", "Install"];
    const hasKnown = tasks.some((t) => known.some((k) => t.toLowerCase().includes(k.toLowerCase())));

    expect(hasKnown).toBeTruthy();

    await context.close();
  });

  test("последние завершённые задачи имеют статус Complete (span.badge.badge-active)", async ({
    browser,
  }) => {
    const { context, mediaPage } = await openMediaTab(browser);

    const badgeCount = await mediaPage.completeBadges.count();
    console.log(`[INFO] Complete badges found: ${badgeCount}`);
    expect(badgeCount).toBeGreaterThanOrEqual(1);

    const firstBadgeText = await mediaPage.completeBadges.first().innerText();
    console.log(`[INFO] First badge text: "${firstBadgeText.trim()}"`);
    expect(firstBadgeText.trim()).toBe("Complete");

    await context.close();
  });
});
