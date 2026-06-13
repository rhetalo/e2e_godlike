/**
 * Game panel — Logout (auth-флоу, @smoke).
 *
 * Аккаунт-меню (сайдбар) → Log Out (`<a href="/logout">`) → редирект на /login.
 * ⚠️ Logout убивает сессию контекста → тест в ИЗОЛИРОВАННОМ контексте (не шарит page
 * с другими спеками). storageState.game.json НЕ перезаписываем после логаута — соседние
 * спеки всё равно делают свежий логин в своих beforeAll (loginAndSaveGameSession).
 *
 * Не требует запущенного сервера.
 */
import { test, expect, type BrowserContext } from "@playwright/test";
import { GamePanelDashboardPage } from "../../../pages/game/GamePanelDashboardPage";
import { GamePanelLoginPage } from "../../../pages/game/GamePanelLoginPage";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
} from "../../../utils/gameAuth";

test.describe("@smoke [game-panel] Logout", () => {
  let context: BrowserContext;
  let dashboard: GamePanelDashboardPage;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60_000);
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    dashboard = new GamePanelDashboardPage(await context.newPage());
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("TC-GP-AUTH-004 | Log Out из аккаунт-меню → редирект на /login", async () => {
    test.setTimeout(60_000);
    await dashboard.goto();

    await test.step("дашборд открыт под залогиненной сессией", async () => {
      await expect(dashboard.heading).toBeVisible();
    });

    await dashboard.logout();

    await test.step("после Log Out — страница /login с формой входа", async () => {
      expect(dashboard.url()).toContain("/login");
      const login = new GamePanelLoginPage(dashboard.page);
      await expect(login.chooserButton).toBeVisible();
    });
  });
});
