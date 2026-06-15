/**
 * funnel.cart.paypal.spec.ts
 * ──────────────────────────
 * Воронка game-сервера до страницы оплаты WHMCS (Review & Checkout) и покрытие
 * методов оплаты + кредитного баланса. ⚠️ Финальный «Continue/Pay» НЕ нажимаем —
 * это реальный платёж (см. CLAUDE.md). Реальную оплату за кредиты намеренно тестирует
 * отдельный funnel.with.credit.check.spec.ts (owner-sanctioned).
 *
 * Навигация до checkout вынесена в reachCheckout() и переиспользуется всеми тестами.
 */
import { test, expect, type Page } from "../../fixtures/base";
import { Credentials } from "../../fixtures/test-data";
import { CreditBalanceSelector } from "../../components/CreditBalanceSelector";
import { PaymentMethodSelector } from "../../components/PaymentMethodSelector";
import { CheckoutPage } from "../../pages/CheckoutPage";

test.use({
  viewport: { width: 1800, height: 900 },
  deviceScaleFactor: 1,
});

/**
 * Пройти воронку game-сервера от главной до WHMCS Review & Checkout (логин в корзине).
 * Останавливается на странице оплаты — ничего не оплачивает.
 */
async function reachCheckout(page: Page): Promise<void> {
  await page.goto("https://godlike.host");

  await page
    .getByRole("banner")
    .getByRole("link", { name: "Minecraft Server Hosting" })
    .click();
  await expect(page).toHaveURL(/minecraft-java-servers-hosting/i);

  const orderButton = page.getByText("Add to Cart").first();
  await expect(orderButton).toBeVisible({ timeout: 10000 });
  await orderButton.click();
  await expect(page).toHaveURL(/\/cart\/?/);

  await expect(page.locator(".auth-block__form")).toBeVisible();
  await page.getByText("Login").click();
  await page.getByRole("textbox", { name: "* Email" }).fill(Credentials.email);
  await page.getByRole("textbox", { name: "* Password" }).fill(Credentials.password);
  await page.getByRole("button", { name: "Login" }).click();

  await Promise.all([
    page.waitForURL(/cart\?/),
    page.getByRole("button", { name: "Next step" }).click(),
  ]);
  await expect(page.getByRole("heading", { name: "Choose location" })).toBeVisible({
    timeout: 15000,
  });

  await Promise.all([
    page.waitForURL(/cart\?/),
    page.getByRole("button", { name: "Next step" }).click(),
  ]);
  await expect(page).toHaveURL("https://godlike.host/clientarea/cart.php?a=checkout");
  await expect(page.getByRole("heading", { name: "Review & Checkout" })).toBeVisible();
}

/** Снять кредит-баланс (если переключатель есть), чтобы открылись платёжные шлюзы. */
async function revealGateways(page: Page): Promise<void> {
  const credit = new CreditBalanceSelector(page);
  if (await credit.skipLabel.count()) {
    await credit.skipCredit();
  }
}

test("@critical оплата Stripe и PayPal", async ({ page }) => {
  await reachCheckout(page);
  await revealGateways(page);

  await test.step("Stripe", async () => {
    await page
      .locator("label")
      .filter({ hasText: "Credit/Debit Card (Stripe)" })
      .getByRole("insertion")
      .click();

    await expect(
      page.getByText(
        "Card Number Expiry Date CVV/CVC2 Card NumberExpiry DateCVV/CVC2 Linked Account",
      ),
    ).toBeVisible({ timeout: 15000 });
  });

  await test.step("PayPal", async () => {
    const payment = new PaymentMethodSelector(page);
    await payment.selectPayPal();

    const paypalContainer = page.locator("#paypal_ppcpv_input_container_button");
    await expect(paypalContainer).toBeVisible({ timeout: 20000 });
    await expect(paypalContainer).toBeEnabled({ timeout: 20000 });

    const [popup] = await Promise.all([
      page.context().waitForEvent("page", { timeout: 20000 }).catch(() => null),
      paypalContainer.click(),
    ]);

    if (popup) {
      await popup.waitForLoadState("domcontentloaded");
      await expect(popup).toHaveURL(/paypal\.com|sandbox\.paypal/i, { timeout: 30000 });
      await popup.close();
    } else {
      await expect(page).toHaveURL(/paypal\.com|sandbox\.paypal/i, { timeout: 30000 });
    }
  });
});

test("@regression Crypto (CoinPayments) доступен, методы оплаты переключаются", async ({
  page,
}) => {
  await reachCheckout(page);
  await revealGateways(page);

  const checkout = new CheckoutPage(page);
  const payment = new PaymentMethodSelector(page);

  await test.step("на checkout предложено несколько методов оплаты", async () => {
    // panel__gateway есть (slug-модификаторы в DOM иные, чем в старом доке — не опираемся
    // на них); идентификация метода — по value radio-инпута (надёжно, как для PayPal).
    await expect.poll(() => checkout.gatewayPanels().count()).toBeGreaterThanOrEqual(2);
    await expect(payment.paypalRadio).toHaveCount(1);
  });

  // crypto (CoinPayments) может быть не предложен для конкретного продукта — тогда скип
  test.skip(
    (await payment.cryptoRadio.count()) === 0,
    "CoinPayments-шлюз не предложен для этого заказа",
  );

  await test.step("выбор Crypto отмечает его radio", async () => {
    await payment.selectCrypto();
    await expect(payment.cryptoRadio).toBeChecked();
  });

  await test.step("переключение на PayPal снимает выбор Crypto (взаимоисключение)", async () => {
    await payment.selectPayPal();
    await expect(payment.paypalRadio).toBeChecked();
    await expect(payment.cryptoRadio).not.toBeChecked();
  });
});

test("@regression credit balance: apply скрывает шлюзы, skip — показывает", async ({
  page,
}) => {
  await reachCheckout(page);

  const credit = new CreditBalanceSelector(page);
  const checkout = new CheckoutPage(page);

  test.skip(
    (await credit.skipLabel.count()) === 0,
    "на аккаунте нет кредитного баланса — переключатель не показан",
  );

  await test.step("skip → платёжные шлюзы видны", async () => {
    await credit.skipCredit();
    await expect(checkout.gatewayPanels().first()).toBeVisible();
  });

  await test.step("apply → платёжные шлюзы скрыты (оплата кредитом)", async () => {
    await credit.applyCredit();
    await expect(checkout.gatewayPanels().first()).toBeHidden();
  });
});
