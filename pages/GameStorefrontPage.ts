/**
 * GameStorefrontPage — каталог игровых серверов (/game-servers-en/) и страница тарифов
 * конкретной игры.
 *
 * Инкапсулирует навигацию + прокликивание тарифов с чтением результата промокода —
 * раньше эти ~180 строк дублировались в games.valid.promo и games.invalid.promo.
 * Возвращает СЫРЫЕ результаты; вердикт (valid/invalid по логину) принимает спек.
 * Селекторы — из selectors.ts. Assert'ов нет (ожидания — через waitFor).
 */
import type { Locator } from "@playwright/test";
import { BasePage } from "./BasePage";
import { STOREFRONT, FUNNEL } from "../utils/selectors";
import { Urls } from "../fixtures/test-data";

/** Игра из fixtures/games.json: имя карточки в каталоге + URL её лендинга. */
export interface GameRef {
  name: string;
  landing: string;
}

/**
 * Билинг-период для чтения промокода:
 *  - "monthly"  — 1 месяц (дефолт после Add to Cart). Здесь для ВСЕХ действует акция MONTHLY75.
 *  - "longTerm" — 3 месяца. Акции нет → дефолтный одноразовый промо (VANILLA20); его валидность
 *                 зависит от аккаунта (свежий/израсходованный) и игры (games.json expectPromoValid).
 */
export type PromoPeriod = "monthly" | "longTerm";

export interface TariffPromoResult {
  title: string;
  /** Промо принято бекендом и дало ненулевую скидку. */
  activated: boolean;
  /** Вердикт для отчёта: «VANILLA30: already_used» / «MONTHLY75: 75%». */
  text: string;
}

export class GameStorefrontPage extends BasePage {
  async open(): Promise<void> {
    await this.goto(Urls.gameServers);
  }

  gameLink(name: string): Locator {
    return this.page
      .locator(STOREFRONT.gameTitle)
      .filter({ hasText: new RegExp(`^${name}$`) })
      .first();
  }

