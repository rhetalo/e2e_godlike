import { test, expect } from '@playwright/test';

const BASE_URL = 'https://godlike.host';
const EMAIL = 'test@testmail.com';
const PASSWORD = 'test@testmail.com';
const STORAGE_STATE = 'storageState.json';

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

test.describe.configure({
    mode: 'serial',
  timeout: 15 * 60 * 1000
});

/* =======================
    LOGIN ONCE
======================= */
test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();

    await page.goto(`${BASE_URL}/clientarea/login`, { timeout: 60000 });
    await page.fill('#inputEmail', EMAIL);
    await page.fill('#inputPassword', PASSWORD);

    await Promise.all([
    page.waitForURL('**/clientarea/clientarea.php', { timeout: 60000 }),
    page.click('#login')
    ]);

    await page.context().storageState({ path: STORAGE_STATE });
    await page.close();

    console.log('[INFO] Login successful');
});

/* =======================
    TESTS PER GAME
======================= */
for (const gameName of gamesToTest) {
    test(`Validate promocode for game: ${gameName}`, async ({ browser }) => {
    console.log(`\n===== START GAME: ${gameName} =====`);

    const context = await browser.newContext({ storageState: STORAGE_STATE });
    const page = await context.newPage();

    try {
      /* ---------- OPEN GAMES PAGE ---------- */
        await page.goto(`${BASE_URL}/game-servers-en/`, {
        waitUntil: 'domcontentloaded',
        timeout: 120000
        });

        const gameLink = page
        .locator('a.game__title')
        .filter({ hasText: new RegExp(`^${gameName}$`) });

        if (await gameLink.count() === 0) {
        console.log(`[SKIP] Game not found: ${gameName}`);
        return;
        }

        await gameLink.first().scrollIntoViewIfNeeded();
        const gameUrl = await gameLink.first().getAttribute('href');

        await gameLink.first().click();
        await page.waitForLoadState('domcontentloaded', { timeout: 60000 });

        console.log(`[INFO] Game URL: ${gameUrl}`);

      /* ---------- TARIFFS ---------- */
        const tariffs = page.locator('.storefront__tariff');
        const tariffCount = await tariffs.count();

        if (tariffCount === 0) {
        console.log(`[SKIP] No tariffs for ${gameName}`);
        return;
        }

        console.log(`[INFO] Tariffs found: ${tariffCount}`);

        for (let i = 0; i < tariffCount; i++) {
        console.log(`\n[TARIFF ${i + 1}]`);

        try {
            const tariff = tariffs.nth(i);
            const addToCart = tariff.locator(
            'a.storefront__tariff-action__cart:has-text("Add to Cart")'
            );

            if (await addToCart.count() === 0) {
            console.log('[SKIP] No Add to Cart button');
            continue;
            }

            const title =
            (await tariff.locator('h3.storefront__tariff-title').textContent())?.trim() ??
            `#${i + 1}`;

            console.log(`[INFO] Tariff: ${title}`);

            await addToCart.first().scrollIntoViewIfNeeded();
            await addToCart.first().click();

            await page.waitForLoadState('domcontentloaded', { timeout: 60000 });

            const promoLabel = page.locator('span.promocode__label-success');

            if (await promoLabel.count() === 0) {
            console.log(`[FAIL] No promo for tariff ${title}`);
            continue;
            }

            const promoText = (await promoLabel.textContent()) ?? '';
            console.log(`[PROMO] ${promoText}`);

            expect(promoText).toContain('Activated promocode');

          /* BACK TO GAME PAGE */
            await page.goto(`${BASE_URL}${gameUrl}`, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
            });

        } catch (tariffError) {
            console.log(`[ERROR] Tariff failed: ${tariffError}`);
        }
        }

        console.log(`===== END GAME: ${gameName} =====`);

    } catch (gameError) {
        console.log(`[ERROR] Game failed: ${gameName}`, gameError);
    } finally {
        await page.close();
        await context.close();
    }
    });
}