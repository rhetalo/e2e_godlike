import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'https://godlike.host';
const EMAIL = 'test@testmail.com';
const PASSWORD = 'test@testmail.com';

// Список игр для проверки
const gamesToTest = [
  'Minecraft',
  'Minecraft Bedrock',
  'Hytale',
  'Terraria',
  'Vintage Story',
  'Palworld',
  'Rust',
  'ARK Survival Evolved',
  'ARK: Survival Ascended',
  'Project Zomboid',
  'Valheim',
  'FiveM',
  'CS 2',
  'Garrys Mod',
  '7 Days to Die',
  'DayZ',
  'Unturned',
  'Factorio',
  'Satisfactory',
  'Arma 3',
  'CS 1.6',
  'Mindustry',
  'V Rising',
  'Abiotic Factor',
  'Conan Exiles',
  "Don't starve together",
  'Enshrouded',
  'Killing floor 2',
  'Left 4 Dead 2',
  'Path of Titans',
  'Quake Live',
  'Space Engineers',
  'Team Fortress 2',
  'The Forest',
  'Starbound',
  'Squad',
  'Core Keeper',
  'BeamNG Server Hosting',
  'Arma Reforger Server Hosting',
  'RedM Server Hosting',
  'Soulmask'
];

let storageStatePath = 'storageState.json';

// Функция для ожидания загрузки страницы
async function waitForPageLoad(page: Page, timeout = 60000) {
  await page.waitForLoadState('domcontentloaded', { timeout });
  await page.waitForLoadState('networkidle', { timeout });
}

// Функция для клика с ожиданием навигации
async function clickAndWaitForNavigation(page: Page, locator: any, timeout = 60000) {
  await locator.scrollIntoViewIfNeeded();
  await Promise.all([
    page.waitForNavigation({ timeout, waitUntil: 'networkidle' }),
    locator.click()
  ]);
}

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/clientarea/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  
  await page.fill('#inputEmail', EMAIL);
  await page.fill('#inputPassword', PASSWORD);
  
  await Promise.all([
    page.waitForURL('**/clientarea/clientarea.php', { timeout: 60000 }),
    page.click('#login')
  ]);
  console.log('[INFO] Login successful');

  await page.context().storageState({ path: storageStatePath });
  await page.close();
});

for (const gameName of gamesToTest) {
  test(`Validate promocode for game: ${gameName}`, async ({ browser }) => {
    console.log(`\n===== START TEST FOR GAME: ${gameName} =====`);

    const context = await browser.newContext({ storageState: storageStatePath });
    const page = await context.newPage();

    try {
      // Открываем страницу с играми
      await page.goto(`${BASE_URL}/game-servers-en/`, { waitUntil: 'networkidle', timeout: 60000 });

      // Находим ссылку на игру с точным совпадением текста (regex ^$ для точного match)
      // Это нужно чтобы "Minecraft" не匹配 "Modded Minecraft"
      const gameLink = page.locator(`a.game__title`).filter({ hasText: new RegExp(`^${gameName}$`) }).first();
      
      // Ожидаем видимости ссылки
      await gameLink.waitFor({ state: 'visible', timeout: 60000 });
      await gameLink.scrollIntoViewIfNeeded();
      
      // Кликаем и ждем навигации
      await Promise.all([
        page.waitForNavigation({ timeout: 60000, waitUntil: 'networkidle' }),
        gameLink.click()
      ]);

      // Сохраняем URL текущей страницы игры для последующих возвратов
      const gamePageUrl = page.url();
      console.log(`[INFO] Game page URL: ${gamePageUrl}`);

      // После того как страница загрузилась, ищем тарифы
      // Фильтруем: только те тарифы, которые содержат кнопку "Add to Cart"
      // Исключаем "Out of stock" и другие недоступные тарифы
      const tariffLocator = page.locator('.storefront__tariff');
      await tariffLocator.first().waitFor({ state: 'visible', timeout: 60000 });

      // Получаем все тарифы и фильтруем по наличию кнопки "Add to Cart"
      const allTariffs = await tariffLocator.all();
      const validTariffs = [];
      
      for (const tariff of allTariffs) {
        const addToCartBtn = tariff.locator('a.button.storefront__tariff-action__cart:has-text("Add to Cart")');
        const btnCount = await addToCartBtn.count();
        if (btnCount > 0) {
          validTariffs.push(addToCartBtn.first());
        }
      }

      const tariffCount = validTariffs.length;
      console.log(`[INFO] Valid tariffs with "Add to Cart": ${tariffCount}`);

      if (tariffCount === 0) {
        console.log(`[WARN] No valid tariffs found for ${gameName}, skipping...`);
        return;
      }

      // Проходим по каждому тарифу
      for (let i = 0; i < tariffCount; i++) {
        console.log(`\n[TARIFF] Processing tariff #${i + 1}`);
        
        try {
          // Для каждого тарифа заново открываем страницу игры
          // Это более надежно чем использовать goBack()
          await page.goto(gamePageUrl, { waitUntil: 'networkidle', timeout: 60000 });
          
          // Ждем загрузки тарифов
          await tariffLocator.first().waitFor({ state: 'visible', timeout: 60000 });
          
          // Получаем актуальный локатор для текущего тарифа
          const currentTariff = validTariffs[i];
          
          // Название тарифа
          const tariffDiv = page.locator('.storefront__tariff').nth(i);
          const tariffTitleLocator = tariffDiv.locator('h3.storefront__tariff-title');
          
          let tariffTitle = `#${i + 1}`;
          try {
            tariffTitle = (await tariffTitleLocator.textContent())?.trim() || `#${i + 1}`;
          } catch (e) {
            console.log(`[WARN] Could not get tariff title, using default`);
          }
          
          console.log(`[TARIFF] Game: ${gameName} | Tariff: ${tariffTitle}`);

          // Скроллим и кликаем по тарифу
          await currentTariff.scrollIntoViewIfNeeded();
          
          // Открываем карточку тарифа с ожиданием
          await Promise.all([
            page.waitForNavigation({ timeout: 60000, waitUntil: 'networkidle' }),
            currentTariff.click()
          ]);

          console.log(`[INFO] Opened tariff details`);

          // Ждём промокод
          const promoLabel = page.locator('span.promocode__label-success');
          await promoLabel.waitFor({ state: 'visible', timeout: 30000 });

          const promoText = (await promoLabel.textContent())?.trim() || '';
          console.log(`[PROMO] Tariff "${tariffTitle}": ${promoText}`);

          // Проверка промокода
          expect(promoText.includes('Activated promocode')).toBeTruthy();
          
          console.log(`[INFO] Processed tariff #${i + 1} successfully`);
          
        } catch (tariffError) {
          console.log(`[ERROR] Failed to process tariff #${i + 1}: ${tariffError}`);
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
