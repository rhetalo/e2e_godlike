import {test, expect} from '../../fixtures/base';
import { Credentials } from '../../fixtures/test-data';

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

    await page.getByRole('textbox', { name: '* Email' }).fill(Credentials.email);
    await page.getByRole('textbox', { name: '* Password' }).fill(Credentials.password);
    // Ищем кнопку "Login" по роли 'button' и тексту 'Login'
  // .click() - выполняем клик для отправки формы авторизации
  // После этого система должна проверить credentials и войти в аккаунт
  await page.getByRole("button", { name: "Login" }).click();

  // ШАГ 8: Переход на следующий шаг (выбор локации сервера)
  // После успешной авторизации пользователь перенаправляется на страницу настройки заказа
  // Там нужно будет выбрать различные параметры: локацию, количество слотов и т.д.
  // Нажимаем кнопку "Next step" (Следующий шаг) для перехода к выбору локации
  await Promise.all([
  page.waitForURL(/cart\?/),
  page.getByRole('button', { name: 'Next step' }).click(),
]);

  // ПРОВЕРКА 5: Проверка заголовка "Choose location" (Выберите локацию)
  // page.getByRole('heading', { name: 'Choose location' }) - ищет заголовок (h1-h6) с текстом "Choose location"
  // getByRole('heading') - ищет элементы с ролью heading (любого уровня h1-h6)
  // Заголовок подтверждает, что мы перешли на этап выбора локации сервера
  // Примечание: здесь нет await expect().toBeVisible(), поэтому проверка может быть нестрогой
  // (это скорее "подтверждение", чем обязательная проверка)
  await expect(
  page.getByRole('heading', { name: 'Choose location' })
).toBeVisible();

  // ШАГ 9: Повторный клик по "Next step" для подтверждения выбора локации
  // После выбора локации (или оставления значений по умолчанию) переходим к следующему шагу
  // Обычно на этом этапе выбирается локация сервера (например, Germany, USA, Russia)
  await Promise.all([
  page.waitForURL(/cart\?/),
  page.getByRole('button', { name: 'Next step' }).click(),
]);

  // ПРОВЕРКА 6: Проверка финального URL после прохождения всех шагов настройки
  // После выбора локации пользователь должен оказаться на странице оформления заказа
  // Страница checkout - это последний этап перед оплатой
  await expect(page).toHaveURL('https://godlike.host/clientarea/cart.php?a=checkout');

  // ШАГ 10: Поиск заголовка "Review & Checkout" (Проверка и оформление)
  // page.getByRole('heading', { name: 'Review & Checkout' }) - ищет заголовок страницы
  // Это последний этап воронки - страница с обзором заказа перед оплатой
  // Здесь пользователь может проверить свой заказ: выбранный тариф, локацию, цену
  const reviewHeading = page.getByRole("heading", {
    name: "Review & Checkout",
  });

  // ПРОВЕРКА 7: Финальная проверка - заголовок "Review & Checkout" должен быть видим
  // Это подтверждает, что весь путь воронки пройден успешно
  // Если мы видим этот заголовок - заказ оформлен и готов к оплате
  await expect(reviewHeading).toBeVisible();
});


test('check old funnel redirect', async ({page}) => {
    await page.goto('https://godlike.host/clientarea/cart.php?a=add&pid=341&billingcycle=monthly&currency=1&language=english&promocode=VANILLA20');


    await expect(page).toHaveURL('https://godlike.host/');
})