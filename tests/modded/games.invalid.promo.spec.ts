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
    // Long-term добавляет переключение периода на каждый тариф; у игр с 7+ тарифами 60с мало.
    test.setTimeout(120_000);
    const expectPromoValid = game.expectPromoValid ?? false;
    const context = await browser.newContext({ storageState: storageStatePath });
    await pinAmplitudeExperiments(context);
    const page = await context.newPage();

    try {
      // Читаем на long-term (3 мес) — там акции MONTHLY75 нет никогда (см. ниже).
      const results = await new GameStorefrontPage(page).collectTariffPromoResults(
        game.name,
        "longTerm",
      );

      await test.step("найдены тарифы с Add to Cart", async () => {
        expect(results.length, `нет тарифов с Add to Cart для ${game.name}`).toBeGreaterThan(0);
      });

      await test.step(`long-term: дефолтный промо совпадает с expectPromoValid=${expectPromoValid}`, async () => {
        // На не-месячном периоде (3 мес) НИКОГДА нет акции MONTHLY75 (она только на 1 месяц +
        // её состояние не детерминировано между окружениями — пин Amplitude гасит её локально,
        // но не на CI). Значит применяется дефолтный одноразовый промо (VANILLA20); под стандартным
        // (израсходованным) аккаунтом он invalid, кроме игр с expectPromoValid=true.
        const mismatches = results
          .filter((r) => r.activated !== expectPromoValid)
          .map((r) => `${r.title}: activated=${r.activated}, ожидалось ${expectPromoValid} (${r.text})`);
        expect(
          mismatches,
          `Несоответствие дефолтного промо (long-term) для ${game.name}:\n${mismatches.join("\n")}`,
        ).toEqual([]);
      });
    } finally {
      await page.close();
      await context.close();
    }
  });
}
