import { test, expect } from "@playwright/test";
import { CreditBalanceSelector } from "../components/CreditBalanceSelector";
import { PaymentMethodSelector } from "../components/PaymentMethodSelector";
import { stripeCardFrame, waitForStripeFrames } from "../utils/iframe-helper";
test.use({
  // viewport - определяет размеры окна браузера при выполнении теста
  // width: 1800, height: 900 - ширина и высота окна в пикселях
  // Большой размер экрана позволяет видеть больше элементов и избежать проблем с адаптивностью
  // (некоторые элементы могут быть скрыты на маленьких экранах)
  viewport: {
    width: 1800,
    height: 900,
  },
  // deviceScaleFactor - определяет плотность пикселей устройства
  // 1 - стандартная плотность (обычные мониторы)
  // 2 - Retina дисплеи (экраны Apple с высокой плотностью пикселей)
  // Это влияет на то, как элементы отображаются и тестируются
  deviceScaleFactor: 1,
});
test("test Credit/Debit Card", async ({ page }) => {
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

  // Auth — твоя логика, не трогаем
  await expect(page.locator(".auth-block__form")).toBeVisible();
  await page.getByText("Login").click();
  await page
    .getByRole("textbox", { name: "* Email" })
    .fill("test@testmail.com");
  await page
    .getByRole("textbox", { name: "* Password" })
    .fill("test@testmail.com");
  await page.getByRole("button", { name: "Login" }).click();

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

  // Page Objects заменяют хрупкие inline-селекторы
  const credit = new CreditBalanceSelector(page);
  await credit.skipCredit(); // "Do not apply any credit"

  const payment = new PaymentMethodSelector(page);
  await payment.selectStripe(); // "Godlike Stripe"

  // Stripe iframe — правильный способ
  await waitForStripeFrames(page);
  const cardFrame = stripeCardFrame(page);
  await expect(cardFrame.locator("input")).toBeVisible({ timeout: 15000 });
});
