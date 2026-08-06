/**
 * ModdedHostingPage — /modded-minecraft-server-hosting/
 *
 * ⚠️ 23-Jul-2026: калькулятор мигрировал на НОВЫЙ веб-компонент `<plan-calculator-widget>`
 * (Inc 6, открытый Shadow DOM, без Vuetify). Playwright пробивает открытый shadow обычными
 * CSS-локаторами, поэтому селекторы ниже указываем через корень `#plan-calculator`.
 * Подтверждено live DOM recon 23-Jul-2026.
 *
 *   #plan-calculator > plan-calculator-widget#shadow      ← новый виджет (Shadow DOM)
 *     .ui-autocomplete__trigger                           ← модпак (combobox); опции .ui-autocomplete__option
 *     .ui-select__trigger                                 ← версия модпака (combobox)
 *     #planCalculatorFieldPlayersCount                    ← скрытый numeric input (сохранился в shadow)
 *     input[type=range].ui-slider__input                  ← НАТИВНЫЙ слайдер (0..N дискретно)
 *     .ui-button--chip                                    ← quick-pick модпаки (ATM 10, BMC 4, …)
 *     button.plan-calculator__checkout__button[data-cart-url]  ← "Host Now" → /cart-modded-new/?… (06-Aug: был <a href>, стал <button data-cart-url>)
 *     .plan-calculator__pricing__price__value(--old)      ← цена (классы сохранены)
 *
 *   button.modpacks-body__install                         ← grid install buttons (LIGHT DOM, не менялись)
 *     [data-product-id], [data-modpack-id], [data-promo]
 *
 * Quick-pick pills are: "ATM 10", "BMC 4", "Prominence II", "RLCraft", "ATMons".
 */
import type { Locator } from "@playwright/test";
import { BasePage } from "./BasePage";
import { Urls, type QuickPickModpack } from "../fixtures/test-data";
import { PlanCalculator } from "../components/PlanCalculator";

export interface InstallButtonMeta {
  productId: string | null;
  modpackId: string | null;
  promo: string | null;
}

export interface CalculatorCartParams {
  productId: string | null;
  modpackId: string | null;
  billingCycle: string | null;
  promo: string | null;
  discount: string | null;
  /** Full href (relative path + querystring) of the calculator's checkout link. */
  href: string;
}

export class ModdedHostingPage extends BasePage {
  readonly calculator = new PlanCalculator(this.page, "#plan-calculator");

  async open(): Promise<void> {
    await this.goto(Urls.moddedHosting);
    await this.calculator.waitMounted();
    // Re-dismiss the flash-sale modal once Vue has rendered (it appears late).
    await this.cookieBanner.dismissAll();
  }

  // ─── calculator ────────────────────────────────────────────────────────────

  modpackInput(): Locator {
    // Новый виджет: combobox-триггер модпака (в Shadow DOM, пробивается через корень).
    return this.calculator.root().locator(".ui-autocomplete__trigger").first();
  }

  modpackVersionInput(): Locator {
    // Новый виджет: combobox-триггер версии модпака.
    return this.calculator.root().locator(".ui-select__trigger").first();
  }

  /** Hidden players-count input (in sync with the slider). */
  playersHiddenInput(): Locator {
    return this.page.locator("#planCalculatorFieldPlayersCount");
  }

  /** Quick-pick chip buttons (e.g. "ATM 10") — новый виджет: .ui-button--chip. */
  quickPickButton(name: QuickPickModpack | string): Locator {
    return this.calculator
      .root()
      .locator(".ui-button--chip", { hasText: name })
      .first();
  }

  /**
   * The calculator's "Host Now" CTA. Синхронна выбору (слайдер/модпак/версия) — чтение её
   * URL корзины самый надёжный способ проверить состояние калькулятора.
   * ⚠️ 06-Aug-2026: прод сменил CTA с `<a href>` на `<button data-cart-url>` (тег + атрибут).
   * Селектор tag-agnostic (`.plan-calculator__checkout__button`), URL берём из `data-cart-url`.
   * Кнопка появляется чуть позже слайдера (после billing-запроса) — getAttribute авто-ждёт её.
   */
  calculatorCheckoutLink(): Locator {
    return this.calculator
      .root()
      .locator(".plan-calculator__checkout__button")
      .first();
  }

  /** Parse the calculator's checkout cart URL (data-cart-url) into typed params. */
  async readCalculatorCartParams(): Promise<CalculatorCartParams> {
    const cartUrl = await this.calculatorCheckoutLink().getAttribute("data-cart-url");
    if (!cartUrl) {
      throw new Error("calculator checkout button has no data-cart-url");
    }
    const url = new URL(cartUrl, "https://godlike.host");
    const get = (k: string) => url.searchParams.get(k);
    return {
      productId: get("productId"),
      modpackId: get("modpackId"),
      billingCycle: get("billingCycle"),
      promo: get("promo"),
      discount: get("discount"),
      href: cartUrl,
    };
  }

  /**
   * Цена, отображаемая калькулятором (со скидкой / старая). Confirmed MCP recon 13-Jun-2026:
   * .plan-calculator__pricing__price__value (текущая) и …--old (зачёркнутая).
   */
  async readCalculatorPrice(): Promise<{ current: string; old: string }> {
    const root = this.calculator.root();
    const text = async (sel: string) =>
      ((await root.locator(sel).first().textContent()) ?? "").trim();
    return {
      current: await text(".plan-calculator__pricing__price__value"),
      old: await text(".plan-calculator__pricing__price__value--old"),
    };
  }

  /** Open the modpack autocomplete and return the visible option titles. */
  async listModpackOptions(limit = 10): Promise<string[]> {
    await this.modpackInput().click();
    const options = this.calculator.root().locator(".ui-autocomplete__option");
    await options.first().waitFor({ state: "visible", timeout: 15_000 });
    return options.evaluateAll(
      (nodes, n) => nodes.slice(0, n).map((el) => (el.textContent || "").trim()),
      limit,
    );
  }

  // ─── modpack grid ──────────────────────────────────────────────────────────

  installButtons(): Locator {
    return this.page.locator("button.modpacks-body__install");
  }

  installButtonByIndex(index: number): Locator {
    return this.installButtons().nth(index);
  }

  async readInstallMeta(button: Locator): Promise<InstallButtonMeta> {
    return {
      productId: await button.getAttribute("data-product-id"),
      modpackId: await button.getAttribute("data-modpack-id"),
      promo: await button.getAttribute("data-promo"),
    };
  }
}
