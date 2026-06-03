import { test, expect, Page } from '../../fixtures/base';
import { generateCredentials, saveCredentials } from '../../utils/credentials';

test.describe('Регистрация из тарифа', () => {
    test('Пользователь может зарегистрироваться при оформлении тарифа',{tag: '@fast'}, async ({ page }: { page: Page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1920, height: 1080 });

    /* ---------- Открыть сайт ---------- */
    await page.goto('https://godlike.host/', {
        waitUntil: 'domcontentloaded'
    });

    /* ---------- Перейти к списку тарифов ---------- */
    const viewAllPlans = page.locator(
        `a[href*="minecraft-java-servers-hosting"], a:has-text("View all plans")`
    ).first();

    await viewAllPlans.waitFor({ state: 'visible' });
    await viewAllPlans.click();

    /* ---------- Добавить первый тариф в корзину ---------- */
    const addToCart = page
        .locator('a.storefront__tariff-action__cart')
        .first();

    await addToCart.waitFor({ state: 'visible' });
    await addToCart.click();

    /* ---------- Сгенерировать учётные данные ---------- */
    const { login, password, email } = generateCredentials();

    /* ---------- Форма регистрации ---------- */
    await page.locator('input[type="email"]').fill(email);
    await page
        .locator('input[name="username"], input[type="text"]')
        .fill(login);

    const passwords = page.locator('input[type="password"]');
    await passwords.nth(0).fill(password);
    await passwords.nth(1).fill(password);

    await page.locator('button[type="submit"]').click();

    /* ---------- Принять условия ---------- */
    const acceptTerms = page.locator(
        'button.terms-modal__actions-accept'
    );

    await acceptTerms.waitFor({ state: 'visible' });
    await acceptTerms.click();

    /* ---------- Шаги оформления заказа ---------- */
    const nextStep = page.locator(
        'button:has-text("Next step")'
    );

    await nextStep.first().waitFor({ state: 'visible' });
    await nextStep.first().click();
    await nextStep.first().click();

    /* ---------- Сохранить учётные данные ---------- */
    saveCredentials(login, password, email);

    console.log('Registration complete');
    console.log(login, password, email);

    /* ---------- Базовая проверка ---------- */
    await expect(page).not.toHaveURL(/login/i);
    });
});