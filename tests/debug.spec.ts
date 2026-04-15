import { test, expect } from "@playwright/test";

test.use({
  viewport: { width: 1800, height: 900 },
  deviceScaleFactor: 1,
});

test("DEBUG checkout page", async ({ page }) => {
  // Воронка
  await page.goto("https://godlike.host");
  await page
    .getByRole("banner")
    .getByRole("link", { name: "Minecraft Server Hosting" })
    .click();
  await expect(page).toHaveURL(/minecraft-java-servers-hosting/i);
  await page.getByText("Add to Cart").first().click();
  await expect(page).toHaveURL(/\/cart\/?/);

  // Авторизация
  await expect(page.locator(".auth-block__form")).toBeVisible();
  await page.getByText("Login").click();
  await page
    .getByRole("textbox", { name: "* Email" })
    .fill("test@testmail.com");
  await page
    .getByRole("textbox", { name: "* Password" })
    .fill("test@testmail.com");
  await page.getByRole("button", { name: "Login" }).click();

  // Локация
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

  // Ждём полной загрузки AJAX (WHMCS грузится долго)
  await page.waitForTimeout(3000);

  // ====== ДИАГНОСТИКА ======

  // 1. Все label с текстом на странице
  const labels = await page.locator("label").allTextContents();
  console.log("\n=== LABELS ON PAGE ===");
  labels.forEach((t, i) => console.log(`[${i}] "${t.trim()}"`));

  // 2. Все input[name="paymentmethod"]
  const paymentInputs = await page.locator('input[name="paymentmethod"]').all();
  console.log("\n=== PAYMENT METHOD INPUTS ===");
  for (const input of paymentInputs) {
    const val = await input.getAttribute("value");
    const id = await input.getAttribute("id");
    console.log(`id="${id}" value="${val}"`);
  }

  // 3. Credit balance inputs
  const creditInputs = await page
    .locator(
      'input[name="applycredit"], #useCreditOnCheckout, #skipCreditOnCheckout',
    )
    .all();
  console.log("\n=== CREDIT BALANCE INPUTS ===");
  for (const inp of creditInputs) {
    const id = await inp.getAttribute("id");
    const name = await inp.getAttribute("name");
    console.log(`id="${id}" name="${name}"`);
  }

  // 4. Все iframe на странице
  const frames = await page.locator("iframe").all();
  console.log("\n=== ALL IFRAMES ===");
  for (const frame of frames) {
    const title = await frame.getAttribute("title");
    const name = await frame.getAttribute("name");
    const src = await frame.getAttribute("src");
    console.log(
      `title="${title}" name="${name}" src="${String(src).substring(0, 60)}"`,
    );
  }

  // 5. Скриншот страницы
  await page.screenshot({ path: "debug-checkout.png", fullPage: true });
  console.log("\n=== Screenshot saved: debug-checkout.png ===");
});
