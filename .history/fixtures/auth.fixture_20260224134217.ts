import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

type AuthFixtures = {
    loggedInPage: any;
};

export const test = base.extend<AuthFixtures>({
    loggedInPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login('your_email@gmail.com', 'your_password');

    await use(page);
    },
});

export { expect } from '@playwright/test';