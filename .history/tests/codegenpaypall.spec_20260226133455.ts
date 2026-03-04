import { test, expect } from "@playwright/test";

test("test", async ({ page }) => {
  await page.goto("https://godlike.host/");

  // Переход на MINECRAFT‑тарифы по href, а не по тексту
  await page
    .locator('a[href*="minecraft-java-servers-hosting"]')
    .nth(1)
    .click();

  // Кнопка "Add to Cart" можно оставить как есть,
  // либо, если есть стабильный класс/атрибут, заменить, например:
  // await page.locator('button.btn-cart, a.btn-cart').first().click();
  await page.getByText("Add to Cart").first().click();

  await page.getByText("Login").click();
  await page
    .getByRole("textbox", { name: "* Email" })
    .fill("test@testmail.com");
  await page
    .getByRole("textbox", { name: "* Password" })
    .fill("test@testmail.com");
  await page.getByRole("button", { name: "Login" }).click();
  await page.getByRole("button", { name: "Next step" }).click();
  await page.getByRole("button", { name: "Next step" }).click();

  // ВМЕСТО кликов по label c текстом и поиска внутри iframe по "Pay with "
  // используем те же универсальные локаторы, что и в основном paypass‑тесте:

  // Все радиобаттоны способа оплаты (iCheck)
  const paymentRadios = page.locator("ins.iCheck-helper");
  const radiosCount = await paymentRadios.count();
  expect(radiosCount).toBeGreaterThan(1);

  // Выбираем второй вариант (PayPal)
  await paymentRadios.nth(1).click();

  // Универсальный локатор PayPal‑кнопки по aria‑label (без текста на самой кнопке)
  const paypalButton = page.locator('div.paypal-button[aria-label*="PayPal"]');
  await expect(paypalButton).toBeVisible({ timeout: 15000 });
});
