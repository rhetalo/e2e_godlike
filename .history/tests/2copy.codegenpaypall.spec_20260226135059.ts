import { test, expect } from "@playwright/test";

test("test", async ({ page }) => {
  await page.goto("https://godlike.host/");
  await page.getByRole("link", { name: "View all plans" }).nth(1).click();
  await page.getByText("Add to Cart").first().click();
  await page.getByText("Login").click();
  await page.getByRole("textbox", { name: "* Email" }).click();
  await page
    .getByRole("textbox", { name: "* Email" })
    .fill("test@testmail.com");
  await page
    .getByRole("textbox", { name: "* Password" })
    .fill("test@testmail.com");
  await page.getByRole("button", { name: "Login" }).click();
  await page.getByRole("button", { name: "Next step" }).click();
  await page.getByRole("button", { name: "Next step" }).click();
  await page
    .locator("label")
    .filter({ hasText: "Do not apply any credit from" })
    .getByRole("insertion")
    .click();
  await page
    .locator("label")
    .filter({ hasText: "PayPal" })
    .getByRole("insertion")
    .click();

  // Проверка iframe PayPal
  const paypalIframe = page.frameLocator('iframe[name*="paypal_buttons"]');
  await expect(paypalIframe.locator("button")).toBeVisible();
});
