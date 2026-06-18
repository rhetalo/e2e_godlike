/**
 * vps.panel.login.spec.ts
 * ───────────────────────
 * Тесты страницы авторизации панели управления VirtFusion.
 * URL: https://vf-panel.godlike.host/login
 *
 * Покрытие:
 *   1. Структура страницы (форма, поля, кнопка disabled на пустой форме, заголовок)
 *   2. Успешный логин → редирект на /dashboard; /login и /dashboard под сессией
 *   3. Неверные креды → остаёмся на форме логина
 *   4. Незалогиненный пользователь → редирект на /login
 *
 * Запуск:
 *   npx playwright test tests/vps/panel/vps.panel.login.spec.ts --project=chromium
 */
import { test, expect, type Browser } from "@playwright/test";
import { VpsPanelLoginPage } from "../../../pages/VpsPanelLoginPage";
import { loginAndSaveSession, PANEL_URL, STORAGE_STATE_PATH } from "../../../utils/auth";

test.use({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});

// ─── beforeAll: login once and save session ───────────────────────────────────

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginAndSaveSession(browser);
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — Login Page Structure
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS-панель — структура страницы логина", () => {
  test("@regression страница /login: форма, поля, заголовок, кнопка disabled на пустой форме", async ({
    browser,
  }) => {
    const page = await browser.newPage();
    const loginPage = new VpsPanelLoginPage(page);

    try {
      await loginPage.goto();
      expect(page.url()).toMatch(/\/login/);

      await test.step("поля email/password и кнопка Login видны", async () => {
        await expect(loginPage.emailInput).toBeVisible({ timeout: 10_000 });
        await expect(loginPage.passwordInput).toBeVisible();
        await expect(loginPage.loginButton).toBeVisible();
      });

      await test.step("заголовок присутствует и непустой", async () => {
        await expect(loginPage.heading).toBeVisible({ timeout: 10_000 });
        expect((await loginPage.heading.innerText()).trim().length).toBeGreaterThan(0);
      });

      await test.step("на пустой форме кнопка Login неактивна", async () => {
        await expect(loginPage.loginButton).toBeDisabled();
      });
    } finally {
      await page.close();
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — Successful Login
// ══════════════════════════════════════════════════════════════════════════════
test.describe("@smoke @critical VPS-панель — успешный логин", () => {
  test("логин с валидными кредами → редирект на /dashboard", async ({ browser }) => {
    const page = await browser.newPage();
    const loginPage = new VpsPanelLoginPage(page);

    try {
      // loginAsTestUser ждёт waitForURL(/dashboard/) внутри.
      await loginPage.loginAsTestUser();
      expect(page.url()).toMatch(/\/dashboard/);
    } finally {
      await page.close();
    }
  });

  test("под сессией: /dashboard доступен без редиректа на /login", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();

    try {
      await page.goto(`${PANEL_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
      expect(page.url()).toMatch(/\/dashboard/);
    } finally {
      await context.close();
    }
  });

  test("под сессией: /login редиректит на /dashboard", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();

    try {
      await page.goto(`${PANEL_URL}/login`, { waitUntil: "domcontentloaded", timeout: 30_000 });
      // Авторизованного пользователя панель уводит с /login на /dashboard.
      await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
      expect(page.url()).toMatch(/\/dashboard/);
    } finally {
      await context.close();
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — Invalid Credentials
// ══════════════════════════════════════════════════════════════════════════════
test.describe("@critical VPS-панель — неверные креды", () => {
  test("неверный пароль → остаёмся на форме логина", async ({ browser }) => {
    const page = await browser.newPage();
    const loginPage = new VpsPanelLoginPage(page);

    try {
      await loginPage.loginWith("test@testmail.com", "wrong_password_xyz");
      // Не пускает на /dashboard, форма логина остаётся на экране.
      await expect(loginPage.emailInput).toBeVisible({ timeout: 10_000 });
      await expect(page).not.toHaveURL(/\/dashboard/);
    } finally {
      await page.close();
    }
  });

  test("неверный email → остаёмся на форме логина", async ({ browser }) => {
    const page = await browser.newPage();
    const loginPage = new VpsPanelLoginPage(page);

    try {
      await loginPage.loginWith("nobody@nowhere.invalid", "Password_123");
      await expect(loginPage.emailInput).toBeVisible({ timeout: 10_000 });
      await expect(page).not.toHaveURL(/\/dashboard/);
    } finally {
      await page.close();
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — Protected Routes (unauthenticated)
// ══════════════════════════════════════════════════════════════════════════════
test.describe("@critical VPS-панель — защищённые маршруты", () => {
  for (const route of ["/dashboard", "/servers"]) {
    test(`незалогиненный пользователь: ${route} → редирект на /login`, async ({ browser }) => {
      const page = await browser.newPage();

      try {
        await page.goto(`${PANEL_URL}${route}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await page.waitForURL(/\/(login|auth)/, { timeout: 15_000 });
        expect(page.url()).toMatch(/\/(login|auth)/);
      } finally {
        await page.close();
      }
    });
  }
});