  /**
   * Открыть лендинг игры, прокликать каждый тариф с «Add to Cart» и прочитать, применилась
   * ли скидка на выбранном периоде. Между тарифами возвращается на лендинг.
   * `period="longTerm"` переключает воронку на 3 месяца (вне акции) перед чтением.
   * ОДНО чтение на тариф (не дубль) — держим скорость в бюджете таймаута теста.
   * Вердикт (должна/не должна быть скидка) — на стороне спека.
   *
   * DEV-402: лендинг открываем прямым URL из fixtures/games.json, а не кликом по карточке
   * каталога. Карточка туда больше не ведёт: у неё нет href, остался только onclick в
   * воронку (`window.location.href='/cart-game-servers/?productId=…'`), поэтому и клик
   * уходил мимо тарифов, и getAttribute("href") возвращал null.
   */
  async collectTariffPromoResults(
    game: GameRef,
    period: PromoPeriod = "monthly",
  ): Promise<TariffPromoResult[]> {
    const gamePageUrl = game.landing || Urls.gameServers;
    await this.goto(gamePageUrl);

    const cards = this.page.locator(STOREFRONT.tariffCard);
    await cards.first().waitFor({ state: "visible", timeout: 60_000 });

    // Собираем тарифы с кнопкой Add to Cart (+ заголовок для отчёта)
    const all = await cards.all();
    const targets: { btn: Locator; title: string }[] = [];
    for (let i = 0; i < all.length; i++) {
      const addBtn = all[i].locator(`${STOREFRONT.tariffAddToCart}:has-text("Add to Cart")`);
      if ((await addBtn.count()) > 0) {
        const titleText = (
          await all[i].locator(STOREFRONT.tariffTitle).textContent().catch(() => null)
        )?.trim();
        targets.push({ btn: addBtn.first(), title: titleText || `#${i + 1}` });
      }
    }

    const results: TariffPromoResult[] = [];
    for (const { btn, title } of targets) {
      await btn.scrollIntoViewIfNeeded();
      // Слушатель ставим ДО клика: воронка валидирует промо сразу после перехода, и
      // ответ прилетает раньше, чем мы успели бы начать его ждать.
      const verdict = this.promoVerdict();
      await btn.click();

      // longTerm → уводим воронку с акционного monthly на 3 месяца: акции MONTHLY75 там
      // нет, значит остаётся дефолтный одноразовый промо — его и проверяет invalid-спек.
      if (period === "longTerm") {
        await this.selectCartPeriod(LONG_TERM_PERIOD_LABEL);
      }
      results.push({ title, ...(await verdict) });

      await this.page.goto(gamePageUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    }

    return results;
  }

  /**
   * Вердикт по промокоду — из ответа бекенда, а не из вёрстки.
   *
   * DEV-402: старая корзина показывала лейбл «Activated promocode» / «already been used»,
   * новая воронка блок промокода не рендерит вообще. Пробовать читать цену нельзя: на
   * не-месячном периоде зачёркнутая цена — это месячная × N, поэтому «скидка» там есть
   * всегда, от самой ступеньки периода, и промо в ней не видно.
   *
   * Воронка валидирует промо запросом `api-cart.php?sync=<pid>&syncPromo=<code>`, и его
   * ответ содержит ровно нужный вердикт: `promoError` = null | not_found | already_used,
   * `promo.value` = процент скидки. Это ТОЧНЕЕ прежнего лейбла — различает «промокода нет»
   * и «уже израсходован».
   *
   * Запрос кешируется по productId+promo и от периода НЕ зависит (см. useGetCartQuery),
   * поэтому ждать его достаточно один раз — до переключения периода.
   *
   * Промо у тарифа может не быть вовсе: тогда воронка запрос не делает, ждать нечего →
   * activated=false. Отсюда короткий таймаут, а не полный: иначе каждый такой тариф
   * съедал бы бюджет теста.
   */
  private promoVerdict(): Promise<Omit<TariffPromoResult, "title">> {
    return this.page
      .waitForResponse(
        (r) => r.request().method() === "GET" && /api-cart\.php\?sync=/.test(r.url()),
        { timeout: 20_000 },
      )
      .then(async (r) => {
        const code = new URL(r.url()).searchParams.get("syncPromo") ?? "";
        const body = (await r.json()) as {
          promo?: { value?: string } | string | null;
          promoError?: string | null;
        };
        const promo = body.promo;
        const discount =
          promo && typeof promo === "object" ? Number(promo.value) || 0 : 0;
        const error = body.promoError ?? null;
        return {
          activated: error === null && discount > 0,
          text: error ? `${code}: ${error}` : `${code}: ${discount}%`,
        };
      })
      .catch(() => ({ activated: false, text: "промо не запрашивался" }));
  }

  /**
   * Переключить билинг-период в воронке и дождаться, пока
   * (1) период применился — `billingCycle` в URL сменился (воронка держит его в query
   *     через useRouteQuery, поэтому признак надёжный и не зависит от акции),
   * (2) цена пересчиталась — итоговая цена стабилизировалась (2 равных замера подряд).
   * Так избегаем чтения устаревшей (monthly) цены после переключения. Web-first, без
   * waitForTimeout.
   *
   * DEV-402: период здесь — CustomSelect, а не список `.period` старой корзины: сначала
   * раскрываем тоггл, потом кликаем вариант по тексту.
   */
  private async selectCartPeriod(label: string): Promise<void> {
    const cycleBefore = new URL(this.page.url()).searchParams.get("billingCycle") ?? "";
    const select = this.page.locator(FUNNEL.billingCycleSelect).locator("..");
    await select.locator(FUNNEL.selectToggle).first().click();
    await select
      .locator(FUNNEL.selectOption)
      .filter({ hasText: label })
      .first()
      .click();
    await this.page
      .waitForFunction(
        (prev) => (new URL(location.href).searchParams.get("billingCycle") ?? "") !== prev,
        cycleBefore,
        { timeout: 30_000 },
      )
      .catch(() => {});
    await this.page
      .waitForFunction(
        (sel) => {
          const el = document.querySelector(sel);
          const w = window as unknown as { __pv?: string; __pc?: number };
          if (!el) {
            w.__pc = 0;
            return false;
          }
          const v = (el.textContent ?? "").trim();
          if (w.__pv === v) w.__pc = (w.__pc ?? 0) + 1;
          else {
            w.__pv = v;
            w.__pc = 0;
          }
          return (w.__pc ?? 0) >= 2;
        },
        FUNNEL.priceFinal,
        { timeout: 15_000, polling: 300 },
      )
      .catch(() => {});
  }
}

/** Long-term период для проверки дефолтного (не-акционного) промо. Акция — только на 1 месяц,
 *  поэтому на «3 Months» всегда дефолтный VANILLA20 (подтверждено live-recon 09-Jul-2026). */
const LONG_TERM_PERIOD_LABEL = "3 Months";
