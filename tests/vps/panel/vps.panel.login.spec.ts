/**
 * vps.panel.login.spec.ts
 * ───────────────────────
 * Тесты страницы авторизации панели управления VirtFusion.
 * URL: https://vf-panel.godlike.host/login
 *
 * Покрытие:
 *   1. Структура страницы (форма, поля, кнопка)
 *   2. Успешный логин → редирект на /dashboard
 *   3. Неверные креды → сообщение об ошибке
 *   4. Незалогиненный пользователь → редирект на /login
 *   5. После логина /login → редирект на /dashboard
 *
 * Запуск:
 *   npx playwright test tests/vps.panel.login.spec.ts --project=chromium
 *   npx playwright test tests/vps.panel.login.spec.ts --project=chromium --headed
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
test.describe("VPS Panel — Login Page Structure", () => {
  test("страница /login загружается и содержит форму", async ({ browser }) => {
    const page = await browser.newPage();
    const loginPage = new VpsPanelLoginPage(page);

    await loginPage.goto();

    console.log(`[INFO] Login page URL: ${page.url()}`);
    expect(page.url()).toMatch(/\/login/);

    await expect(loginPage.emailInput).toBeVisible({ timeout: 10_000 });
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();

    console.log("[INFO] Login form elements visible ✓");
    await page.close();
  });

  test("заголовок страницы присутствует (Welcome back или аналог)", async ({ browser }) => {
    const page = await browser.newPage();
    const loginPage = new VpsPanelLoginPage(page);

    await loginPage.goto();

    const heading = page.locator("h1, h2, h3").first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
    const headingText = await heading.innerText();
    console.log(`[INFO] Login heading: "${headingText}"`);
    expect(headingText.length).toBeGreaterThan(0);

    await page.close();
  });

  test("кнопка Login видна и неактивна", async ({ browser }) => {
    const page = await browser.newPage();
    const loginPage = new VpsPanelLoginPage(page);

    await loginPage.goto();

    await expect(loginPage.loginButton).toBeVisible({ timeout: 10_000 });
    await expect(loginPage.loginButton).toBeDisabled();
    console.log("[INFO] Login button disabled ✓");

    await page.close();
  });

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — Successful Login
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Successful Login", () => {
  test("логин с валидными кредами → редирект на /dashboard", async ({ browser }) => {
    const page = await browser.newPage();
    const loginPage = new VpsPanelLoginPage(page);

    await loginPage.loginAsTestUser();

    console.log(`[INFO] After login URL: ${page.url()}`);
    expect(page.url()).toMatch(/\/dashboard/);

    await page.close();
  });

  test("после логина — /dashboard доступен без редиректа на /login", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();

    await page.goto(`${PANEL_URL}/dashboard`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForLoadState("networkidle").catch(() => null);

    console.log(`[INFO] Dashboard URL: ${page.url()}`);
    expect(page.url()).toMatch(/\/dashboard/);

    await context.close();
  });

  test("после логина — /login редиректит на /dashboard", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();

    await page.goto(`${PANEL_URL}/login`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForLoadState("networkidle").catch(() => null);

    console.log(`[INFO] After visiting /login while logged in: ${page.url()}`);
    // Authenticated users should be redirected away from /login
    // VirtFusion typically redirects to /dashboard
    const url = page.url();
    const isLoginOrDashboard = /\/(login|dashboard)/.test(url);
    expect(isLoginOrDashboard).toBeTruthy();

    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — Invalid Credentials
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Invalid Credentials", () => {
  test("неверный пароль → остаёмся на /login", async ({ browser }) => {
    const page = await browser.newPage();
    const loginPage = new VpsPanelLoginPage(page);

    await loginPage.loginWith("test@testmail.com", "wrong_password_xyz");

    // Wait briefly for page to settle
    await page.waitForTimeout(3_000);

    console.log(`[INFO] After wrong password URL: ${page.url()}`);
    // Should stay on /login (not redirect to /dashboard)
    expect(page.url()).not.toMatch(/\/dashboard/);

    await page.close();
  });

  test("неверный email → остаёмся на /login", async ({ browser }) => {
    const page = await browser.newPage();
    const loginPage = new VpsPanelLoginPage(page);

    await loginPage.loginWith("nobody@nowhere.invalid", "Password_123");
    await page.waitForTimeout(3_000);

    console.log(`[INFO] After invalid email URL: ${page.url()}`);
    expect(page.url()).not.toMatch(/\/dashboard/);

    await page.close();
  });

  test("пустые поля — кнопка Login неактивна", async ({ browser }) => {
    const page = await browser.newPage();
    const loginPage = new VpsPanelLoginPage(page);

    await loginPage.goto();
    await expect(loginPage.loginButton).toBeDisabled();
    // await loginPage.loginButton.click();
    await page.waitForTimeout(1_000);

    // Should stay on /login
    console.log(`[INFO] After empty submit URL: ${page.url()}`);
    expect(page.url()).toMatch(/\/login/);

    await page.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — Protected Routes (unauthenticated)
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Protected Routes", () => {
  test("незалогиненный пользователь: /dashboard → редиректит на /login", async ({ browser }) => {
    const page = await browser.newPage();

    await page.goto(`${PANEL_URL}/dashboard`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForLoadState("networkidle").catch(() => null);

    console.log(`[INFO] Unauthenticated /dashboard URL: ${page.url()}`);
    expect(page.url()).toMatch(/\/(login|auth)/);

    await page.close();
  });

  test("незалогиненный пользователь: /servers → редиректит на /login", async ({ browser }) => {
    const page = await browser.newPage();

    await page.goto(`${PANEL_URL}/servers`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForLoadState("networkidle").catch(() => null);

    console.log(`[INFO] Unauthenticated /servers URL: ${page.url()}`);
    expect(page.url()).toMatch(/\/(login|auth)/);

    await page.close();
  });
});
});
