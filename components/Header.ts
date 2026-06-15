import { type Page, type Locator } from '@playwright/test';
import { HEADER, LOCALE_SWITCHER } from '../utils/selectors';

/**
 * Header — global site header present on every WordPress-rendered page.
 * Contains logo, main navigation, "Host now" CTA, and admin-panels dropdown.
 * WHY a component: identical DOM across all public pages; reused by every Page Object.
 */
export class Header {
  readonly root: Locator;
  readonly logo: Locator;
  readonly nav: Locator;
  readonly hostNowButton: Locator;
  readonly mobileNav: Locator;

  constructor(private page: Page) {
    this.root = page.locator(HEADER.root);
    this.logo = page.locator(HEADER.logo).first();
    this.nav = page.locator(HEADER.nav);
    this.hostNowButton = page.locator(HEADER.hostNowButton);
    this.mobileNav = page.locator(HEADER.mobileNav).first();
  }

  async clickHostNow(): Promise<void> {
    await this.hostNowButton.click();
  }

  async navigateToGame(gameName: string): Promise<void> {
    await this.nav.locator(HEADER.navItem, { hasText: gameName }).click();
  }

  navItem(label: string): Locator {
    return this.nav.locator(HEADER.navItem, { hasText: label });
  }

  // ── Language & currency switcher (desktop header) ──────────────────────────
  // Язык — навигация на /{code}/; валюта — JS без смены URL (cookie). Список раскрывается по hover.

  get localeTrigger(): Locator {
    return this.page.locator(LOCALE_SWITCHER.trigger).first();
  }
  get currentLang(): Locator {
    return this.page.locator(LOCALE_SWITCHER.currentLang).first();
  }
  get samplePrice(): Locator {
    return this.page.locator(LOCALE_SWITCHER.samplePrice).first();
  }
  /** Ссылка переключения языка (href="/{code}/"). */
  languageLink(code: string): Locator {
    return this.page.locator(LOCALE_SWITCHER.langItem).filter({ hasText: new RegExp(`^${code}$`, 'i') }).first();
  }
  /** Пункт выбора валюты (USD/EUR/GBP/PLN). */
  currencyOption(code: string): Locator {
    return this.page.locator(LOCALE_SWITCHER.currencyItem).filter({ hasText: new RegExp(code, 'i') }).first();
  }
  /** Текст триггера, напр. "en | EUR". */
  async localeText(): Promise<string> {
    return ((await this.localeTrigger.innerText().catch(() => '')) ?? '').trim();
  }
  /** Навести на триггер, чтобы раскрыть выпадающий список языков/валют. */
  async openLocaleMenu(): Promise<void> {
    await this.localeTrigger.hover();
  }
  /**
   * Переключить язык → навигация на /{code}/.
   * ⚠️ Список — hover-оверлей (.lang-list__inner, position:absolute), пункты могут быть за
   * краем вьюпорта → обычный click недоступен. Диспатчим click напрямую на ссылку: браузер
   * фолловит href (подтверждено live-recon 10-Jun). Это бьёт по реальному контролу свитчера.
   */
  async switchLanguage(code: string): Promise<void> {
    await this.languageLink(code).dispatchEvent("click");
  }
  /**
   * Переключить валюту (JS-обработчик <li>, без смены URL).
   * ⚠️ Нюансы (подтверждено live-recon 10-Jun): меняет валюту ТОЛЬКО нативный el.click()
   * (dispatchEvent шлёт untrusted-событие — jQuery игнорирует); открытое меню НЕ требуется
   * (срабатывает и при скрытом списке). Пункты — off-screen overflow, поэтому обычный
   * locator.click() недоступен. Кликаем нативно через page.evaluate по селектору из selectors.ts.
   * Меняет символ/цену + cookie-персист, без смены URL.
   */
  async switchCurrency(code: string): Promise<void> {
    // 1) Реальный hover активирует JS-обработчики свитчера (в headless без предшествующего
    //    hover synthetic click по .currency-item не ловится). waitFor visible = подтверждение,
    //    что :hover зарегистрирован (список раскрылся).
    await this.localeTrigger.hover();
    await this.page
      .locator(LOCALE_SWITCHER.langListInner)
      .first()
      .waitFor({ state: "visible", timeout: 5_000 })
      .catch(() => {});
    // 2) Нативный el.click() по нужной валюте (по тексту, селектор из selectors.ts).
    await this.page.evaluate(
      ({ sel, cur }) => {
        const li = Array.from(document.querySelectorAll(sel)).find((e) =>
          (e.textContent || "").toUpperCase().includes(cur.toUpperCase()),
        );
        (li as HTMLElement | undefined)?.click();
      },
      { sel: LOCALE_SWITCHER.currencyItem, cur: code },
    );
  }
}
