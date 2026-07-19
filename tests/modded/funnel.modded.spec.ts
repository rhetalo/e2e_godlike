/**
 * funnel.modded.spec.ts — воронка покупки modded до страницы оплаты (стоп перед оплатой).
 *
 * (1) Install-кнопка грида → /cart (Vue) → auth (через storageState) → step 2 → Next step
 *     → WHMCS checkout: видны платёжные шлюзы. ⚠ «Continue/Оплатить» НЕ жмём.
 * (2) Host Now калькулятора → /cart-modded-new (новый UI): выбранный тариф доехал.
 *
 * Запуск: npx playwright test tests/modded/funnel.modded.spec.ts --project=storefront
 */
import { test, expect, type Browser, type Page } from "@playwright/test";
import { pinAmplitudeExperiments } from "../../utils/amplitude";
import { ModdedHostingPage } from "../../pages/ModdedHostingPage";
import { CartPage } from "../../pages/CartPage";
import { CartModdedNewPage } from "../../pages/CartModdedNewPage";
import { CheckoutPage } from "../../pages/CheckoutPage";
import { Credentials, VueCartStep2Pattern } from "../../fixtures/test-data";
import { loginClientareaAndSaveSession } from "../../utils/clientareaAuth";

const storageStatePath = "storageState.modded.json";

// Host Now калькулятора ведёт на выделенную корзину /cart-modded-new (новый UI: custom-select
// + "Order Now"), не классический Vue-cart грид-install. Confirmed MCP 13-Jun.
const MODDED_NEW_CART_PRODUCT = /\/cart-modded-new\/?\?[^#]*productId=/;

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginClientareaAndSaveSession(browser, {
    email: Credentials.email,
    password: Credentials.password,
    statePath: storageStatePath,
  });
});

/**
 * Провести корзину за auth-block. Валидная сессия из storageState авто-проскакивает блок прямо
 * на step 2 — СНАЧАЛА даём ей это сделать (ждём step 2). Логинимся вручную ТОЛЬКО если step 2 не
 * достигнут И блок реально держится. Иначе ловим ТРАНЗИЕНТНЫЙ auth-block (он мелькает даже у
 * залогиненного) и зря триггерим fallback-логин — а он падает: вкладка Login детачится из DOM в
 * момент авто-перехода на step 2 (флоки, воспроизводилось ~1 из 4).
 */
async function ensurePastAuthStep(page: Page, cartPage: CartPage): Promise<void> {
  // Валидная сессия авто-проскакивает auth-блок на step2. Ждём ЩЕДРО (30с; было 12с): за это
  // время ТРАНЗИЕНТНЫЙ auth-блок (мелькает даже у залогиненного) давно исчезает, поэтому fallback
  // по нему больше НЕ триггерится — это и флокало (форма детачилась в момент авто-перехода).
  if (await reachedStep2(page, 30_000)) return;

  const authVisible = await cartPage.isAuthBlockVisible();
  // Диагностика для VPS-прогона (локально не воспроизводится): состояние на 30с.
  console.log(`[modded-auth] step2 не достигнут за 30с | authBlockVisible=${authVisible} | url=${page.url()}`);

  // 30с прошло, step2 нет. Если auth-блока НЕ видно — авто-переход ещё в процессе, дожидаемся.
  if (!authVisible) {
    await reachedStep2(page, 15_000);
    return;
  }

  // Настоящий (стойкий) auth-блок → ручной логин. Сначала снимаем flash-sale/промо-оверлей —
  // на свежих (VPS) сессиях он перехватывает клики по форме логина. Не роняем на гонке:
  // авто-проскок мог случиться во время попытки — финально перепроверяем step2.
  await cartPage.cookieBanner.dismissAll().catch(() => {});
  await cartPage.loginAndAwaitStep2(Credentials.email, Credentials.password);
  const onStep2 = await reachedStep2(page, 15_000);
  console.log(`[modded-auth] fallback-логин выполнен | onStep2=${onStep2} | url=${page.url()}`);
  expect(onStep2, `ожидали ?step=2 после fallback-логина (url=${page.url()})`).toBeTruthy();
}

/** waitForURL(step2) → boolean (не бросает). */
function reachedStep2(page: Page, timeout: number): Promise<boolean> {
  return page
    .waitForURL(VueCartStep2Pattern, { timeout })
    .then(() => true)
    .catch(() => false);
}

