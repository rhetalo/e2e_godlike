/**
 * Game panel — Dashboard (Phase 1 smoke, read-only).
 *
 * Логинимся один раз (beforeAll) и переиспользуем storageState.game.json,
 * как в vps/panel-тестах. Каждый тест — свежий контекст из сохранённой сессии.
 */
import { test, expect, type BrowserContext } from "@playwright/test";
import { GamePanelDashboardPage } from "../../../pages/game/GamePanelDashboardPage";
import { loginAndSaveGameSession, GAME_STORAGE_STATE_PATH } from "../../../utils/gameAuth";

test.describe("@smoke [game-panel] Dashboard", () => {
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

  test("TC-GP-DASH-001 | dashboard lists at least one server with a count heading", async () => {
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

  test("TC-GP-DASH-002 | global sidebar exposes the key destinations", async () => {
    const page = await context.newPage();
    const dash = new GamePanelDashboardPage(page);
    await dash.goto();

    for (const name of ["My Servers", "Billing", "Support Tickets", "Knowledge Base"]) {
      await expect(dash.sidebarLink(name), `sidebar link "${name}"`).toBeVisible();
    }
  });
});
