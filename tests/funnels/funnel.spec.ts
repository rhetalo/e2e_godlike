/**
 * funnel.spec.ts — базовая воронка покупки game-сервера до страницы оплаты (стоп до оплаты)
 * + редирект устаревшей WHMCS-ссылки.
 *
 * Путь: главная → Minecraft Java → Add to Cart → логин в корзине → Next step ×2 →
 * WHMCS Review & Checkout. ⚠ «Continue/Оплатить» НЕ жмём.
 */
import { test, expect } from "../../fixtures/base";
import { StorefrontHomePage } from "../../pages/StorefrontHomePage";
import { CartPage } from "../../pages/CartPage";
import { CheckoutPage } from "../../pages/CheckoutPage";
import { BASE_URL, Urls, PaymentUrlPatterns } from "../../fixtures/test-data";

test.use({ viewport: { width: 1800, height: 900 }, deviceScaleFactor: 1 });

test("@critical базовая воронка покупки", async ({ page }) => {
  const home = new StorefrontHomePage(page);
  const cart = new CartPage(page);
  const checkout = new CheckoutPage(page);

  await test.step("главная → список тарифов → первый тариф в корзину", async () => {
    await home.open();
    await home.addFirstTariffToCart();
    await expect(page).toHaveURL(/\/cart\/?/);
  });

  await test.step("логин в корзине → step 2", async () => {
    await expect(page.locator(".auth-block").first()).toBeVisible({ timeout: 20_000 });
    const advanced = await cart.loginAndAwaitStep2();
    expect(advanced, "ожидали переход на step 2 после логина").toBeTruthy();
  });

  await test.step("Next step ×2 → WHMCS Review & Checkout", async () => {
    await Promise.all([page.waitForURL(/cart\?/), cart.clickNextStep()]);
    await Promise.all([
      page.waitForURL((u) => PaymentUrlPatterns.some((re) => re.test(u.toString())), {
        timeout: 60_000,
      }),
      cart.clickNextStep(),
    ]);
  });

  await test.step("страница Review & Checkout видна (стоп до оплаты)", async () => {
    await expect(page).toHaveURL(/\/clientarea\/cart\.php\?a=checkout/);
    await expect(checkout.reviewHeading()).toBeVisible();
  });
});

test("@regression старая ссылка воронки редиректит на главную", async ({ page }) => {
  await page.goto(
    `${BASE_URL}/clientarea/cart.php?a=add&pid=341&billingcycle=monthly&currency=1&language=english&promocode=VANILLA20`,
  );
  await expect(page).toHaveURL(`${BASE_URL}${Urls.home}`);
});
