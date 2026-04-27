import { test, expect } from "../fixtures/pages";
import { users, urls } from "../fixtures/testData";

const BILLING_LOGIN = process.env.BILLING_LOGIN_URL ?? urls.billing;

test.describe('Authentication on Billing Panel @regression', () => {
  test('login form is reachable and shows email + password inputs', async ({ loginPage, page }) => {
    await loginPage.open(BILLING_LOGIN);
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('positive: valid credentials authenticate the user', async ({ loginPage, page }) => {
    await loginPage.open(BILLING_LOGIN);
    await loginPage.login(users.valid.email, users.valid.password);
    await expect(page).not.toHaveURL(/login/i, { timeout: 15000 });
  });

  test('negative: invalid credentials show error', async ({ loginPage }) => {
    await loginPage.open(BILLING_LOGIN);
    await loginPage.login(users.invalid.email, users.invalid.password);
    await loginPage.assertError();
  });
});
