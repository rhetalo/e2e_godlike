import { test, expect, Locator, Page } from '@playwright/test';

const BASE_URL = 'https://godlike.host';
const EMAIL = 'test@testmail.com';
const PASSWORD = 'test@testmail.com';

const gamesToTest = ['Hytale', 'Minecraft','Rust'];

test.describe.serial('Promocode validation - stable TS', () => {
  let page: Page;

  // Логинимся один раз перед всеми тестами
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(`${BASE_URL}/clientarea/login`, { waitUntil: 'domcontentloaded' });
    await page.fill('#inputEmail', EMAIL);
    await page.fill('#inputPassword', PASSWORD);
    await Promise.all([
      page.waitForURL('**/clientarea/clientarea.php', { timeout: 30000 }),
      page.click('#login')
    ]);
    console.log('[INFO] Login successful');
  });

  test.afterAll(async () => {
    await page.close();
  });

  for (const gameName of gamesToTest) {
    test(`${gameName} - Validate all tariffs promocodes`, async () => {
      console.log(`\n===== START TEST FOR GAME: ${gameName} =====`);

      // Открываем страницу с играми
      await page.goto(`${BASE_URL}/game-servers-en/`, { waitUntil: 'domcontentloaded' });

      // Выбираем игру
      let gameLink: Locator;
      if (gameName === 'Minecraft') {
        gameLink = page.locator('a.game__title[href="/minecraft-java-servers-hosting/"]').first();
      } else {
        gameLink = page.getByRole('link', { name: gameName, exact: true }).first();
      }
      await gameLink.waitFor({ state: 'visible', timeout: 20000 });
      await gameLink.click();

      // Ждём, пока загрузятся тарифы
      const tariffSelector = 'a.button.storefront__tariff-action__cart';
      const tariffs = page.locator(tariffSelector);
      const tariffCount = await tariffs.count();
      console.log(`[INFO] Tariffs found: ${tariffCount}`);

      for (let i = 0; i < tariffCount; i++) {
        const currentTariff = tariffs.nth(i);
        console.log(`\n[TARIFF] Game: ${gameName} | Tariff #${i + 1}`);

        // Ожидание видимости и скролл
        await currentTariff.waitFor({ state: 'visible', timeout: 30000 });
        await currentTariff.scrollIntoViewIfNeeded();
        await currentTariff.click({ force: true });
        await page.waitForTimeout(500); // чтобы DOM успел обновиться

        // Проверяем промокод
        const promoLabel = page.locator('.promocode__label-success');
        let promoText = 'Invalid or missing';
        if (await promoLabel.isVisible({ timeout: 5000 }).catch(() => false)) {
          promoText = (await promoLabel.textContent())?.trim() || '';
          console.log(`[PROMO] Activated -> ${promoText}`);
        } else {
          console.log('[PROMO] Invalid or missing promocode');
        }

        // Возвращаемся к тарифам
        await page.goBack();
        await page.waitForSelector(tariffSelector, { timeout: 20000 });
      }

      console.log(`\n===== END TEST FOR GAME: ${gameName} =====`);
    });
  }
});