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

  test("TC-GP-REF-001 | реф-ссылка несёт реальный реф-код; Copy Link и How It Works на месте", async () => {
    await test.step("заголовок и readonly реф-ссылка видны", async () => {
      await expect(ref.title).toBeVisible();
      await expect(ref.refLink).toBeVisible();
    });

    await test.step("реф-ссылка содержит реальный URL с кодом после домена (эффект, не просто рендер)", async () => {
      // refLink → readonly <input> (Vuetify) с реф-URL в .value; refLinkValue() его читает.
      // Пустая/голая (только домен) ссылка = сломанная реф-программа при «зелёном» тесте.
      const link = await ref.refLinkValue();
      expect(link, "referral link is an http(s) URL").toMatch(/^https?:\/\/\S+/);
      const afterHost = link.replace(/^https?:\/\/[^/?#]+/i, ""); // отрезаем протокол+домен
      expect(afterHost, "ссылка несёт путь/код после домена, а не голый домен").toMatch(/[A-Za-z0-9]{3,}/);
    });

    await test.step("Copy Link и блок How It Works присутствуют", async () => {
      await expect(ref.copyLinkButton).toBeVisible();
      await expect(ref.howItWorks).toBeVisible();
    });
  });
});
