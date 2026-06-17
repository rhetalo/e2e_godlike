/**
 * registration-flow.spec.ts — регистрация нового пользователя при оформлении тарифа.
 *
 * Флоу: главная → «View all plans» → Add to Cart → форма регистрации (auth-block) →
 * принять условия → шаги оформления. Сгенерированные креды сохраняются в credentials.json
 * (ротация 30 записей, utils/credentials.ts).
 *
 * ⚠️ Создаёт РЕАЛЬНОГО пользователя на LIVE PROD (без оформления оплаты — Continue не жмём).
 *    Сгенерированные креды сохраняются в credentials.json (ротация 30 записей).
 */
import { test, expect, type Page } from "../../fixtures/base";
import { StorefrontHomePage } from "../../pages/StorefrontHomePage";
import { CartPage } from "../../pages/CartPage";
import { generateCredentials, saveCredentials } from "../../utils/credentials";

test.use({ viewport: { width: 1920, height: 1080 } });

test.describe("Регистрация из тарифа", () => {
  test("@critical Пользователь регистрируется при оформлении тарифа", async ({
    page,
  }: {
    page: Page;
  }) => {
    test.setTimeout(60_000);

    const home = new StorefrontHomePage(page);
    const cart = new CartPage(page);
    const { login, password, email } = generateCredentials();

    await test.step("главная → список тарифов → первый тариф в корзину", async () => {
      await home.open();
      await home.addFirstTariffToCart();
      await expect(cart.registerEmail()).toBeVisible({ timeout: 20_000 });
    });

    await test.step("заполнить форму регистрации и отправить", async () => {
      await cart.registerEmail().fill(email);
      await cart.registerUsername().fill(login);
      await cart.registerPassword(0).fill(password);
      await cart.registerPassword(1).fill(password);
      await cart.registerSubmit().click();
    });

    await test.step("принять условия", async () => {
      await cart.termsAcceptButton().click();
    });

    await test.step("пройти шаги оформления (без оплаты)", async () => {
      await cart.clickNextStep();
      await cart.clickNextStep();
    });

    saveCredentials(login, password, email);

    await test.step("регистрация прошла: auth-block закрыт и мы не на /login", async () => {
      await expect(page).not.toHaveURL(/\/login/i);
      expect(await cart.isAuthBlockVisible()).toBe(false);
    });
  });
});
