import { test, expect } from "../../fixtures/base";
import { Credentials } from "../../fixtures/test-data";
import { CreditBalanceSelector } from "../../components/CreditBalanceSelector";
import { PaymentMethodSelector } from "../../components/PaymentMethodSelector";

test.use({
  viewport: {
    width: 1800,
    height: 900,
  },
  deviceScaleFactor: 1,
});

test("test Stripe and PayPal", async ({ page }) => {
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

  const authForm = page.locator(".auth-block__form");

  await expect(authForm).toBeVisible();

  await page.getByText("Login").click();

  await page
    .getByRole("textbox", { name: "* Email" })
    .fill(Credentials.email);

  await page
    .getByRole("textbox", { name: "* Password" })
    .fill(Credentials.password);

  await page.getByRole("button", { name: "Login" }).click();

  await Promise.all([
    page.waitForURL(/cart\?/),
    page.getByRole("button", { name: "Next step" }).click(),
  ]);

  await expect(
    page.getByRole("heading", { name: "Choose location" }),
  ).toBeVisible({
  timeout: 15000,
});

  await Promise.all([
    page.waitForURL(/cart\?/),
    page.getByRole("button", { name: "Next step" }).click(),
  ]);

  await expect(page).toHaveURL(
    "https://godlike.host/clientarea/cart.php?a=checkout",
  );

  const reviewHeading = page.getByRole("heading", {
    name: "Review & Checkout",
  });

  await expect(reviewHeading).toBeVisible();

  const credit = new CreditBalanceSelector(page);
  await credit.skipCredit();

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
    ).toBeVisible({
      timeout: 15000,
    });
  });

  await test.step("PayPal", async () => {
    const payment = new PaymentMethodSelector(page);

    await payment.selectPayPal();

    const paypalContainer = page.locator(
      "#paypal_ppcpv_input_container_button",
    );

    await expect(paypalContainer).toBeVisible({
      timeout: 20000,
    });

    await expect(paypalContainer).toBeEnabled({
      timeout: 20000,
    });

    const [popup] = await Promise.all([
      page.context()
        .waitForEvent("page", { timeout: 20000 })
        .catch(() => null),

      paypalContainer.click(),
    ]);

    if (popup) {
      await popup.waitForLoadState("domcontentloaded");

      await expect(popup).toHaveURL(
        /paypal\.com|sandbox\.paypal/i,
        {
          timeout: 30000,
        },
      );

      await popup.close();
    } else {
      await expect(page).toHaveURL(
        /paypal\.com|sandbox\.paypal/i,
        {
          timeout: 30000,
        },
      );
    }
  });
});