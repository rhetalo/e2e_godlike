import { type Browser, type Page } from "@playwright/test";
import * as path from "path";

export const PANEL_URL = "https://vf-panel.godlike.host";
export const EMAIL = process.env.PANEL_EMAIL ?? "test@testmail.com";
export const PASSWORD = process.env.PANEL_PASSWORD ?? "Password_123";
export const STORAGE_STATE_PATH = path.join(__dirname, "..", "storageState.panel.json");

/**
 * Test account server (confirmed live):
 *   Name:  srv-430464
 *   UUID:  9c49ed96-56f4-41c8-bc5f-a8d44c21a486
 *   URL:   /server/9c49ed96-56f4-41c8-bc5f-a8d44c21a486
 *
 * NOTE: /server/{UUID} works fine in the browser with session cookies.
 * The "redirect" I saw earlier was just Node.js not carrying cookies properly.
 * In Playwright (real browser), the URL opens correctly after login.
 */
export const TEST_SERVER_UUID = "3bf4ed84-32fe-4b1d-9fde-68b2f6b51188";
export const TEST_SERVER_NAME = "srv-433986";
export const TEST_SERVER_URL = `${PANEL_URL}/server/${TEST_SERVER_UUID}`;

/**
 * Login to VirtFusion panel and save session to storageState.
 *
 * Confirmed live behavior:
 *  - Login endpoint: POST /login
 *  - Email field:    input[type="email"]
 *  - Password field: input[type="password"]
 *  - Submit button:  button with text "Login"
 *  - Response: {"url":"/dashboard"} → SPA navigates to /dashboard
 */
export async function loginAndSaveSession(browser: Browser): Promise<void> {
  const page = await browser.newPage();
  try {
    await page.goto(`${PANEL_URL}/login`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.waitFor({ state: "visible", timeout: 20_000 });
    await emailInput.fill(EMAIL);

    await page.locator('input[type="password"]').first().fill(PASSWORD);

    await page.locator('button:has-text("Login")').first().click();

    // SPA navigates to /dashboard after login (confirmed live)
    await page.waitForURL(/\/dashboard/, {
      timeout: 30_000,
      waitUntil: "domcontentloaded",
    });

    await page.context().storageState({ path: STORAGE_STATE_PATH });
    console.log("[INFO] Panel login OK → storageState.panel.json saved");
  } finally {
    await page.close();
  }
}

/**
 * Navigate to servers list and wait for <client-servers> Vue component to render.
 */
export async function gotoServersPage(page: Page): Promise<void> {
  await page.goto(`${PANEL_URL}/servers`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await page.waitForLoadState("networkidle").catch(() => null);
}
