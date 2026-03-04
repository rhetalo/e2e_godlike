import { test as base, expect, Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

type AuthFixtures = {
    loggedInPage: Page;
};

export const test = base.extend<AuthFixtures>({
    loggedInPage: async (
    { page }: { page: Page },   // ← ЯВНО УКАЗЫВАЕМ ТИП
    use
    ) => {

    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login('test@testmail.com', 'test@testmail.com');

    await use(page);
    },
});

export { expect };