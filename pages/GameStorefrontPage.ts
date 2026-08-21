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
import { STOREFRONT, FUNNEL, BILLING, PROMO } from "../utils/selectors";
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

      // Какой сигнал читать — решает страница, а не наши ожидания. В воронке промо-блока
      // нет, там вердикт только из ответа бекенда. В старой корзине лейбл есть, и он
      // ЛУЧШЕ: промо переоценивается ПОСЛЕ смены периода, а слушатель ответа взведён до
      // клика и поймал бы ещё месячный. Лейбл же читается сейчас, то есть уже на 3 месяцах.
      const onFunnel = (await this.page.locator(FUNNEL.billingCycleSelect).count()) > 0;
      const armed = await verdict; // всегда снимаем взведённое ожидание, чтобы не висело
      results.push({
        title,
        ...(onFunnel ? armed : await this.readPromoLabel(period === "longTerm")),
      });

      await this.page.goto(gamePageUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    }

    return results;
  }

  /**
   * Вердикт по промокоду в СТАРОЙ корзине — по success/error-лейблу. Читаем АТОМАРНО в
   * браузере (waitForFunction), берём видимость+текст лейбла в одном тике.
   *
   * ⚠️ Ждём СТАБИЛИЗАЦИИ состояния (одинаковое ≥4 замеров подряд ≈1.2с). При смене периода
   * клиент оптимистично показывает success для дефолтного промо ДО ответа бэка, а затем —
   * если промо уже израсходован — переключает на error «already been used». Без стабилизации
   * poll ловил этот транзиентный success и ложно давал activated=true (подтверждено
   * live-recon 09-Jul-2026: Project Zomboid/Ultra на 3 мес устаканивается в error). Ни
   * success, ни error за таймаут → activated=false, text="".
   */
  private async readPromoLabel(stabilize: boolean): Promise<Omit<TariffPromoResult, "title">> {
    // Порог стабильности: longTerm (смена периода → транзиент success→error) требует больше
    // одинаковых замеров подряд; monthly — лёгкий порог, чтобы не жечь бюджет таймаута теста.
    const needStable = stabilize ? 4 : 2;
    const handle = await this.page
      .waitForFunction(
        ({ sel, need }) => {
          const vis = (el: Element | null) => !!el && (el as HTMLElement).offsetParent !== null;
          const s = document.querySelector(sel.success);
          const e = document.querySelector(sel.error);
          const state = vis(s)
            ? { activated: (s?.textContent ?? "").includes("Activated promocode"), text: (s?.textContent ?? "").trim() }
            : vis(e)
              ? { activated: false, text: (e?.textContent ?? "").trim() }
              : null;
          const w = window as unknown as { __ps?: string; __pn?: number };
          if (!state) {
            w.__pn = 0;
            w.__ps = undefined;
            return false;
          }
          const sig = (state.activated ? "A|" : "E|") + state.text;
          if (w.__ps === sig) w.__pn = (w.__pn ?? 0) + 1;
          else {
            w.__ps = sig;
            w.__pn = 0;
          }
          return (w.__pn ?? 0) >= need ? state : false;
        },
        { sel: { success: PROMO.successLabel, error: PROMO.errorLabel }, need: needStable },
        { timeout: 60_000, polling: 300 },
      )
      .catch(() => null);
    const label = handle
      ? ((await handle.jsonValue()) as { activated: boolean; text: string })
      : { activated: false, text: "" };
    return label;
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
   * Переключить билинг-период и дождаться, пока
   * (1) период применился — `billingCycle` в URL сменился (обе корзины держат его в query,
   *     поэтому признак надёжный и не зависит от акции),
   * (2) состояние пересчиталось — значение стабилизировалось (2 равных замера подряд).
   * Так избегаем чтения устаревшей (monthly) цены после переключения. Web-first, без
   * waitForTimeout.
   *
   * Работает с ОБЕИМИ корзинами, и это не запас на будущее: страницы игр за сутки успели
   * уехать в новую воронку и вернуться обратно на /cart/, пока каталог остался на новой.
   * Так что «какая корзина сейчас» — не константа, а то, что надо спросить у страницы.
   *
   * Отличий два: период в старой корзине — список `.period`, в воронке — CustomSelect; и
   * пересчёт видно по разным местам — в старой по значению промо-инпута, в воронке по
   * итоговой цене (промо-блока там нет вообще).
   */
  private async selectCartPeriod(label: string): Promise<void> {
    const cycleBefore = new URL(this.page.url()).searchParams.get("billingCycle") ?? "";
    const isFunnel = (await this.page.locator(FUNNEL.billingCycleSelect).count()) > 0;

    if (isFunnel) {
      const select = this.page.locator(FUNNEL.billingCycleSelect).locator("..");
      await select.locator(FUNNEL.selectToggle).first().click();
      await select.locator(FUNNEL.selectOption).filter({ hasText: label }).first().click();
    } else {
      await this.page.locator(`${BILLING.period}:has-text("${label}")`).first().click();
    }

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
          const v =
            el instanceof HTMLInputElement ? el.value : (el.textContent ?? "").trim();
          if (w.__pv === v) w.__pc = (w.__pc ?? 0) + 1;
          else {
            w.__pv = v;
            w.__pc = 0;
          }
          return (w.__pc ?? 0) >= 2;
        },
        isFunnel ? FUNNEL.priceFinal : PROMO.input,
        { timeout: 15_000, polling: 300 },
      )
      .catch(() => {});
  }
}

/** Long-term период для проверки дефолтного (не-акционного) промо. Акция — только на 1 месяц,
 *  поэтому на «3 Months» всегда дефолтный VANILLA20 (подтверждено live-recon 09-Jul-2026). */
const LONG_TERM_PERIOD_LABEL = "3 Months";
