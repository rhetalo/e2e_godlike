import { test, expect } from "../../fixtures/base";
import gamesData from "../../fixtures/games.json";
import { pinAmplitudeExperiments } from "../../utils/amplitude";

const gamesToTest = gamesData.games;

const BASE_URL = "https://godlike.host";

// Свежий аккаунт без активных подписок — промокод должен срабатывать
// Задай CLIENTAREA_FREE_EMAIL и CLIENTAREA_FREE_PASSWORD в .env
const EMAIL = process.env.CLIENTAREA_FREE_EMAIL ?? "testfree2@testmail.com";
const PASSWORD = process.env.CLIENTAREA_FREE_PASSWORD ?? "testfree2@testmail.com";
const storageStatePath = "storageState.free.json";

// ---------------- LOGIN ----------------

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();

  await page.goto(`${BASE_URL}/clientarea/login`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await page.fill("#inputEmail", EMAIL);
  await page.fill("#inputPassword", PASSWORD);

  await Promise.all([
    page.waitForURL("**/clientarea/clientarea.php", {
      timeout: 60000,
    }),
    page.click("#login"),
  ]);

  console.log("[INFO] Login successful in beforeAll");

  await page.context().storageState({ path: storageStatePath });
  await page.close();
});

// ---------------- TESTS ----------------

for (const game of gamesToTest) {
  test(`@critical Промокод активен для игры: ${game.name}`, async ({ browser }) => {
    test.setTimeout(60000);

    const gameName = game.name;

    console.log(`\n===== START TEST FOR: ${gameName} =====`);

    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    // Фиксируем A/B-вариант Amplitude, чтобы акционный flash-sale не мешал флоу
    await pinAmplitudeExperiments(context);

    const page = await context.newPage();

    // Копим невалидные промокоды — упадём в конце со списком всех проблем
    const invalidPromos: string[] = [];

    try {
      // ---------------- OPEN GAMES ----------------

      await page.goto(`${BASE_URL}/game-servers-en/`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      const gameLink = page
        .locator("a.game__title")
        .filter({ hasText: new RegExp(`^${gameName}$`) })
        .first();

      await expect(gameLink).toBeVisible({ timeout: 60000 });

      await gameLink.scrollIntoViewIfNeeded();

      const gamePageUrl =
        (await gameLink.getAttribute("href")) ||
        `${BASE_URL}/game-servers-en/`;

      console.log(`[INFO] Game page URL: ${gamePageUrl}`);

      await gameLink.click();

      await page.waitForLoadState("domcontentloaded", {
        timeout: 60000,
      });

      // ---------------- TARIFS ----------------

      const tariffLocator = page.locator(".storefront__tariff");

      await expect(tariffLocator.first()).toBeVisible({
        timeout: 60000,
      });

      const allTariffs = await tariffLocator.all();

      const validTariffs: {
        div: any;
        btn: any;
        title: string;
      }[] = [];

      for (let idx = 0; idx < allTariffs.length; idx++) {
        const tariff = allTariffs[idx];

        const addToCartBtn = tariff.locator(
          'a.button.storefront__tariff-action__cart:has-text("Add to Cart")',
        );

        if ((await addToCartBtn.count()) > 0) {
          let title = `#${idx + 1}`;

          try {
            const titleText = await tariff
              .locator("h3.storefront__tariff-title")
              .textContent();

            if (titleText) title = titleText.trim();
          } catch {}

          validTariffs.push({
            div: tariff,
            btn: addToCartBtn.first(),
            title,
          });
        }
      }

      console.log(`[INFO] Valid tariffs: ${validTariffs.length}`);

      if (!validTariffs.length) {
        throw new Error(`No valid tariffs for ${gameName}`);
      }

      // ---------------- PROCESS TARIFFS ----------------

      for (let i = 0; i < validTariffs.length; i++) {
        const { btn, title } = validTariffs[i];

        await test.step(`Тариф «${title}»`, async () => {
          console.log(`\n[TARIFF] ${title}`);

          await btn.scrollIntoViewIfNeeded();
          await btn.click();

          const successLabel = page.locator(
            "span.promocode__label-success",
          );

          const errorLabel = page.locator(
            "span.promocode__label-error",
          );

          await Promise.race([
            successLabel.waitFor({
              state: "visible",
              timeout: 60000,
            }),
            errorLabel.waitFor({
              state: "visible",
              timeout: 60000,
            }),
          ]);

          // ---------------- STRICT CHECK ----------------

          if (await successLabel.isVisible()) {
            const promoText =
              (await successLabel.textContent())?.trim() || "";

            console.log(
              `[PROMO SUCCESS] ${title}: ${promoText}`,
            );

            const isValid = promoText.includes(
              "Activated promocode",
            );

            if (!isValid) {
              console.log(
                `[PROMO INVALID] ${title}: ${promoText}`,
              );

              invalidPromos.push(`${title}: ${promoText}`);
            }
          } else if (await errorLabel.isVisible()) {
            const errorText =
              (await errorLabel.textContent())?.trim() || "";

            console.log(
              `[PROMO ERROR] ${title}: ${errorText}`,
            );

            invalidPromos.push(`${title}: ${errorText}`);
          }

          console.log(`[INFO] Tariff processed`);

          await page.goto(gamePageUrl, {
            waitUntil: "domcontentloaded",
            timeout: 60000,
          });
        });
      }

      // ---------------- FINAL ASSERT ----------------

      console.log(`\n===== RESULT: ${gameName} =====`);

      if (invalidPromos.length > 0) {
        console.log("[FAILED PROMOS]");
        invalidPromos.forEach((p) => console.log(` - ${p}`));

        throw new Error(
          `Invalid promocodes in ${gameName}: ${invalidPromos.length}`,
        );
      }

      console.log(`[SUCCESS] All promocodes valid`);
    } finally {
      await page.close();
      await context.close();
    }
  });
}