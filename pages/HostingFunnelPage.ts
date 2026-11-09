/**
 * HostingFunnelPage — новый пошаговый конфигуратор хостинга `#hosting-funnel`
 * (вариант B серверного A/B `hostingFunnelVariant`, с ~05-Nov-2026).
 *
 * Один и тот же компонент на двух входах (атрибут `data-entry-page` хоста):
 *   - главная `/`                              (home): 4 таба шага 1, модпак НЕ выбран;
 *   - `/modded-minecraft-server-hosting/`     (modded): 2 таба, модпак предвыбран.
 * Хост с ОТКРЫТЫМ Shadow DOM - обычные CSS-локаторы его пробивают (как PlanCalculator).
 *
 * Шаги и кнопка перехода (`.f-pane__go`, текст меняется):
 *   1 What should we install? → Continue (disabled, пока не выбран модпак)
 *   2 Who's playing?          → Continue (3-4 игрока по умолчанию)
 *   3 Server size             → Done (рекомендованный тариф уже выбран)
 *   4 Server location         → Use Nearest Location
 *   5 Billing period          → Continue → сводка «All set. Let's host your server!»
 * Справа `aside`: тариф, параметры, цена, CTA «FINISH STEP N TO CONTINUE» → «HOST NOW».
 * HOST NOW для гостя открывает ВНУТРИ компонента Register/Login (без навигации) -
 * дальше тесты не идут (создание аккаунта на проде запрещено).
 *
 * Вариант B включать в спеке через pinHostingFunnelVariant(context, "B") (utils/amplitude.ts).
 * Методы — действия и читатели состояния; assert'ы в спеке. Confirmed live recon 06-Nov-2026.
 */
