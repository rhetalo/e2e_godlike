import { test, expect, Browser } from "@playwright/test";
import { MobileCartPage } from "../pages/MobileCartPage";

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});

const BASE_URL = "https://godlike.host";
const EMAIL = "test@testmail.com";
const PASSWORD = "test@testmail.com";
const storageStatePath = "storageState.mobile.json";

// Извлекаем число из строки цены — не зависит от валюты ($, €, £, ₴, zł...)
function parsePrice(priceStr: string): number {
  const match = priceStr.match(/[\d]+\.[\d]+/);
  return match ? parseFloat(match[0]) : NaN;
}

// Проверяем что цена нулевая — любая валюта
function isZeroPrice(priceStr: string): boolean {
  return /0\.00/.test(priceStr);
}

// Проверяем что цена ненулевая и в правильном формате — любая валюта
function isValidNonZeroPrice(priceStr: string): boolean {
  return /[^\d]*\d+\.\d{2}/.test(priceStr) && !isZeroPrice(priceStr);
}

// ============================
// Логин один раз
// ============================
test.beforeAll(async ({ browser }: { browser: Browser }) => {
  const page = await browser.newPage();
  try {
    await page.goto(`${BASE_URL}/clientarea/login`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.fill("#inputEmail", EMAIL);
    await page.fill("#inputPassword", PASSWORD);
    await Promise.all([
      page.waitForURL("**/clientarea/clientarea.php", { timeout: 60000 }),
      page.click("#login"),
    ]);
    console.log("[INFO] Login successful");
    await page.context().storageState({ path: storageStatePath });
  } catch (error) {
    console.log(`[ERROR] Login failed: ${error}`);
    throw error;
  } finally {
    await page.close();
  }
});

// ============================
// Тесты мобильной воронки
// ============================
test.describe("Mobile Cart Funnel", () => {
  test("страница загружается с основными элементами", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();
    const cart = new MobileCartPage(page);

    await cart.goto();

    await expect(cart.pageTitle).toBeVisible({ timeout: 15000 });
    await expect(cart.pageTitle).toHaveText("Configure your Plan");
    await expect(cart.gameSelect).toBeVisible();
    await expect(cart.orderButton).toBeVisible();
    await expect(cart.orderButton).toContainText("Order Now");

    // Цена нулевая на старте — любая валюта (€0.00, $0.00, ₴0.00...)
    const price = await cart.getTotalPrice();
    expect(isZeroPrice(price)).toBeTruthy();
    console.log(`[INFO] Initial price: ${price}`);

    await context.close();
  });

  test("Select your plan — выбор игры из выпадающего списка", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();
    const cart = new MobileCartPage(page);

    await cart.goto();

    // Выбираем игру через поиск в dropdown
    await cart.selectGameBySearch("Rust");

    // RAM dropdown стал активным
    const isDisabled = await page.locator(".custom-select--disabled").count();
    expect(isDisabled).toBe(0);

    // Выбираем план
    await cart.selectPlan("Compound");
    const planText = await cart.getSelectedPlan();
    expect(planText).toContain("Compound");
    expect(planText).toContain("GB");

    await context.close();
  });

  test("Game chips — выбор игры из быстрых кнопок", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();
    const cart = new MobileCartPage(page);

    await cart.goto();

    // Ждём пока чипы загрузятся (Vue SPA рендерит их асинхронно)
    await expect(cart.gameChips.first()).toBeVisible({ timeout: 15000 });
    const chipCount = await cart.gameChips.count();
    console.log(`[INFO] Game chips count: ${chipCount}`);
    expect(chipCount).toBeGreaterThanOrEqual(3);

    // Клик по чипу Minecraft — автоматически выбирает план
    await cart.selectGameByChip("Minecraft");

    const planText = await cart.getSelectedPlan();
    expect(planText).toContain("GB");
    console.log(`[INFO] Auto-selected plan: ${planText}`);

    await context.close();
  });

  test("Billing Period — смена периода меняет цену", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();
    const cart = new MobileCartPage(page);

    await cart.goto();

    // Сначала выбираем игру — без неё список биллинга пустой
    await cart.selectGameByChip("Minecraft");

    const monthlyPrice = await cart.waitForPriceUpdate();
    expect(isValidNonZeroPrice(monthlyPrice)).toBeTruthy();
    console.log(`[INFO] 1 Month price: ${monthlyPrice}`);

    // Переключаем на 3 месяца
    await cart.selectBillingPeriod("3 Months");
    const quarterlyPrice = await cart.getTotalPrice();
    console.log(`[INFO] 3 Months price: ${quarterlyPrice}`);

    expect(quarterlyPrice).not.toBe(monthlyPrice);

    // Цена за 3 месяца больше чем за 1 (parsePrice не зависит от символа валюты)
    const monthlyVal = parsePrice(monthlyPrice);
    const quarterlyVal = parsePrice(quarterlyPrice);
    expect(quarterlyVal).toBeGreaterThan(monthlyVal);

    // Dropdown показывает выбранный период
    const selected = await cart.getSelectedBillingPeriod();
    expect(selected).toContain("3 Months");

    await context.close();
  });

  test("RAM (Plan) — смена тарифа меняет цену", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();
    const cart = new MobileCartPage(page);

    await cart.goto();

    // До выбора игры — dropdown заблокирован
    await cart.expectPlanDropdownDisabled();

    // Выбираем игру — без неё список планов пустой
    await cart.selectGameByChip("Minecraft");
    const basePrice = await cart.waitForPriceUpdate();
    console.log(`[INFO] Base plan price: ${basePrice}`);

    // Переходим на более дорогой план
    await cart.selectPlan("Quadra");
    const upgradedPrice = await cart.getTotalPrice();
    console.log(`[INFO] Quadra plan price: ${upgradedPrice}`);

    const baseVal = parsePrice(basePrice);
    const upgradedVal = parsePrice(upgradedPrice);
    expect(upgradedVal).toBeGreaterThan(baseVal);

    await context.close();
  });

  test("Location — выбор локации из списка", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();
    const cart = new MobileCartPage(page);

    await cart.goto();

    // Нужна игра чтобы локации были активны
    await cart.selectGameByChip("Minecraft");

    // Открываем dropdown локаций
    const locationSelected = cart.locationDropdown.locator(
      ".custom-select__selected",
    );
    await locationSelected.click();

    // Опций не менее 3
    const locationOptions = cart.locationDropdown.locator(
      ".custom-select__option",
    );
    const count = await locationOptions.count();
    console.log(`[INFO] Location options: ${count}`);
    expect(count).toBeGreaterThanOrEqual(3);

    // У каждой локации есть индикатор пинга
    const pingDisplays = cart.locationDropdown.locator(".ping-display");
    const pingCount = await pingDisplays.count();
    expect(pingCount).toBeGreaterThanOrEqual(3);

    // Выбираем первую локацию
    await locationOptions.first().click();

    await context.close();
  });

  test("Promocode — поле открывается по клику", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();
    const cart = new MobileCartPage(page);

    await cart.goto();

    // По умолчанию поле скрыто
    await expect(cart.promocodeToggle).toBeVisible();
    await expect(cart.promocodeToggle).toContainText("Promocode");

    const promoInput = page.locator(
      '.cart__input[placeholder="Enter your promocode"]',
    );
    await expect(promoInput).not.toBeVisible();

    // Раскрываем
    await cart.expandPromocode();

    await expect(promoInput).toBeVisible();
    await expect(page.locator(".cart__promocode .cart__button")).toBeVisible();

    await context.close();
  });

  test("Promocode — невалидный промокод показывает ошибку", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();
    const cart = new MobileCartPage(page);

    await cart.goto();

    // Выбираем игру — промокод проверяется только с выбранным товаром
    await cart.selectGameByChip("Minecraft");
    await cart.waitForPriceUpdate();

    // Применяем заведомо неверный промокод
    await cart.applyPromocode("ТЕСТ123");

    // Должна появиться ошибка
    const errorLabel = page.locator(".cart__promocode-display-price");
    await expect(errorLabel).toBeVisible({ timeout: 10000 });

    const errorText = await errorLabel.textContent();
    console.log(`[INFO] Promo error message: ${errorText?.trim()}`);
    expect(errorText?.trim().length).toBeGreaterThan(0);

    await context.close();
  });
});
