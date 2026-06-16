/**
 * login.validation.spec.ts
 * ────────────────────────
 * Валидация встроенной login-формы (auth-block) Vue-корзины: при пустых/неверных данных
 * корзина НЕ должна уходить на step 2.
 *
 * Это НЕ страница /clientarea/login (на корзине её нет — 404). Проверяем именно
 * cart-side валидацию auth-block, а не WHMCS clientarea.
 */
import { test, expect, type Page } from "../../fixtures/base";
import { CartPage } from "../../pages/CartPage";
import { VueCartStep2Pattern, CartAuthValidationPath } from "../../fixtures/test-data";

async function gotoCart(page: Page): Promise<CartPage> {
  const cart = new CartPage(page);
  await page.goto(CartAuthValidationPath, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await cart.cookieBanner.dismissAll();
  await expect(
    page.locator(".auth-block").first(),
    "auth-block must mount on cart step 1",
  ).toBeVisible({ timeout: 20_000 });
  await cart.switchToLoginTab();
  return cart;
}

test.describe("Валидация логина (auth-block в корзине)", () => {
  test("@critical пустая отправка НЕ переводит корзину на step 2", async ({ page }) => {
    const cart = await gotoCart(page);

    await test.step("сабмит с пустыми полями", async () => {
      await cart
        .loginSubmit()
        // force: жмём сабмит с пустыми полями намеренно — HTML5-валидация может держать кнопку неактивной.
        // eslint-disable-next-line playwright/no-force-option
        .click({ force: true })
        .catch(() => undefined);
    });

    await test.step("корзина осталась на step 1 (не ушла на step 2)", async () => {
      await expect.poll(() => page.url(), { timeout: 2_000 }).not.toMatch(VueCartStep2Pattern);
      expect(page.url()).not.toMatch(VueCartStep2Pattern);
    });
  });

  test("@critical неверные данные НЕ переводят корзину на step 2", async ({ page }) => {
    const cart = await gotoCart(page);

    await test.step("ввести заведомо неверные креды и отправить", async () => {
      await cart.loginEmail().fill("nope+invalid@example.com");
      await cart.loginPassword().fill("definitely-not-the-password-123");
      await cart.loginSubmit().click();
    });

    await test.step("корзина осталась на step 1", async () => {
      await page.waitForURL(VueCartStep2Pattern, { timeout: 10_000 }).catch(() => undefined);
      expect(page.url()).not.toMatch(VueCartStep2Pattern);
    });
  });
});
