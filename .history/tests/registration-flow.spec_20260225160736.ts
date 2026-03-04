import { test, expect, Page } from '@playwright/test';
import { generateCredentials, saveCredentials } from '../utils/credentials';

test.describe('Registration flow from tariff', () => {
    test('User can register from tariff checkout',{tag: '@fast'}, async ({ page }: { page: Page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1920, height: 1080 });

    /* ---------- OPEN SITE ---------- */
    await page.goto('https://godlike.host/', {
        waitUntil: 'domcontentloaded'
    });

    /* ---------- VIEW ALL PLANS ---------- */
    const viewAllPlans = page.locator(
        `a[href*="minecraft-java-servers-hosting"], a:has-text("View all plans")`
    ).first();

    await viewAllPlans.waitFor({ state: 'visible' });
    await viewAllPlans.click();

    /* ---------- ADD FIRST TARIFF TO CART ---------- */
    const addToCart = page
        .locator('a.storefront__tariff-action__cart')
        .first();

    await addToCart.waitFor({ state: 'visible' });
    await addToCart.click();

    /* ---------- GENERATE CREDENTIALS ---------- */
    const { login, password, email } = generateCredentials();

    /* ---------- REGISTRATION FORM ---------- */
    await page.locator('input[type="email"]').fill(email);
    await page
        .locator('input[name="username"], input[type="text"]')
        .fill(login);

    const passwords = page.locator('input[type="password"]');
    await passwords.nth(0).fill(password);
    await passwords.nth(1).fill(password);

    await page.locator('button[type="submit"]').click();

    /* ---------- ACCEPT TERMS ---------- */
    const acceptTerms = page.locator(
        'button.terms-modal__actions-accept'
    );

    await acceptTerms.waitFor({ state: 'visible' });
    await acceptTerms.click();

    /* ---------- ORDER STEPS ---------- */
    const nextStep = page.locator(
        'button:has-text("Next step")'
    );

    await nextStep.first().waitFor({ state: 'visible' });
    await nextStep.first().click();
    await nextStep.first().click();

    /* ---------- SAVE CREDS ---------- */
    saveCredentials(login, password, email);

    console.log('Registration complete');
    console.log(login, password, email);

    /* ---------- BASIC ASSERT ---------- */
    await expect(page).not.toHaveURL(/login/i);
    });
});