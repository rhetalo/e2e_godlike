/**
 * vps.funnel.helpers.ts
 * ─────────────────────
 * Общие хелперы VPS-воронки, разделяемые между focused-спеками
 * (landing / billing / configure / happy-path). Не спек — Playwright не собирает
 * как тест-файл (нет *.spec.ts). Вся навигация идёт через Page Objects.
 *
 * Воронка: /vps-hosting/ → Deploy Now → /cart-vps/ (Billing) → Configure (step=3) → WHMCS.
 */
import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { VpsPage } from "../../../pages/VpsPage";
import { VpsConfigPage } from "../../../pages/VpsConfigPage";
import { CartBillingPage } from "../../../pages/CartBillingPage";
import { Credentials } from "../../../fixtures/test-data";
import { loginClientareaAndSaveSession } from "../../../utils/clientareaAuth";
import { pinAmplitudeExperiments } from "../../../utils/amplitude";

export const storageStatePath = "storageState.vps.json";

// Воронка свёрстана под desktop; browser.newContext() не наследует test.use({ viewport }).
const DESKTOP_VIEWPORT = { width: 1800, height: 900 };

/** Логин в clientarea → storageState. Вызывается в beforeAll каждого vps.funnel-файла. */
export async function loginVpsSession(browser: Browser): Promise<void> {
  await loginClientareaAndSaveSession(browser, {
    email: Credentials.email,
    password: Credentials.password,
    statePath: storageStatePath,
  });
}

/**
 * Контекст с авторизацией + детерминированным пиннингом A/B Amplitude.
 * Пиннинг убирает плавающую форму URL корзины и flash-sale-баннер (см. utils/amplitude.ts).
 */
export async function newPinnedContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext({
    storageState: storageStatePath,
    viewport: DESKTOP_VIEWPORT,
    deviceScaleFactor: process.env.CI ? 1 : 0.8, // локально 80% — headed-окно влезает на ноут
  });
  await pinAmplitudeExperiments(context);
  return context;
}

/** Число из строки цены — устойчиво к валютам и форматам ("$6,39" → 6.39). */
export function parsePrice(str: string): number {
  const m = str.replace(",", ".").match(/[\d]+(\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
}

/**
 * Deploy Now (первый план) на лендинге → переход в /cart-vps/.
 * productId уходит в URL корзины только ПОСЛЕ клика (кнопки — javascript:void(0)).
 */
export async function deployFirstPlan(page: Page): Promise<void> {
  const vps = new VpsPage(page);
  await vps.goto();
  await expect(vps.firstDeployButton).toBeVisible({ timeout: 15_000 });
  await vps.deployFirstPlan();
}

/** Пройти Deploy → Billing → Next Step до шага Configure (step=3). Возвращает готовый PO. */
export async function goToConfigureStep(page: Page): Promise<VpsConfigPage> {
  await deployFirstPlan(page);
  const cartBilling = new CartBillingPage(page);
  await cartBilling.billing.container.waitFor({ state: "visible", timeout: 15_000 });
  await cartBilling.order.clickNextStep();

  const config = new VpsConfigPage(page);
  await config.waitForConfigureStep();
  return config;
}
