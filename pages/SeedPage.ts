/**
 * SeedPage — /minecraft-seeds/sky-haven-island-atm-10-seed/
 *
 * ⚠️ 06-Aug-2026: сид-калькулятор мигрировал с Vuetify `#seed-calculator` на НОВЫЙ Inc 6
 * веб-компонент (открытый Shadow DOM, без Vuetify), как модед-калькулятор. Playwright пробивает
 * открытый shadow обычными CSS-локаторами. Подтверждено live-recon 06-Aug-2026.
 *
 *   .single-seed-calculator                                ← новый корень
 *     [data-vue-app="seed-calculator"][data-config="{JSON}"] ← конфиг (seedId/modpackId/promocode/
 *                                                              discount/cartBaseUrl/gid) в JSON
 *     input[type=range].ui-slider__input#fieldPlayersCount  ← НАТИВНЫЙ слайдер (0..N дискретно)
 *     .ui-slider__tick-label                                ← деления (1-2 … 50+)
 *     button[type=submit].seed-calculator__btn              ← "Host Now" (класс сохранён)
 *     .seed-calculator__plan__title / .seed-calculator__price--current(--old) ← план/цена
 *
 *   button#cartDefaultBtn.single-seed-card__button          ← "BUY A SERVER" (LIGHT DOM)
 *     [data-url="https://godlike.host/cart-seed/?productId=…&seedId=…&modpackId=…"]
 */
import type { Locator } from "@playwright/test";
import { BasePage } from "./BasePage";
import { Urls } from "../fixtures/test-data";
import { PlanCalculator } from "../components/PlanCalculator";

export interface SeedCalculatorMeta {
  cartBaseUrl: string | null;
  modpackId: string | null;
  seedId: string | null;
  promocode: string | null;
  discount: string | null;
}

export class SeedPage extends BasePage {
  readonly calculator = new PlanCalculator(this.page, ".single-seed-calculator");

  async open(): Promise<void> {
    await this.goto(Urls.seedSkyHaven);
    // ⚠️ Новый Inc 6 сид-калькулятор гидрируется ЛЕНИВО (как листинговый NewSeedCalculator):
    // без реального pointer-события обработчики (в т.ч. submit Host Now) не всегда доцепляются,
    // особенно при ПЕРЕоткрытии страницы. Мышь-нудж будит гидрацию. (06-Aug-2026)
    await this.page.mouse.move(400, 400);
    await this.page.mouse.move(650, 480);
    await this.calculator.waitMounted();
    await this.cookieBanner.dismissAll();
  }

  /**
   * Мета калькулятора. ⚠️ 06-Aug-2026: раньше — data-* на корне `#seed-calculator`; теперь конфиг
   * приходит ОДНИМ JSON-блобом в `[data-vue-app="seed-calculator"]` data-config (Inc 6). Парсим его.
   */
  async readCalculatorMeta(): Promise<SeedCalculatorMeta> {
    const raw = await this.page
      .locator('[data-vue-app="seed-calculator"]')
      .first()
      .getAttribute("data-config");
    let cfg: Record<string, unknown> = {};
    try {
      cfg = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    } catch {
      cfg = {};
    }
    const str = (v: unknown): string | null => (v == null ? null : String(v));
    return {
      cartBaseUrl: str(cfg.cartBaseUrl),
      modpackId: str(cfg.modpackId),
      seedId: str(cfg.seedId),
      promocode: str(cfg.promocode),
      discount: str(cfg.discount),
    };
  }

  /** "Host Now" submit button inside the calculator. */
  hostNowSubmit(): Locator {
    return this.calculator
      .root()
      .locator('button[type="submit"].seed-calculator__btn');
  }

  /**
   * Клик «Host Now» (submit формы калькулятора) → переход на /cart-seed.
   * productId в итоговом URL соответствует выбранному слайдером тарифу. Возвращает URL корзины.
   * ⚠️ Дальше воронку/оплату НЕ ведём.
   */
  async hostNowToCartUrl(): Promise<string> {
    await this.settleAfterSliderMove();
    await Promise.all([
      this.page.waitForURL(/\/cart-seed/, { timeout: 30_000 }),
      this.hostNowSubmit().click(),
    ]);
    return this.page.url();
  }

  /**
   * ⚠️ Осадка перед кликом Host Now. Новый Inc 6 сид-калькулятор реактивно пересчитывает цель
   * Host Now ПОСЛЕ сдвига слайдера с задержкой; клик сразу за toMin/toMax часто не даёт навигации
   * (submit обгоняет пересчёт → страница остаётся на сиде). Наблюдение владельца 06-Aug-2026:
   * руками работает, в headless клик слишком быстрый. Санкционированное исключение из
   * no-wait-for-timeout (капризный сторонний виджет; детерминированного сигнала «готов» он не даёт).
   */
  async settleAfterSliderMove(): Promise<void> {
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await this.page.waitForTimeout(800);
  }

  /**
   * Big "BUY A SERVER" card CTA above the calculator.
   * ⚠️ Таргетим по стабильному id `#cartDefaultBtn`, НЕ по `.single-seed-card__button`.first():
   * прод добавил вторую кнопку с тем же классом — «Open in Seed Map»
   * (`.single-seed-card__map-button`, несёт `data-seed-map-url`, БЕЗ `data-url`) — и она идёт в DOM
   * первой, поэтому `.first()` цеплял её → `data-url`=null (регресс, live-recon 22-Jul-2026).
   */
  buyServerButton(): Locator {
    return this.page.locator("#cartDefaultBtn").first();
  }

  /** The cart URL the BUY button will navigate to (read directly from data-url). */
  async buyServerCartUrl(): Promise<string | null> {
    return this.buyServerButton().getAttribute("data-url");
  }

  // ─── image gallery (used for negative selectors only) ─────────────────────

  galleryThumbs(): Locator {
    return this.page.locator(".single-seed-gallery__thumb");
  }

  galleryNext(): Locator {
    return this.page.locator(".single-seed-gallery__arrow--next");
  }
}