import { type Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";
import { HOSTING_FUNNEL, HOSTING_FUNNEL_STORAGE_KEY } from "../utils/selectors";

export class HostingFunnelPage extends BasePage {
  /** Открыть страницу с конфигуратором и дождаться степпера. */
  async open(path: string): Promise<void> {
    await this.goto(path);
    await this.steps.first().waitFor({ state: "visible", timeout: 30_000 });
  }

  get root(): Locator {
    return this.page.locator(HOSTING_FUNNEL.root);
  }

  /** Значение data-entry-page хоста (home / modded). */
  async entryPage(): Promise<string | null> {
    return this.root.getAttribute("data-entry-page");
  }

  // ─── степпер и панель шага ────────────────────────────────────────────────

  get steps(): Locator {
    return this.page.locator(HOSTING_FUNNEL.step);
  }

  get currentStep(): Locator {
    return this.page.locator(HOSTING_FUNNEL.currentStep);
  }

  get paneTitle(): Locator {
    return this.page.locator(HOSTING_FUNNEL.paneTitle).first();
  }

  get pane(): Locator {
    return this.page.locator(HOSTING_FUNNEL.pane).first();
  }

  get tabs(): Locator {
    return this.root.locator(HOSTING_FUNNEL.tab);
  }

  tab(name: string): Locator {
    return this.tabs.filter({ hasText: new RegExp(`^${name}$`) }).first();
  }

  /** Кнопка перехода к следующему шагу (Continue / Done / Use Nearest Location). */
  get advanceButton(): Locator {
    return this.page.locator(HOSTING_FUNNEL.advance).filter({ hasText: HOSTING_FUNNEL.advanceText }).first();
  }

  /** Нажать кнопку перехода и дождаться смены панели шага. */
  async advance(): Promise<void> {
    const before = await this.paneTitle.innerText();
    await this.advanceButton.click();
    await expect(this.paneTitle).not.toHaveText(before, { timeout: 15_000 });
  }

  // ─── шаг 1: модпак ────────────────────────────────────────────────────────

  get popularPacks(): Locator {
    return this.page.locator(HOSTING_FUNNEL.popularPack);
  }

  /** Выбрать первую карточку «Popular modpacks» (контент маркетинговый - не хардкодим имя). */
  async pickFirstPopularPack(): Promise<string> {
    const pack = this.popularPacks.first();
    const name = (await pack.innerText()).split("\n")[0].trim();
    await pack.click();
    await expect(this.advanceButton).toBeEnabled({ timeout: 10_000 });
    return name;
  }

  // ─── шаг 2: игроки ────────────────────────────────────────────────────────

  playersMark(label: string): Locator {
    return this.page.locator(HOSTING_FUNNEL.playersMark).filter({ hasText: new RegExp(`^${label}$`) }).first();
  }

  get playersPresets(): Locator {
    return this.page.locator(HOSTING_FUNNEL.playersPreset);
  }

  // ─── шаг 3: тарифы ────────────────────────────────────────────────────────

  get plans(): Locator {
    return this.page.locator(HOSTING_FUNNEL.plan);
  }

  /** Выбранный тариф (по умолчанию = рекомендованный). */
  get activePlan(): Locator {
    return this.page.locator(`${HOSTING_FUNNEL.plan}.is-active`).first();
  }

  /** Бейдж «Recommended» выбранного тарифа (пусто, если выбран не рекомендованный). */
  get activePlanTag(): Locator {
    return this.activePlan.locator(HOSTING_FUNNEL.planTag);
  }

  /** Карточки ниже рекомендации (точка с aria-label «Below recommended»). */
  get belowRecommendedPlans(): Locator {
    return this.plans.filter({ has: this.page.locator(HOSTING_FUNNEL.planBelow) });
  }

  // ─── шаг 5: период ────────────────────────────────────────────────────────

  get periods(): Locator {
    return this.page.locator(HOSTING_FUNNEL.period);
  }

  /**
   * Цены всех периодов в порядке на экране: цена первой покупки за месяц и цена продления за месяц.
   * ⚠️ Флэш-сейл (data-is-flash-sale-active) бьёт только Monthly первой покупки (09-Nov-2026: €8 при
   * продлении €31.99 → «Monthly дешевле Yearly»), поэтому сравнения длины периода - без Monthly-первой-покупки.
   */
  async readPeriods(): Promise<{ name: string; price: number; renew: number }[]> {
    const wraps = this.page.locator(HOSTING_FUNNEL.periodWrap);
    const out: { name: string; price: number; renew: number }[] = [];
    for (let i = 0; i < (await wraps.count()); i++) {
      const w = wraps.nth(i);
      out.push({
        name: (await w.locator(HOSTING_FUNNEL.periodName).innerText()).trim(),
        price: parsePrice(await w.locator(HOSTING_FUNNEL.periodPrice).innerText()),
        renew: parsePrice(await w.locator(HOSTING_FUNNEL.periodRenew).innerText()),
      });
    }
    return out;
  }

  /** Активен ли флэш-сейл на хосте конфигуратора (атрибут от сервера). */
  async isFlashSaleActive(): Promise<boolean> {
    return (await this.root.getAttribute("data-is-flash-sale-active")) === "true";
  }

  period(name: string): Locator {
    return this.periods.filter({ has: this.page.locator(HOSTING_FUNNEL.periodName, { hasText: name }) }).first();
  }

  // ─── карточка справа ──────────────────────────────────────────────────────

  get aside(): Locator {
    return this.page.locator(HOSTING_FUNNEL.aside).first();
  }

  get asidePrice(): Locator {
    return this.page.locator(HOSTING_FUNNEL.asidePrice).first();
  }

  get cta(): Locator {
    return this.page.locator(HOSTING_FUNNEL.cta).first();
  }

  get biggerPlanArrow(): Locator {
    return this.page.locator(HOSTING_FUNNEL.biggerPlan).first();
  }

  /** Цена в карточке как число (₴1,259 → 1259). */
  async readAsidePrice(): Promise<number> {
    return parsePrice(await this.asidePrice.innerText());
  }

  // ─── сквозной путь и финал ────────────────────────────────────────────────

  /**
   * Пройти все 5 шагов до сводки «All set». На главной сначала выбирается модпак
   * (на modded он предвыбран); игроки - по умолчанию, если не задано `players`.
   */
  async runToSummary(opts: { players?: string; period?: string } = {}): Promise<void> {
    if (!(await this.advanceButton.isEnabled())) await this.pickFirstPopularPack();
    await this.advance(); // → Who's playing?
    if (opts.players) await this.playersMark(opts.players).click();
    await this.advance(); // → Server size
    await this.advance(); // Done → Server location
    await this.advance(); // Use Nearest Location → Billing period
    if (opts.period) await this.period(opts.period).click();
    await this.advance(); // → сводка
  }

  /** HOST NOW (гость) → встроенная форма Register/Login. Ничего не отправляем. */
  async hostNow(): Promise<void> {
    await this.cta.click();
    await this.authEmail.waitFor({ state: "visible", timeout: 15_000 });
  }

  get authEmail(): Locator {
    return this.page.locator(HOSTING_FUNNEL.authEmail).first();
  }

  get authUsername(): Locator {
    return this.page.locator(HOSTING_FUNNEL.authUsername).first();
  }

  get authPassword(): Locator {
    return this.page.locator(HOSTING_FUNNEL.authPassword).first();
  }

  async backToConfiguration(): Promise<void> {
    await this.page.locator(HOSTING_FUNNEL.authBack).first().click();
    await this.cta.waitFor({ state: "visible", timeout: 10_000 });
  }

  /** Есть ли сохранённый прогресс в sessionStorage. */
  async hasStoredProgress(): Promise<boolean> {
    return this.page.evaluate((k) => sessionStorage.getItem(k) !== null, HOSTING_FUNNEL_STORAGE_KEY);
  }
}

function parsePrice(text: string): number {
  return Number(text.replace(/[^\d.]/g, ""));
}
