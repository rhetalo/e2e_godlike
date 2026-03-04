import { test, expect } from "@playwright/test";
import gamesData from "../fixtures/games.json";
// Список игр для проверки в Json файле
const gamesToTest: string[] = gamesData.games;

const BASE_URL = "https://godlike.host";

for (const gameName of gamesToTest) {
  test(`Validate promocode for game: ${gameName}`, async ({ page }) => {
    console.log(`\n===== START TEST FOR GAME: ${gameName} =====`);

    try {
      // Открываем страницу с играми
      await page.goto(`${BASE_URL}/game-servers-en/`, {
        waitUntil: "domcontentloaded",
      });

      // Находим ссылку на игру с точным совпадением текста
      const gameLink = page
        .locator(`a.game__title`)
        .filter({ hasText: new RegExp(`^${gameName}$`) })
        .first();

      await expect(gameLink).toBeVisible();
      await gameLink.scrollIntoViewIfNeeded();

      // Получаем URL игры из атрибута href (это SPA, поэтому page.url() не меняется)
      const gamePageUrl =
        (await gameLink.getAttribute("href")) || `${BASE_URL}/game-servers-en/`;
      console.log(`[INFO] Game page URL: ${gamePageUrl}`);

      // Кликаем и ждем навигации
      await gameLink.click();
      await page.waitForLoadState("domcontentloaded", { timeout: 60000 });

      // Ищем тарифы
      const tariffLocator = page.locator(".storefront__tariff");
      await expect(tariffLocator.first()).toBeVisible();

      // Фильтруем только тарифы с "Add to Cart"
      const allTariffs = await tariffLocator.all();
      const validTariffs: { div: any; btn: any; title: string }[] = [];

      for (let idx = 0; idx < allTariffs.length; idx++) {
        const tariff = allTariffs[idx];
        const addToCartBtn = tariff.locator(
          'a.button.storefront__tariff-action__cart:has-text("Add to Cart")',
        );
        const btnCount = await addToCartBtn.count();

        if (btnCount > 0) {
          let title = `#${idx + 1}`;
          try {
            const titleLocator = tariff.locator("h3.storefront__tariff-title");
            const titleText = await titleLocator.textContent();
            if (titleText) title = titleText.trim();
          } catch {}

          validTariffs.push({
            div: tariff,
            btn: addToCartBtn.first(),
            title: title,
          });
        }
      }

      const tariffCount = validTariffs.length;
      console.log(`[INFO] Valid tariffs with "Add to Cart": ${tariffCount}`);

      if (tariffCount === 0) {
        console.log(
          `[WARN] No valid tariffs found for ${gameName}, skipping...`,
        );
        return;
      }

      // Проходим по каждому тарифу как по отдельному шагу теста
      for (let i = 0; i < tariffCount; i++) {
        const { btn: currentTariffBtn, title: tariffTitle } = validTariffs[i];

        await test.step(`Tariff "${tariffTitle}" for game "${gameName}"`, async () => {
          console.log(`\n[TARIFF] Processing tariff #${i + 1}: ${tariffTitle}`);

          try {
            await currentTariffBtn.scrollIntoViewIfNeeded();
            await currentTariffBtn.click();

            await page.waitForLoadState("domcontentloaded");

            console.log(`[INFO] Opened tariff details`);

            // Ждём промокод
            const promoLabel = page
              .locator("span.promocode__label-success")
              .first();
            await expect(promoLabel).toBeVisible();

            const promoText = (await promoLabel.textContent())?.trim() || "";
            console.log(`[PROMO] Tariff "${tariffTitle}": ${promoText}`);

            expect(promoText.includes("Activated promocode")).toBeTruthy();

            console.log(`[INFO] Processed tariff #${i + 1} successfully`);

            // Возвращаемся на страницу игры для следующего тарифа
            await page.goto(gamePageUrl, {
              waitUntil: "domcontentloaded",
            });
          } catch (tariffError) {
            console.log(
              `[ERROR] Failed to process tariff #${i + 1}: ${tariffError}`,
            );
            throw tariffError;
          }
        });
      }

      console.log(`\n===== END TEST FOR GAME: ${gameName} =====`);
    } catch (error) {
      console.log(`[ERROR] Test failed for game ${gameName}: ${error}`);
      throw error;
    } finally {
      // Контекст и страница автоматически закрываются Playwright после теста
    }
  });
}
