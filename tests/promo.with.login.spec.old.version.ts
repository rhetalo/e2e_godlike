import { test, expect, Page } from "@playwright/test";
import gamesData from "../fixtures/games.json";
// Список игр для проверки в Json файле
const gamesToTest: string[] = gamesData.games;

const BASE_URL = "https://godlike.host";
const EMAIL = "test@testmail.com";
const PASSWORD = "test@testmail.com";

let storageStatePath = "storageState.json";

// test.describe.configure({ mode: 'serial', timeout: 60000 });

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/clientarea/login`, {
    waitUntil: "domcontentloaded",
    timeout: 6000,
  });

  await page.fill("#inputEmail", EMAIL);
  await page.fill("#inputPassword", PASSWORD);

  await Promise.all([
    page.waitForURL("**/clientarea/clientarea.php", { timeout: 6000 }),
    page.click("#login"),
  ]);
  console.log("[INFO] Login successful");

  await page.context().storageState({ path: storageStatePath });
  await page.close();
});

for (const gameName of gamesToTest) {
  test(`Validate promocode for game: ${gameName}`, async ({ browser }) => {
    test.setTimeout(60000);
    console.log(`\n===== START TEST FOR GAME: ${gameName} =====`);

    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();

    try {
      // Открываем страницу с играми
      await page.goto(`${BASE_URL}/game-servers-en/`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      // Находим ссылку на игру с точным совпадением текста
      const gameLink = page
        .locator(`a.game__title`)
        .filter({ hasText: new RegExp(`^${gameName}$`) })
        .first();

      await gameLink.waitFor({ state: "visible", timeout: 60000 });
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
      await tariffLocator.first().waitFor({ state: "visible", timeout: 60000 });

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

      // Проходим по каждому тарифу
      for (let i = 0; i < tariffCount; i++) {
        console.log(
          `\n[TARIFF] Processing tariff #${i + 1}: ${validTariffs[i].title}`,
        );

        try {
          const { btn: currentTariffBtn, title: tariffTitle } = validTariffs[i];

          await currentTariffBtn.scrollIntoViewIfNeeded();
          await currentTariffBtn.click();

          try {
            await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
          } catch {
            await page.waitForLoadState("domcontentloaded", { timeout: 60000 });
          }

          console.log(`[INFO] Opened tariff details`);

          // Ждём промокод
          const promoLabel = page.locator("span.promocode__label-success");
          await promoLabel.waitFor({ state: "visible", timeout: 30000 });

          const promoText = (await promoLabel.textContent())?.trim() || "";
          console.log(`[PROMO] Tariff "${tariffTitle}": ${promoText}`);

          expect(promoText.includes("Activated promocode")).toBeTruthy();

          console.log(`[INFO] Processed tariff #${i + 1} successfully`);

          // Возвращаемся на страницу игры для следующего тарифа
          await page.goto(gamePageUrl, {
            waitUntil: "domcontentloaded",
            timeout: 60000,
          });
        } catch (tariffError) {
          console.log(
            `[ERROR] Failed to process tariff #${i + 1}: ${tariffError}`,
          );
          throw tariffError;
        }
      }

      console.log(`\n===== END TEST FOR GAME: ${gameName} =====`);
    } catch (error) {
      console.log(`[ERROR] Test failed for game ${gameName}: ${error}`);
      throw error;
    } finally {
      await page.close();
      await context.close();
    }
  });
}
