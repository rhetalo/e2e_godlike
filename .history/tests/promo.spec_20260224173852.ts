import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'https://godlike.host';
const EMAIL = 'test@testmail.com';
const PASSWORD = 'test@testmail.com';

// Список игр для проверки
const gamesToTest = [
  'Minecraft',
  'Minecraft Bedrock',
  'Hytale',
  // 'Terraria',
  // 'Vintage Story',
  // 'Palworld',
  // 'Rust',
  // 'ARK Survival Evolved',
  // 'ARK: Survival Ascended',
  // 'Project Zomboid',
  // 'Valheim',
  // 'FiveM',
  // 'CS 2',
  // 'Garrys Mod',
  // '7 Days to Die',
  // 'DayZ',
  // 'Unturned',
  // 'Factorio',
  // 'Satisfactory',
  // 'Arma 3',
  // 'CS 1.6',
  // 'Mindustry',
  // 'V Rising',
  // 'Abiotic Factor',
  // 'Conan Exiles',
  // "Don't starve together",
  // 'Enshrouded',
  // 'Killing floor 2',
  // 'Left 4 Dead 2',
  // 'Path of Titans',
  // 'Quake Live',
  // 'Space Engineers',
  // 'Team Fortress 2',
  // 'The Forest',
  // 'Starbound',
  // 'Squad',
  // 'Core Keeper',
  // 'BeamNG Server Hosting',
  // 'Arma Reforger Server Hosting',
  // 'RedM Server Hosting',
  // 'Soulmask'
];

let storageStatePath = 'storageState.json';

test.describe.configure({ mode: 'serial' }); // все тесты будут выполняться последовательно

test.beforeAll(async ({ browser }) => {
  // Создаём страницу для логина
  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/clientarea/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('#inputEmail', EMAIL);
  await page.fill('#inputPassword', PASSWORD);
  await Promise.all([
    page.waitForURL('**/clientarea/clientarea.php', { timeout: 30000 }),
    page.click('#login')
  ]);
  console.log('[INFO] Login successful');

  // Сохраняем session/cookies
  await page.context().storageState({ path: storageStatePath });
  await page.close();
});

for (const gameName of gamesToTest) {
  test(`Validate promocode for game: ${gameName}`, async ({ browser }) => {
    console.log(`\n===== START TEST FOR GAME: ${gameName} =====`);

    // Создаём новую страницу с уже залогиненной сессией
    const context = await browser.newContext({ storageState: storageStatePath });
    const page = await context.newPage();

    // Открываем страницу с играми
    await page.goto(`${BASE_URL}/game-servers-en/`, { waitUntil: 'domcontentloaded' });

    // Находим ссылку на игру по точному совпадению
    const gameLink = page.locator(`a.game__title:has-text("${gameName}")`).first();
    await expect(gameLink).toBeVisible({ timeout: 30000 });
    await Promise.all([
  page.waitForURL(`**/${gameName.toLowerCase().replace(/ /g, '-')}-server-hosting/**`, { timeout: 40000 }),
  gameLink.click()
]);

// После того как страница загрузилась, ищем тарифы
const tariffSelector = 'a.button.storefront__tariff-action__cart:has-text("Add to Cart")';
const tariffs = page.locator(tariffSelector);
await expect(tariffs.first()).toBeVisible({ timeout: 40000 });

    const tariffCount = await tariffs.count();
    console.log(`[INFO] Tariffs found: ${tariffCount}`);

    // Проходим по каждому тарифу
    for (let i = 0; i < tariffCount; i++) {
      const currentTariff = tariffs.nth(i);

      // Название тарифа
      const tariffTitleLocator = currentTariff.locator(
        'xpath=ancestor::div[contains(@class,"storefront__tariff")]//h3.storefront__tariff-title'
      );
      const tariffTitle = (await tariffTitleLocator.textContent())?.trim() || `#${i + 1}`;
      console.log(`\n[TARIFF] Game: ${gameName} | Tariff: ${tariffTitle}`);

      // Открываем карточку тарифа
      await currentTariff.scrollIntoViewIfNeeded();
      await currentTariff.click({ force: true });

      // Ждём промокод
      const promoLabel = page.locator('span.promocode__label-success');
      await promoLabel.waitFor({ state: 'visible', timeout: 20000 });

      const promoText = (await promoLabel.textContent())?.trim() || '';
      console.log(`[PROMO] Tariff "${tariffTitle}": ${promoText}`);

      // Проверка промокода
      expect(promoText.includes('Activated promocode')).toBeTruthy();

      // Возврат к списку тарифов
      await page.goBack();
      await tariffs.first().waitFor({ state: 'visible', timeout: 20000 });
    }

    console.log(`\n===== END TEST FOR GAME: ${gameName} =====`);

    await page.close();
    await context.close();
  });
}