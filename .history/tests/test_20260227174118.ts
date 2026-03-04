import { test, expect } from "@playwright/test";

test("test", async ({ page }) => {
  await page.goto("https://godlike.host/");
  await page.getByRole("link", { name: "View all plans" }).nth(1).click();
  await page.getByText("Add to Cart").first().click();
  await page.getByText("Login").click();
  await page.getByRole("textbox", { name: "* Email" }).click();
  await page.getByRole("textbox", { name: "* Email" }).click();
  await page.getByRole("textbox", { name: "* Email" }).press("ControlOrMeta+м");
  await page.getByRole("textbox", { name: "* Email" }).click();
  await page.getByRole("textbox", { name: "* Email" }).dblclick();
  await page
    .getByRole("textbox", { name: "* Email" })
    .fill("test@testmail.com");
  await page.getByRole("textbox", { name: "* Email" }).press("ControlOrMeta+a");
  await page.getByRole("textbox", { name: "* Email" }).press("ControlOrMeta+c");
  await page.getByRole("textbox", { name: "* Password" }).click();
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
    .filter({ hasText: "Credit/Debit Card (Stripe)" })
    .getByRole("insertion")
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7553"]')
    .contentFrame()
    .getByRole("textbox", { name: "Номер кредитной или дебетовой карты" })
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7554"]')
    .contentFrame()
    .getByRole("textbox", {
      name: "Окончание срока действия кредитной или дебетовой карты",
    })
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7555"]')
    .contentFrame()
    .getByRole("textbox", { name: "Код CVC/CVV" })
    .click();
  await page.locator("#stripeCreditCard").click();
  await page
    .locator('iframe[name="__privateStripeFrame7553"]')
    .contentFrame()
    .getByRole("textbox", { name: "Номер кредитной или дебетовой карты" })
    .click();
  await page.locator("#stripeExpiryDate").click();
  await page
    .locator('iframe[name="__privateStripeFrame7554"]')
    .contentFrame()
    .getByRole("textbox", {
      name: "Окончание срока действия кредитной или дебетовой карты",
    })
    .click();
  await page.locator("#stripeCvc").click();
  await page
    .locator('iframe[name="__privateStripeFrame7555"]')
    .contentFrame()
    .getByRole("textbox", { name: "Код CVC/CVV" })
    .click();
  await page
    .getByRole("textbox", { name: "Enter a name for this card (" })
    .click();
  await page
    .getByText(
      "Card Number Expiry Date CVV/CVC2 Card NumberExpiry DateCVV/CVC2 Linked Account",
    )
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7553"]')
    .contentFrame()
    .getByRole("textbox", { name: "Номер кредитной или дебетовой карты" })
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7553"]')
    .contentFrame()
    .getByRole("textbox", { name: "Номер кредитной или дебетовой карты" })
    .fill("4242 4242 4242 42422");
  await page
    .locator('iframe[name="__privateStripeFrame7554"]')
    .contentFrame()
    .getByRole("textbox", {
      name: "Окончание срока действия кредитной или дебетовой карты",
    })
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7554"]')
    .contentFrame()
    .getByRole("textbox", {
      name: "Окончание срока действия кредитной или дебетовой карты",
    })
    .fill("12 / 28");
  await page
    .locator('iframe[name="__privateStripeFrame7555"]')
    .contentFrame()
    .getByRole("textbox", { name: "Код CVC/CVV" })
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7555"]')
    .contentFrame()
    .getByRole("textbox", { name: "Код CVC/CVV" })
    .fill("123");
  await page
    .locator('iframe[name="__privateStripeFrame7553"]')
    .contentFrame()
    .getByRole("textbox", { name: "Номер кредитной или дебетовой карты" })
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7553"]')
    .contentFrame()
    .getByRole("textbox", { name: "Номер кредитной или дебетовой карты" })
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7553"]')
    .contentFrame()
    .getByRole("textbox", { name: "Номер кредитной или дебетовой карты" })
    .fill("f");
  await page
    .locator('iframe[name="__privateStripeFrame7553"]')
    .contentFrame()
    .getByRole("textbox", { name: "Номер кредитной или дебетовой карты" })
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7553"]')
    .contentFrame()
    .getByRole("textbox", { name: "Номер кредитной или дебетовой карты" })
    .fill("h");
  await page
    .locator('iframe[name="__privateStripeFrame7554"]')
    .contentFrame()
    .getByRole("textbox", {
      name: "Окончание срока действия кредитной или дебетовой карты",
    })
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7554"]')
    .contentFrame()
    .getByRole("textbox", {
      name: "Окончание срока действия кредитной или дебетовой карты",
    })
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7554"]')
    .contentFrame()
    .getByRole("textbox", {
      name: "Окончание срока действия кредитной или дебетовой карты",
    })
    .fill("h");
  await page
    .locator('iframe[name="__privateStripeFrame7555"]')
    .contentFrame()
    .getByRole("textbox", { name: "Код CVC/CVV" })
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7555"]')
    .contentFrame()
    .getByRole("textbox", { name: "Код CVC/CVV" })
    .fill("12334");
  await page
    .locator('iframe[name="__privateStripeFrame7554"]')
    .contentFrame()
    .getByRole("textbox", {
      name: "Окончание срока действия кредитной или дебетовой карты",
    })
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7554"]')
    .contentFrame()
    .getByRole("textbox", {
      name: "Окончание срока действия кредитной или дебетовой карты",
    })
    .fill("02 / 333");
  await page
    .locator('iframe[name="__privateStripeFrame7553"]')
    .contentFrame()
    .getByRole("textbox", { name: "Номер кредитной или дебетовой карты" })
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7553"]')
    .contentFrame()
    .getByRole("textbox", { name: "Номер кредитной или дебетовой карты" })
    .fill("3333 3333 3333 33333");
  await page
    .locator('iframe[name="__privateStripeFrame7554"]')
    .contentFrame()
    .getByRole("textbox", {
      name: "Окончание срока действия кредитной или дебетовой карты",
    })
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7554"]')
    .contentFrame()
    .getByRole("textbox", {
      name: "Окончание срока действия кредитной или дебетовой карты",
    })
    .click();
  await page
    .locator('iframe[name="__privateStripeFrame7554"]')
    .contentFrame()
    .getByRole("textbox", {
      name: "Окончание срока действия кредитной или дебетовой карты",
    })
    .fill("02 / 11");
});
