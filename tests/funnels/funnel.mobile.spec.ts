import { test, expect, Browser } from "@playwright/test";
import { MobileCartPage } from "../../pages/MobileCartPage";
import { BASE_URL, Credentials } from "../../fixtures/test-data";

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});

const storageStatePath = "storageState.mobile.json";

// Извлекаем число из строки цены — устойчиво к валютам и форматам
function parsePrice(priceStr: string): number {
  const normalized = priceStr.replace(",", ".");
  const match = normalized.match(/[\d]+(\.\d+)?/);
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
    await page.fill("#inputEmail", Credentials.email);
    await page.fill("#inputPassword", Credentials.password);
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
test.describe("Мобильная воронка корзины", () => {
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

    await cart.selectGameBySearch("Rust");

    const isDisabled = await page.locator(".custom-select--disabled").count();
    expect(isDisabled).toBe(0);

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

    await expect(cart.gameChips.first()).toBeVisible({ timeout: 15000 });
    const chipCount = await cart.gameChips.count();
    console.log(`[INFO] Game chips count: ${chipCount}`);
    expect(chipCount).toBeGreaterThanOrEqual(3);

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

    await cart.selectGameByChip("Minecraft");

    // ЖДЕМ пока цена станет валидной
await expect
  .poll(async () => {
    const price = await cart.getTotalPrice();
    console.log(`[DEBUG] price: ${price}`);
    return parsePrice(price);
  }, { timeout: 5000 })
  .toBeGreaterThan(0);

// ПОТОМ отдельно получаем значение
const monthlyPrice = parsePrice(await cart.getTotalPrice());

console.log(`[INFO] 1 Month price: ${monthlyPrice}`);

    await cart.selectBillingPeriod("3 Months");

await expect
  .poll(async () => {
    const price = await cart.getTotalPrice();
    console.log(`[DEBUG] 3m price: ${price}`);
    return parsePrice(price);
  }, { timeout: 5000 })
  .toBeGreaterThan(0);

const quarterlyPrice = parsePrice(await cart.getTotalPrice());

console.log(`[INFO] 3 Months price: ${quarterlyPrice}`);

    expect(quarterlyPrice).not.toBe(monthlyPrice);

expect(quarterlyPrice).toBeGreaterThan(monthlyPrice);

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

  await cart.expectPlanDropdownDisabled();

  await cart.selectGameByChip("Minecraft");

  // ЖДЕМ пока цена станет валидной (> 0)
  await expect
    .poll(async () => {
      const price = await cart.getTotalPrice();
      console.log(`[DEBUG] base price: ${price}`);
      return parsePrice(price);
    }, { timeout: 5000 })
    .toBeGreaterThan(0);

  // Получаем значение отдельно
  const basePrice = parsePrice(await cart.getTotalPrice());
  console.log(`[INFO] Base plan price: ${basePrice}`);

  await cart.selectPlan("Godlike");

  // ЖДЕМ пока цена станет больше базовой
  await expect
    .poll(async () => {
      const upgradedPrice = await cart.getTotalPrice();
      console.log(`[INFO] Godlike plan price: ${upgradedPrice}`);
      return parsePrice(upgradedPrice);
    }, {
      timeout: 5000,
      intervals: [300, 500, 1000],
    })
    .toBeGreaterThan(basePrice);

  await context.close();
});

  test("Location — выбор локации из списка", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();
    const cart = new MobileCartPage(page);

    await cart.goto();

    await cart.selectGameByChip("Minecraft");

    const locationSelected = cart.locationDropdown.locator(
      ".custom-select__selected",
    );
    await locationSelected.click();

    const locationOptions = cart.locationDropdown.locator(
      ".custom-select__option",
    );
    const count = await locationOptions.count();
    console.log(`[INFO] Location options: ${count}`);
    expect(count).toBeGreaterThanOrEqual(3);

    const pingDisplays = cart.locationDropdown.locator(".ping-display");
    const pingCount = await pingDisplays.count();
    expect(pingCount).toBeGreaterThanOrEqual(3);

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

    await expect(cart.promocodeToggle).toBeVisible();
    await expect(cart.promocodeToggle).toContainText("Promocode");

    const promoInput = page.locator(
      '.cart__input[placeholder="Enter your promocode"]',
    );
    await expect(promoInput).not.toBeVisible();

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

    await cart.selectGameByChip("Minecraft");

    await expect
      .poll(async () => {
        const price = await cart.getTotalPrice();
        return parsePrice(price);
      }, { timeout: 5000 })
      .toBeGreaterThan(0);

    await cart.applyPromocode("ТЕСТ123");

    const errorLabel = page.locator(".cart__promocode-display-price");
    await expect(errorLabel).toBeVisible({ timeout: 10000 });

    const errorText = await errorLabel.textContent();
    console.log(`[INFO] Promo error message: ${errorText?.trim()}`);
    expect(errorText?.trim().length).toBeGreaterThan(0);

    await context.close();
  });
});