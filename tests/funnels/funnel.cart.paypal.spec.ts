/**
 * funnel.cart.paypal.spec.ts
 * ──────────────────────────
 * Воронка game-сервера до WHMCS Review & Checkout + покрытие методов оплаты и кредитного
 * баланса. ⚠️ Финальный «Continue/Pay» НЕ нажимаем — это реальный платёж. Реальную оплату
 * кредитами намеренно тестирует funnel.with.credit.check.spec.ts (owner-sanctioned).
 *
 * Навигация до checkout — reachCheckout() через page objects (StorefrontHomePage/CartPage).
 */
import { test, expect, type Page } from "../../fixtures/base";
import { StorefrontHomePage } from "../../pages/StorefrontHomePage";
import { CartPage } from "../../pages/CartPage";
import { CheckoutPage } from "../../pages/CheckoutPage";
import { CreditBalanceSelector } from "../../components/CreditBalanceSelector";
import { PaymentMethodSelector } from "../../components/PaymentMethodSelector";
import { CHECKOUT } from "../../utils/selectors";

test.use({ viewport: { width: 1800, height: 900 }, deviceScaleFactor: 1 });

/**
 * Пройти воронку game-сервера от главной до WHMCS Review & Checkout (логин в корзине).
 * Останавливается на странице оплаты — ничего не оплачивает.
 */
async function reachCheckout(page: Page): Promise<void> {
  const home = new StorefrontHomePage(page);
  const cart = new CartPage(page);
  const checkout = new CheckoutPage(page);

  await home.open();
  await home.addFirstTariffToCart();
  await expect(page).toHaveURL(/\/cart\/?/);

  // DEV-402: класс блока авторизации зависит от корзины — спрашиваем page object.
  await expect.poll(() => cart.isAuthBlockVisible(), { timeout: 20_000 }).toBe(true);
  const advanced = await cart.loginAndAwaitStep2();
  expect(advanced, "ожидали переход на step 2 после логина").toBeTruthy();

  // Идём до WHMCS-оплаты через все Vue-шаги (billing → Configure/location), не хардкодя их число.
  await cart.advanceToPayment();
  await expect(page).toHaveURL(/\/clientarea\/cart\.php\?a=checkout/);
  await expect(checkout.reviewHeading()).toBeVisible();
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
  const payment = new PaymentMethodSelector(page);

  await test.step("Stripe — поля карты рендерятся", async () => {
    await payment.selectStripe();
    // Стабильная проверка вместо хрупкого конкатенированного текста полей: контейнер Stripe
    // Elements + iframe поля номера карты (по title, без random-хешей; см. iframe-helper).
    await expect(page.locator(CHECKOUT.stripeElementsContainer)).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(CHECKOUT.stripeCardIframe)).toBeVisible({ timeout: 15_000 });
  });

  await test.step("PayPal — шлюз предложен, выбирается, SDK-кнопка рендерится", async () => {
    // Детерминированная «наша» часть: PayPal-шлюз доступен, radio выбирается, контейнер SDK
    // отрендерился. Реальный редирект на paypal.com (popup) — внешняя территория PayPal,
    // нестабилен в headless/CI → вынесен в отдельный only_local-тест ниже.
    await payment.selectPayPal();
    await expect(payment.paypalRadio).toBeChecked();

    const paypalContainer = page.locator(CHECKOUT.paypalContainer);
    await expect(paypalContainer).toBeVisible({ timeout: 20_000 });
    await expect(paypalContainer).toBeEnabled({ timeout: 20_000 });
  });
});

/**
 * ЛОКАЛЬНАЯ проверка реального редиректа на paypal.com (НЕ для CI).
 * PayPal Smart Button открывает popup/редирект только в живом браузере; в headless с
 * датацентрового IP SDK ведёт себя недетерминированно (popup не открывается / детект
 * автоматизации). Гоняется ТОЛЬКО при RUN_LOCAL_ONLY=1 (локально, вручную); на push/CI/VPS-cron —
 * пропускается. Опт-ин флаг, а не CI: VPS-cron НЕ выставляет CI=true, на него полагаться нельзя.
 */
test("only_local PayPal popup открывает paypal.com (не оплачиваем)", async ({ page }) => {
  test.skip(
    !process.env.RUN_LOCAL_ONLY,
    "only-local: гоняется ТОЛЬКО при RUN_LOCAL_ONLY=1 (локально); на push/CI/VPS-cron — пропускается",
  );

  await reachCheckout(page);
  await revealGateways(page);
  const payment = new PaymentMethodSelector(page);

  await payment.selectPayPal();
  const paypalContainer = page.locator(CHECKOUT.paypalContainer);
  await expect(paypalContainer).toBeVisible({ timeout: 20_000 });
  await expect(paypalContainer).toBeEnabled({ timeout: 20_000 });

  const [popup] = await Promise.all([
    page.context().waitForEvent("page", { timeout: 20_000 }).catch(() => null),
    paypalContainer.click(),
  ]);

  if (popup) {
    await popup.waitForLoadState("domcontentloaded");
    await expect(popup).toHaveURL(/paypal\.com|sandbox\.paypal/i, { timeout: 30_000 });
    await popup.close();
  } else {
    await expect(page).toHaveURL(/paypal\.com|sandbox\.paypal/i, { timeout: 30_000 });
  }
});

test("@regression Crypto (CoinPayments) доступен, методы оплаты переключаются", async ({
  page,
}) => {
  await reachCheckout(page);
  await revealGateways(page);

  const checkout = new CheckoutPage(page);
  const payment = new PaymentMethodSelector(page);

  await test.step("на checkout предложено несколько методов оплаты", async () => {
    // Идентификация метода — по value radio-инпута (надёжно; slug-классы panel__gateway плавают).
    await expect.poll(() => checkout.gatewayPanels().count()).toBeGreaterThanOrEqual(2);
    await expect(payment.paypalRadio).toHaveCount(1);
  });

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
