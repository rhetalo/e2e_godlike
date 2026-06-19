/**
 * games.invalid.promo.spec.ts
 * ───────────────────────────
 * Под СТАНДАРТНЫМ аккаунтом (одноразовые промо уже израсходованы) промокод должен
 * активироваться ТОЛЬКО там, где это допустимо по games.json (`expectPromoValid`),
 * и НЕ активироваться в остальных случаях.
 *
 * Зеркальный кейс — games.valid.promo (тот же флоу под свежим аккаунтом). Общая
 * навигация/цикл по тарифам — в GameStorefrontPage; здесь только вердикт.
 */
import { test, expect } from "../../fixtures/base";
import gamesData from "../../fixtures/games.json";
import { pinAmplitudeExperiments } from "../../utils/amplitude";
import { loginClientareaAndSaveSession } from "../../utils/clientareaAuth";
import { GameStorefrontPage } from "../../pages/GameStorefrontPage";
import { Credentials } from "../../fixtures/test-data";

const games = gamesData.games;
const storageStatePath = "storageState.json";

test.beforeAll(async ({ browser }) => {
  await loginClientareaAndSaveSession(browser, {
    email: Credentials.email,
    password: Credentials.password,
    statePath: storageStatePath,
  });
});

for (const game of games) {
  test(`@critical Промокод по правилу expectPromoValid для игры: ${game.name}`, async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const expectPromoValid = game.expectPromoValid ?? false;
    const context = await browser.newContext({ storageState: storageStatePath });
    await pinAmplitudeExperiments(context);
    const page = await context.newPage();

    try {
      const results = await new GameStorefrontPage(page).collectTariffPromoResults(game.name);

      await test.step("найдены тарифы с Add to Cart", async () => {
        expect(results.length, `нет тарифов с Add to Cart для ${game.name}`).toBeGreaterThan(0);
      });

      await test.step(`активация совпадает с expectPromoValid=${expectPromoValid}`, async () => {
        const mismatches = results
          .filter((r) => r.activated !== expectPromoValid)
          .map((r) => `${r.title}: activated=${r.activated}, ожидалось ${expectPromoValid} (${r.text})`);
        expect(
          mismatches,
          `Несоответствие промо для ${game.name}:\n${mismatches.join("\n")}`,
        ).toEqual([]);
      });
    } finally {
      await page.close();
      await context.close();
    }
  });
}
