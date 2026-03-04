import {test, expect} from '@playwright/test';

test.use({
    viewport: {
        width: 1800, height: 900,
    },
    deviceScaleFactor: 1,

})

test('test base funnel', async ({page}) => {
    await page.goto('https://godlike.host');

    await page
        .getByRole('banner')
        .getByRole('link', {name: 'Minecraft Server Hosting'})
        .click();

    await expect(page).toHaveURL(/minecraft-java-servers-hosting/i);

    const orderButton = page.getByText('Add to Cart').first();
    await expect(orderButton).toBeVisible({ timeout: 10000 });

    await orderButton.click();

    await expect(page).toHaveURL(/\/cart\/?/);

    const authForm = page.locator('.auth-block__form');

    await expect(authForm).toBeVisible();

    await page.getByText('Login').click();

    await page.getByRole('textbox', { name: '* Email' }).fill('fongolcs@gmail.com');
    await page.getByRole('textbox', { name: '* Password' }).fill('Password_123');
    await page.getByRole('button', { name: 'Login' }).click();

    await page.getByRole('button', { name: 'Next step' }).click();
    await page.getByRole('heading', { name: 'Choose location' })

    await page.getByRole('button', { name: 'Next step' }).click();

    await expect(page).toHaveURL('https://godlike.host/clientarea/cart.php?a=checkout');

    const reviewHeading = page.getByRole('heading', { name: 'Review & Checkout' });
    await expect(reviewHeading).toBeVisible();
});


test('check old funnel redirect', async ({page}) => {
    await page.goto('https://godlike.host/clientarea/cart.php?a=add&pid=341&billingcycle=monthly&currency=1&language=english&promocode=VANILLA20');


    await expect(page).toHaveURL('https://godlike.host/');
})