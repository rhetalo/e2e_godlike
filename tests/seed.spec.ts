/**
 * Seed для Playwright Test Agents (Planner / Generator / Healer, `npx playwright init-agents`).
 *
 * Агент стартует со страницы, которую открыл этот тест. Импорт из fixtures/base и PO — баннеры
 * (CookieYes, flash-sale) гасятся автоматически, как в обычных storefront-спеках.
 *
 * ⚠️ Лежит в корне tests/ и запускается только проектом `agents` (default:false в playwright.config):
 * npx playwright test --project=agents
 */
import { test, expect } from "../fixtures/base";
import { GameStorefrontPage } from "../pages/GameStorefrontPage";

test("seed", async ({ page }) => {
  const catalog = new GameStorefrontPage(page);
  await catalog.open();
  await expect(catalog.pageHeading()).toBeVisible();
});
