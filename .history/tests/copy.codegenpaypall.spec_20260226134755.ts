import { test, expect } from "@playwright/test";

test("test", async ({ page }) => {
  await page.goto("https://godlike.host/");

  // Переход на второй "View all plans"
  await page.locator('a[href*="plans"]').nth(1).click();

  // Добавление первого плана в корзину
  await page.locator('button[class*="add-to-cart"]').first().click();

  // Логин
  await page.locator('button[class*="login"]').click();
  await page.locator('input[type="email"]').fill("test@testmail.com");
  await page.locator('input[type="password"]').fill("test@testmail.com");
  await page.locator('button[type="submit"]').click();

  // Далее шаги
  const nextStepButtons = page.locator('button[class*="next-step"]');
  await nextStepButtons.nth(0).click();
  await nextStepButtons.nth(1).click();

  // Радиокнопка "Do not apply any credit"
  await page.locator('label[for*="no_credit"]').getByRole("insertion").click();

  // Радиокнопка PayPal
  await page.locator('label[for*="paypal"]').getByRole("insertion").click();

  // Проверка iframe PayPal
  const paypalIframe = page.frameLocator('iframe[name*="paypal_buttons"]');
  await expect(paypalIframe.locator("button")).toBeVisible();
});
