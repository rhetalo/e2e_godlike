import { test as base, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { loginAndSaveSession, STORAGE_STATE_PATH } from "../utils/auth";

/**
 * Extended test fixture that:
 * 1. Logs in once per suite (beforeAll via browser context)
 * 2. Provides an authenticated `page` for each test
 *
 * Usage:
 *   import { test, expect } from "../fixtures/vps.fixtures";
 *
 *   test("my test", async ({ authedPage }) => {
 *     // authedPage is already authenticated
 *   });
 */

type VpsFixtures = {
  authedPage: Page;
};

export const test = base.extend<VpsFixtures>({
  authedPage: async ({ browser }: { browser: Browser }, use: (page: Page) => Promise<void>) => {
    const context: BrowserContext = await browser.newContext({
      storageState: STORAGE_STATE_PATH,
    });
    const page: Page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from "@playwright/test";

/**
 * Shared beforeAll helper — call this at the top of each spec file.
 * Performs login and persists session to STORAGE_STATE_PATH.
 */
export { loginAndSaveSession, STORAGE_STATE_PATH };
