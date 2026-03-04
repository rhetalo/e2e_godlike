import { test, expect, Page } from '@playwright/test';

/**
 * ====================================================================================
 * НАСТРОЙКИ
 * ====================================================================================
 */

//  Данные для логина
const EMAIL = 'test@testmail.com';
const PASSWORD = 'test@testmail.com';

// 🎮 Список игр для проверки
// 👉 Просто добавляй новые игры в массив
const gamesToTest = [
  'Hytale',
  // 'Minecraft',
  // 'Rust',
];

/**
 * ====================================================================================
 * ФУНКЦИЯ ЛОГИНА (аналог Selenium login())
 * ====================================================================================
 */
async function login(page: Page) {
  await page.goto('https://godlike.host/clientarea/login');

  await page.locator('#inputEmail').fill(EMAIL);
  await page.locator('#inputPassword').fill(PASSWORD);
  await page.locator('#login').click();

  // Ждём редирект в личный кабинет
  await expect(page).toHaveURL(/clientarea/);
}

/**
 * ====================================================================================
 * ОСНОВНОЙ ТЕСТ
 * ====================================================================================
 */

test.describe('Game promocode validation tests', () => {

  for (const gameName of gamesToTest) {

    test(`Promocode validation for game: ${gameName}`, async ({ page }) => {

      // 1️⃣ Логин
      await login(page);

      // 2️⃣ Переход на страницу всех игр
      await page.goto('https://godlike.host/game-servers-en/');

      // 3️⃣ Поиск игры по названию
      const gameLink = page.locator('a.game__title', { hasText: gameName });

      await expect(gameLink).toBeVisible();

      // 4️⃣ Клик по игре
      await gameLink.click();

      // Проверяем что перешли на страницу тарифов
      await expect(page).toHaveURL(/server-hosting/);

      // 5️⃣ Получаем все кнопки "Add to Cart" (все тарифы)
      const tariffs = page.locator('a.button.storefront__tariff-action__cart');
      const tariffsCount = await tariffs.count();

      console.log(`Найдено тарифов для ${gameName}: ${tariffsCount}`);

      // 6️⃣ Проходим по каждому тарифу
      for (let i = 0; i < tariffsCount; i++) {

        // Возвращаемся на страницу игры перед каждым тарифом
        await page.goto(page.url());

        const currentTariff = tariffs.nth(i);

        await expect(currentTariff).toBeVisible();

        // Кликаем Add to Cart
        await currentTariff.click();

        // Ждём появления поля промокода
        const promoInput = page.locator('#promocode');
        await expect(promoInput).toBeVisible();

        // Проверяем текст состояния промокода
        const activatedLabel = page.locator('.promocode__label-success');
        const invalidLabel = page.getByText(/Invalid promocode/i);

        if (await activatedLabel.isVisible()) {

          const promoText = await activatedLabel.textContent();
          console.log(` Валидный промокод: ${promoText}`);

          await expect(activatedLabel).toContainText('Activated promocode');

        } else if (await invalidLabel.isVisible()) {

          console.log(` Невалидный промокод для тарифа №${i + 1}`);

          // Падаем с ошибкой
          await expect(invalidLabel).not.toBeVisible();

        } else {

          throw new Error('Статус промокода не найден!');
        }

        // Возвращаемся назад к тарифам
        await page.goBack();
      }

    });

  }

});