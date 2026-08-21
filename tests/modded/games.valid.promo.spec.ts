/**
 * games.valid.promo.spec.ts
 * ─────────────────────────
 * Под СВЕЖИМ аккаунтом (без активных подписок, одноразовые промо не израсходованы)
 * промокод должен активироваться на КАЖДОМ тарифе каждой игры.
 *
 * Зеркальный кейс — games.invalid.promo (тот же флоу под аккаунтом с израсходованными
 * промо). Общая навигация/цикл по тарифам — в GameStorefrontPage; здесь только вердикт.
 */
import { test, expect } from "../../fixtures/base";
import gamesData from "../../fixtures/games.json";
import { pinAmplitudeExperiments } from "../../utils/amplitude";
import { loginClientareaAndSaveSession } from "../../utils/clientareaAuth";
import { GameStorefrontPage } from "../../pages/GameStorefrontPage";
import { CredentialsFree } from "../../fixtures/test-data";

const games = gamesData.games;
const storageStatePath = "storageState.free.json";

test.beforeAll(async ({ browser }) => {
  await loginClientareaAndSaveSession(browser, {
    email: CredentialsFree.email,
    password: CredentialsFree.password,
    statePath: storageStatePath,
  });
});

for (const game of games) {
  test(`@critical Промокод активен для игры: ${game.name}`, async ({ browser }) => {
    // Игры с множеством тарифов (Minecraft ~9) + чтение промо на каждом → 60с мало.
    test.setTimeout(120_000);
    const context = await browser.newContext({ storageState: storageStatePath });
    await pinAmplitudeExperiments(context);
    const page = await context.newPage();

    try {
      const results = await new GameStorefrontPage(page).collectTariffPromoResults(game);

      await test.step("найдены тарифы с Add to Cart", async () => {
        expect(results.length, `нет тарифов с Add to Cart для ${game.name}`).toBeGreaterThan(0);
      });

      await test.step("промокод активировался на каждом тарифе (monthly)", async () => {
        // Свежий аккаунт: на 1 месяц действует акция MONTHLY75 (для всех) → активен на каждом тарифе.
        const notActivated = results
          .filter((r) => !r.activated)
          .map((r) => `${r.title}: ${r.text}`);
        expect(
          notActivated,
          `Промо НЕ активировался для ${game.name}:\n${notActivated.join("\n")}`,
        ).toEqual([]);
      });
    } finally {
      await page.close();
      await context.close();
    }
  });
}
