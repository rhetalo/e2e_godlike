/**
 * Game panel — Referral (/referral), структурный, read-only.
 *
 * Глобальная страница реф-программы: заголовок, реф-ссылка (readonly) + Copy Link, баланс +
 * Request Withdrawal, How It Works. ⚠️ Request Withdrawal (вывод средств) НЕ жмём.
 *
 * Подтверждено MCP-recon 06-Jun-2026 (BEM .referral-page__ / .link-card__ / .how-it-works__).
 */
import { test, expect, type BrowserContext } from "@playwright/test";
import { GamePanelReferralPage } from "../../../pages/game/GamePanelReferralPage";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
} from "../../../utils/gameAuth";

test.describe.configure({ mode: "serial" });

test.describe("@regression [game-panel] Referral", () => {
  let context: BrowserContext;
  let ref: GamePanelReferralPage;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    ref = new GamePanelReferralPage(await context.newPage());
    await ref.goto();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("TC-GP-REF-001 | реф-страница: заголовок, реф-ссылка, Copy Link, How It Works", async () => {
    await test.step("заголовок и readonly реф-ссылка видны", async () => {
      await expect(ref.title).toBeVisible();
      await expect(ref.refLink).toBeVisible();
    });
    await test.step("Copy Link и блок How It Works присутствуют", async () => {
      await expect(ref.copyLinkButton).toBeVisible();
      await expect(ref.howItWorks).toBeVisible();
    });
  });
});
