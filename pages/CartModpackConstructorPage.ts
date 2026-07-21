/**
 * CartModpackConstructorPage — корзина конструктора модпаков (/cart-modpack-constructor/).
 *
 * Vue-приложение монтируется в #app-cart. Внешние данные (URL биллинга, URL панели, ID группы
 * продуктов) приходят через data-* атрибуты корня, НЕ из .env (это и есть суть DEV-315):
 *   data-billing-url / data-panel-url / data-product-group-id.
 *
 * Наполняется только в контексте воронки: конструктор уводит сюда с
 * ?mod_test_session_id=<id>&location_id=<id>. Аноним видит форму login/register; после логина
 * рендерится шаг "Start your modpack trial" с перенесённым конфигом (loader/версия/моды) и
 * тарифом из product group (напр. "4 GB Quadra" ← читается data-product-group-id).
 *
 * Методы — действия/ридеры; assert'ы в спеке. Confirmed live recon 10-Jul-2026.
 */
import type { Locator } from "@playwright/test";
import { BasePage } from "./BasePage";
import { CART_MODPACK_CONSTRUCTOR as SEL } from "../utils/selectors";

export interface CartRootDataset {
  billingUrl?: string;
  panelUrl?: string;
  productGroupId?: string;
}

export class CartModpackConstructorPage extends BasePage {
  private static readonly PATH = "/cart-modpack-constructor/";

  root(): Locator {
    return this.page.locator(SEL.root);
  }

  /** Открыть корзину. query — напр. "?mod_test_session_id=98&location_id=551". */
  async open(query = ""): Promise<void> {
    await this.goto(`${CartModpackConstructorPage.PATH}${query}`);
  }

  /** Прочитать data-* атрибуты корня (доступны даже до монтирования приложения). */
  async rootDataset(): Promise<CartRootDataset> {
    return this.root().evaluate((el) => ({
      billingUrl: (el as HTMLElement).dataset.billingUrl,
      panelUrl: (el as HTMLElement).dataset.panelUrl,
      productGroupId: (el as HTMLElement).dataset.productGroupId,
    }));
  }

  /** Смонтировалось ли Vue-приложение (появился контент внутри #app-cart). */
  async isAppMounted(): Promise<boolean> {
    return (await this.root().evaluate((el) => el.children.length)) > 0;
  }

  isLoginForm(): Locator {
    return this.page.locator(SEL.loginEmail);
  }

  /**
   * Логин в форме корзины (креды — из fixtures/test-data Credentials). Форма login/register —
   * во вкладках; если поле email скрыто (активна вкладка Register), сначала жмём вкладку Login.
   * Дожидается пропадания формы (успешный вход).
   */
  async login(email: string, password: string): Promise<void> {
    const emailInput = this.page.locator(SEL.loginEmail);
    if (!(await emailInput.isVisible().catch(() => false))) {
      await this.root().getByText(/^Login$/i).first().click();
    }
    await emailInput.fill(email);
    await this.page.locator(SEL.loginPassword).fill(password);
    await this.root().getByRole("button", { name: /^Login$/i }).click();
    await emailInput.waitFor({ state: "detached", timeout: 20_000 }).catch(() => {});
  }

  /** Текст шага "Start your modpack trial" (loader/версия/моды/тариф) — для структурных проверок. */
  async summaryText(): Promise<string> {
    return ((await this.root().textContent()) ?? "").replace(/\s+/g, " ").trim();
  }

  /** Кнопка "Start 3-hour demo" на странице триалки (⚠️ оформляет триальную услугу). */
  startTrialButton(): Locator {
    return this.root().getByRole("button", { name: /3-hour demo/i });
  }

  /** Сообщение об уже активной триалке (409 при повторном оформлении). */
  trialAlreadyExistsMessage(): Locator {
    return this.root().getByText(/active trial already exists/i);
  }
}
