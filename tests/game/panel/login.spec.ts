/**
 * Game panel — Login (Phase 1 smoke, read-only).
 *
 * Панель не имеет маркетинговых баннеров → импорт из @playwright/test допустим
 * (см. CLAUDE.md). Навигация идёт через Page Object (GamePanelLoginPage).
 *
 * Негативный кейс использует ЗАВЕДОМО несуществующий email, чтобы не накручивать
 * счётчик неудачных входов на реальном тестовом аккаунте.
 */
import { test, expect } from "@playwright/test";
import { GamePanelLoginPage } from "../../../pages/game/GamePanelLoginPage";
import { GAME_EMAIL, GAME_PASSWORD } from "../../../utils/gameAuth";

test.describe("@smoke [game-panel] Login", () => {
  test("TC-GP-LOGIN-001 | chooser reveals the email/password form with a masked password", async ({ page }) => {
    const login = new GamePanelLoginPage(page);

    await test.step("open /login and reveal the form", async () => {
      await login.goto();
    });

    await test.step("form controls are visible", async () => {
      await expect(login.emailInput).toBeVisible();
      await expect(login.passwordInput).toBeVisible();
      await expect(login.loginButton).toBeVisible();
    });

    await test.step("password field is masked", async () => {
      expect(await login.passwordInputType()).toBe("password");
    });
  });

  test("TC-GP-LOGIN-002 | invalid credentials do not reach the dashboard", async ({ page }) => {
    const login = new GamePanelLoginPage(page);
    await login.goto();

    await login.loginWith("nobody.qa@fake-domain.invalid", "wrong_password_xyz");

    await test.step("stays on /login, never lands on the dashboard", async () => {
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
      await expect(page).not.toHaveURL(/\?page=1/);
    });
  });

  test("TC-GP-LOGIN-003 | valid credentials redirect to the dashboard", async ({ page }) => {
    const login = new GamePanelLoginPage(page);
    await login.goto();

    await login.loginWith(GAME_EMAIL, GAME_PASSWORD);

    await test.step("redirected off /login to My Servers", async () => {
      await page.waitForURL((u) => !u.toString().includes("/login"), { timeout: 30_000 });
      await expect(
        page.locator("h1, h2").filter({ hasText: /My Servers/i }).first(),
      ).toBeVisible({ timeout: 20_000 });
    });
  });
});