test.describe("Воронка покупки modded (стоп на странице оплаты)", () => {
  test.setTimeout(180_000);

  test("@critical Install → корзина → step 2 → страница оплаты", async ({ browser }) => {
    const context = await browser.newContext({ storageState: storageStatePath });
    await pinAmplitudeExperiments(context);
    const page = await context.newPage();
    const modded = new ModdedHostingPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);

    try {
      const meta = await test.step("лендинг modded → читаем первую install-кнопку", async () => {
        await modded.open();
        const installBtn = modded.installButtonByIndex(0);
        await expect(installBtn).toBeVisible();
        const m = await modded.readInstallMeta(installBtn);
        expect(m.productId, `productId install-кнопки не число: "${m.productId}"`).toMatch(/^\d+$/);
        expect(m.modpackId, `modpackId пуст на install-кнопке лендинга: "${m.modpackId}"`).toBeTruthy();
        return m;
      });

      await test.step("install → Vue-корзина с тем же productId", async () => {
        const installBtn = modded.installButtonByIndex(0);
        await Promise.all([
          page.waitForURL(/\/cart\?[^#]*productId=/, { timeout: 30_000 }),
          // force: install-кнопка грида — Vue-обработчик, нативный клик не всегда проходит actionability.
          // eslint-disable-next-line playwright/no-force-option
          installBtn.click({ force: true }),
        ]);
        await cartPage.cookieBanner.dismissAll();
        expect(page.url(), `в URL корзины нет productId=${meta.productId}: ${page.url()}`).toContain(
          `productId=${meta.productId}`,
        );
      });

      await test.step("auth-block: авто-проскок сессией, иначе fallback-логин → step 2", async () => {
        await ensurePastAuthStep(page, cartPage);
        await page.waitForURL(VueCartStep2Pattern, { timeout: 30_000 }).catch(() => {});
        await cartPage.cookieBanner.dismissAll();
      });

      await test.step("Next step → WHMCS payment page", async () => {
        await expect(cartPage.nextStepButton()).toBeVisible({ timeout: 15_000 });
        // Идём до payment-URL через все Vue-шаги (billing → Configure/location), не хардкодя
        // их число (между billing и WHMCS появился шаг «Configure your server»).
        await cartPage.advanceToPayment();
        console.log(`[modded] после advanceToPayment | url=${page.url()}`);
      });

      await test.step("на странице оплаты: видны шлюзы; Continue НЕ жмём", async () => {
        expect(checkoutPage.isOnPaymentStep(), `не дошли до payment-URL: ${page.url()}`).toBeTruthy();
        await expect(checkoutPage.reviewHeading()).toBeVisible();
        await expect(checkoutPage.paymentMethodHeading()).toBeVisible();
        expect(
          await checkoutPage.gatewayPanels().count(),
          `нет платёжных шлюзов на ${page.url()}`,
        ).toBeGreaterThanOrEqual(1);

        // SAFETY NET: финальная Continue должна присутствовать, но мы её НЕ жмём.
        const continueBtn = checkoutPage.placeOrderButton();
        if (await continueBtn.count()) {
          await expect(continueBtn.first()).toBeVisible();
        }
        expect(checkoutPage.isOnPaymentStep(), `ушли со страницы оплаты: ${page.url()}`).toBeTruthy();
      });
    } finally {
      await context.close();
    }
  });

  test("@critical Host Now (калькулятор) → /cart-modded-new несёт выбранный тариф", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: storageStatePath });
    await pinAmplitudeExperiments(context);
    const page = await context.newPage();
    const modded = new ModdedHostingPage(page);
    const cartPage = new CartPage(page);
    const newCart = new CartModdedNewPage(page);

    try {
      const calc = await test.step("калькулятор: читаем выбранный тариф + цену", async () => {
        await modded.open();
        const c = await modded.readCalculatorCartParams();
        expect(c.productId, `productId калькулятора не число: "${c.productId}"`).toMatch(/^\d+$/);
        expect(c.modpackId, `modpackId калькулятора пуст: "${c.modpackId}"`).toBeTruthy();
        const price = await modded.readCalculatorPrice();
        expect(price.current, `цена калькулятора не распознана: "${price.current}"`).toMatch(/[€$]\s?\d/);
        return c;
      });

      await test.step("Host Now → /cart-modded-new с тем же productId", async () => {
        await Promise.all([
          page.waitForURL(MODDED_NEW_CART_PRODUCT, { timeout: 30_000 }),
          modded.calculatorCheckoutLink().click(),
        ]);
        await cartPage.cookieBanner.dismissAll();
        const url = new URL(page.url());
        expect(url.pathname, `не /cart-modded-new: ${url.pathname}`).toMatch(/\/cart-modded-new/);
        expect(url.searchParams.get("productId"), `productId в URL ≠ ${calc.productId}`).toBe(calc.productId);
        expect(url.searchParams.get("promo"), `нет promo в URL: ${page.url()}`).toBeTruthy();
      });

      await test.step("новый UI корзины смонтировался (план-селект + Order Now)", async () => {
        // /cart-modded-new — новый UI (custom-select + Order Now), не классический Vue-cart.
        // Доезд до payment здесь вне рамок (платёж покрыт install-тестом выше). ⚠ Order Now НЕ жмём.
        await newCart.waitReady();
        await expect(newCart.orderButton()).toBeVisible({ timeout: 15_000 });
      });
    } finally {
      await context.close();
    }
  });
});
