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
import { STOREFRONT, PROMO } from "../utils/selectors";
import { Urls } from "../fixtures/test-data";

/**
 * Билинг-период для чтения промокода:
 *  - "monthly"  — 1 месяц (дефолт после Add to Cart). Здесь для ВСЕХ действует акция MONTHLY75.
 *  - "longTerm" — 3 месяца. Акции нет → дефолтный одноразовый промо (VANILLA20); его валидность
 *                 зависит от аккаунта (свежий/израсходованный) и игры (games.json expectPromoValid).
 */
export type PromoPeriod = "monthly" | "longTerm";

export interface TariffPromoResult {
  title: string;
  /** применённый промокод (значение инпута): напр. "MONTHLY75" (акция) / "VANILLA20" (дефолт) */
  code: string | null;
  /** показан success-label с текстом «Activated promocode» */
  activated: boolean;
  /** текст success/error-лейбла промокода */
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
   * Открыть страницу игры, прокликать каждый тариф с «Add to Cart» и прочитать результат
   * промокода на выбранном периоде. Между тарифами возвращается на страницу игры.
   * `period="longTerm"` переключает корзину на 3 месяца (вне акции) перед чтением.
   * ОДНО чтение на тариф (не дубль) — держим скорость в бюджете таймаута теста.
   * Вердикт (должен/не должен активироваться) — на стороне спека.
   */
  async collectTariffPromoResults(
    gameName: string,
    period: PromoPeriod = "monthly",
  ): Promise<TariffPromoResult[]> {
    await this.open();

    const link = this.gameLink(gameName);
    await link.waitFor({ state: "visible", timeout: 60_000 });
    await link.scrollIntoViewIfNeeded();
    const gamePageUrl = (await link.getAttribute("href")) ?? Urls.gameServers;
    await link.click();
    await this.page.waitForLoadState("domcontentloaded", { timeout: 60_000 });

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
      await btn.click();

      // longTerm → уводим корзину с акционного monthly на 3 месяца (вне акции) перед чтением.
      // Транзиент оптимистичного success→error бывает при СМЕНЕ периода → там нужна усиленная
      // стабилизация; на monthly (без смены) достаточно лёгкой (иначе валид-тест по играм с
      // множеством тарифов вылетал за таймаут).
      if (period === "longTerm") {
        await this.selectCartPeriod(LONG_TERM_PERIOD_LABEL);
      }
      results.push({ title, ...(await this.readPromo(period === "longTerm")) });

      await this.page.goto(gamePageUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    }

    return results;
  }

  /**
   * Прочитать состояние промокода: виден success («Activated…») или error. Читаем АТОМАРНО в
   * браузере (waitForFunction), берём видимость+текст лейбла в одном тике.
   *
   * ⚠️ Ждём СТАБИЛИЗАЦИИ состояния (одинаковое ≥4 замеров подряд ≈1.2с). При смене периода клиент
   * оптимистично показывает success для дефолтного промо ДО ответа бэка, а затем — если промо уже
   * израсходован — переключает на error «already been used». Без стабилизации poll ловил этот
   * транзиентный success и ложно давал activated=true (подтверждено live-recon 09-Jul-2026:
   * Project Zomboid/Ultra на 3 мес устаканивается в error). Ни success, ни error за таймаут →
   * activated=false, text="".
   */
  private async readPromo(stabilize: boolean): Promise<Omit<TariffPromoResult, "title">> {
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
    const code =
      (await this.page.locator(PROMO.input).first().inputValue().catch(() => "")) || null;
    return { code, ...label };
  }

  /**
   * Переключить билинг-период в корзине (клик по `.period` с нужным лейблом) и дождаться, пока
   * (1) период применился — `billingCycle` в URL сменился (происходит всегда, не зависит от акции),
   * (2) промо переоценился — значение промо-инпута стабилизировалось (2 равных замера подряд).
   * Так избегаем чтения устаревшего (monthly) лейбла после переключения. Web-first, без waitForTimeout.
   */
  private async selectCartPeriod(label: string): Promise<void> {
    const cycleBefore = new URL(this.page.url()).searchParams.get("billingCycle") ?? "";
    await this.page.locator(`.period:has-text("${label}")`).first().click();
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
          const el = document.querySelector(sel) as HTMLInputElement | null;
          const w = window as unknown as { __pv?: string; __pc?: number };
          if (!el) {
            w.__pc = 0;
            return false;
          }
          if (w.__pv === el.value) w.__pc = (w.__pc ?? 0) + 1;
          else {
            w.__pv = el.value;
            w.__pc = 0;
          }
          return (w.__pc ?? 0) >= 2;
        },
        PROMO.input,
        { timeout: 15_000, polling: 300 },
      )
      .catch(() => {});
  }
}

/** Long-term период для проверки дефолтного (не-акционного) промо. Акция — только на 1 месяц,
 *  поэтому на «3 Months» всегда дефолтный VANILLA20 (подтверждено live-recon 09-Jul-2026). */
const LONG_TERM_PERIOD_LABEL = "3 Months";
