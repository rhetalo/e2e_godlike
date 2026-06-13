/**
 * Game panel — Dashboard (Phase 1 smoke, read-only).
 *
 * Логинимся один раз (beforeAll) и переиспользуем storageState.game.json,
 * как в vps/panel-тестах. Каждый тест — свежий контекст из сохранённой сессии.
 */
import { test, expect, type BrowserContext } from "@playwright/test";
import { GamePanelDashboardPage } from "../../../pages/game/GamePanelDashboardPage";
import { loginAndSaveGameSession, GAME_STORAGE_STATE_PATH } from "../../../utils/gameAuth";

test.describe("@smoke [game-panel] Дашборд", () => {
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
  });

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
  });

  test.afterEach(async () => {
    await context.close();
  });

  test("TC-GP-DASH-001 | дашборд показывает минимум один сервер с заголовком-счётчиком", async () => {
    const page = await context.newPage();
    const dash = new GamePanelDashboardPage(page);
    await dash.goto();

    await expect(dash.heading).toBeVisible();

    const rowCount = await dash.serverCount();
    const headingCount = await dash.headingCount();

    expect(rowCount, "rendered server rows").toBeGreaterThan(0);
    if (headingCount !== null) {
      // заголовок отражает общее число серверов аккаунта; на странице их не меньше 0 и не больше счётчика
      expect(headingCount).toBeGreaterThanOrEqual(rowCount);
    }
  });

  test("TC-GP-DASH-002 | глобальный сайдбар содержит ключевые разделы", async () => {
    const page = await context.newPage();
    const dash = new GamePanelDashboardPage(page);
    await dash.goto();

    for (const name of ["My Servers", "Billing", "Support Tickets", "Knowledge Base"]) {
      await expect(dash.sidebarLink(name), `sidebar link "${name}"`).toBeVisible();
    }
  });

  test("TC-GP-DASH-003 | тоггл вида grid↔list переключает раскладку списка серверов", async () => {
    const page = await context.newPage();
    const dash = new GamePanelDashboardPage(page);
    await dash.goto();
    await expect(dash.heading).toBeVisible();

    await test.step("2 кнопки вида; grid добавляет модификатор -grid контейнеру", async () => {
      await expect(dash.viewToggleButtons).toHaveCount(2);
      await dash.setView("grid");
      await expect(dash.serversContainer).toHaveClass(/dashboard__servers-grid/);
    });

    await test.step("list снимает модификатор -grid", async () => {
      await dash.setView("list");
      await expect(dash.serversContainer).not.toHaveClass(/dashboard__servers-grid/);
    });
  });

  test("TC-GP-DASH-004 | карточка сервера показывает адрес srv*.godlike.club:PORT и кнопку Copy", async () => {
    const page = await context.newPage();
    const dash = new GamePanelDashboardPage(page);
    await dash.goto();

    await test.step("адрес сервера в формате srv*.godlike.club:PORT", async () => {
      await expect(dash.serverAddresses.first()).toHaveText(/srv\d+\.godlike\.club:\d+/);
    });

    await test.step("рядом с адресом — кнопка Copy IP", async () => {
      await expect(dash.serverCopyButtons.first()).toBeVisible();
    });
  });
});
