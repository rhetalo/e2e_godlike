import { test, expect } from "@playwright/test";
import { CreditBalanceSelector } from "../components/CreditBalanceSelector";
import { PaymentMethodSelector } from "../components/PaymentMethodSelector";

test.use({
  viewport: { width: 1800, height: 900 },
  deviceScaleFactor: 1,
});

test("PayPal redirect", async ({ page }) => {
  // — Воронка до чекаута —
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

  // — Авторизация —
  await expect(page.locator(".auth-block__form")).toBeVisible();
  await page.getByText("Login").click();
  await page
    .getByRole("textbox", { name: "* Email" })
    .fill("test@testmail.com");
  await page
    .getByRole("textbox", { name: "* Password" })
    .fill("test@testmail.com");
  await page.getByRole("button", { name: "Login" }).click();

  // — Локация и переход на чекаут —
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(
    page.getByRole("heading", { name: "Choose location" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page).toHaveURL(
    "https://godlike.host/clientarea/cart.php?a=checkout",
  );
  await expect(
    page.getByRole("heading", { name: "Review & Checkout" }),
  ).toBeVisible();

  // — Выбор метода оплаты (iCheck через Page Objects) —
  const credit = new CreditBalanceSelector(page);
  await credit.skipCredit(); // обязательно перед выбором gateway

  const payment = new PaymentMethodSelector(page);
  await payment.selectPayPal();

  // — Проверка что PayPal-контейнер появился —
  await expect(
    page.locator("#paypal_ppcpv_input_container_button"),
  ).toBeVisible({ timeout: 10000 });

  // PayPal SDK рендерит кнопку внутри iframe
  const paypalFrame = page.frameLocator('iframe[title*="PayPal"]');
  const paypalButton = paypalFrame
    .locator('[role="button"], .paypal-button, button')
    .first();

  await expect(paypalButton).toBeVisible({ timeout: 10000 });

  // — Клик и проверка редиректа на paypal.com —
  const [newPage] = await Promise.all([
    page
      .context()
      .waitForEvent("page", { timeout: 15000 })
      .catch(() => null),
    page
      .waitForURL(/paypal\.com/, { timeout: 15000, waitUntil: "commit" })
      .catch(() => null),
    paypalButton.click(),
  ]);

  if (newPage) {
    // PayPal открылся в новой вкладке
    await expect(newPage).toHaveURL(/paypal\.com/);
    await newPage.close();
  } else {
    // PayPal открылся в той же вкладке
    expect(page.url()).toMatch(/paypal\.com|sandbox\.paypal/);
  }
});
