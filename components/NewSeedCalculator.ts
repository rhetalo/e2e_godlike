/**
 * NewSeedCalculator — кастомный калькулятор на странице списка сидов /minecraft-seeds/.
 *
 * ⚠️ Это НЕ Vuetify PlanCalculator (тот на одиночных seed/modded-страницах). Здесь —
 * нативный <input type=range> + <select> версий игры + инлайн-конфиг
 * window.GodlikeNewSeedCalculator (products/seeds/versions, cartBaseUrl="/cart-seed",
 * promocode="SEED"). Confirmed via MCP recon 13-Jun-2026.
 *
 * Жизненный цикл:
 *   1. Виджет гидрируется асинхронно; план/цена показывают "—", пока НЕ выбрана версия игры.
 *   2. selectGameVersion() → заполняются план/RAM/слоты/цена + слайдер получает реальный диапазон.
 *   3. Слайдер двигает тариф (Double→…→Godlike).
 *   4. CTA «Create server» строит URL корзины /cart-seed НА КЛИК (href="#").
 *
 * Методы — действия/ридеры состояния; assert'ы остаются в спеках.
 */
import type { Locator, Page } from "@playwright/test";
import { NEW_SEED_CALCULATOR as SEL } from "../utils/selectors";

export interface NewSeedPlan {
  name: string;
  ram: string;
  slots: string;
}

export interface NewSeedPrice {
  current: string;
  old: string;
  cycle: string;
}

export class NewSeedCalculator {
  constructor(private readonly page: Page) {}

  root(): Locator {
    return this.page.locator(SEL.root);
  }

  gameVersionSelect(): Locator {
    return this.root().locator(SEL.gameVersionSelect);
  }

  range(): Locator {
    return this.root().locator(SEL.range);
  }

  cta(): Locator {
    return this.root().locator(SEL.cta);
  }

  /**
   * Дождаться гидрации: <select> версий игры наполнился опциями (инлайн-конфиг применён).
   * До этого момента план/цена пусты ("—") — взаимодействовать бессмысленно.
   */
  async waitReady(timeoutMs = 45_000): Promise<void> {
    await this.root().waitFor({ state: "visible", timeout: timeoutMs });
    // ⚠️ Гидрация по recon 13-Jun-2026: страница делает ОДИН self-reload вскоре после load,
    // а сам калькулятор инициализируется ЛЕНИВО — только после РЕАЛЬНОГО pointer-события
    // (mouse move). Ни ожидание, ни scroll, ни dispatch('resize') не триггерят (в headless
    // select версий иначе остаётся пустым). Поэтому: дать сети осесть (вкл. self-reload),
    // подтянуть в вид и «толкнуть» мышью, затем ждать опции версий.
    await this.page.waitForLoadState("networkidle").catch(() => {});
    await this.root().scrollIntoViewIfNeeded().catch(() => {});
    await this.page.mouse.move(400, 400);
    await this.page.mouse.move(650, 480);
    await this.page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel) as HTMLSelectElement | null;
        return !!el && el.options.length > 0;
      },
      SEL.gameVersionSelect,
      { timeout: timeoutMs },
    );
  }

  /** Выбрать версию игры по индексу (по умолчанию первую) — это заполняет план/цену. */
  async selectGameVersion(index = 0): Promise<string> {
    const select = this.gameVersionSelect();
    await select.selectOption({ index });
    return (await select.inputValue()) || "";
  }

  /** Текущий тариф из панели плана (name/ram/slots). */
  async readPlan(): Promise<NewSeedPlan> {
    const root = this.root();
    const text = async (sel: string) =>
      ((await root.locator(sel).first().textContent()) ?? "").trim();
    return {
      name: await text(SEL.planName),
      ram: await text(SEL.planRam),
      slots: await text(SEL.planSlots),
    };
  }

  /** Текущая цена (со скидкой / старая / цикл). */
  async readPrice(): Promise<NewSeedPrice> {
    const root = this.root();
    const text = async (sel: string) =>
      ((await root.locator(sel).first().textContent()) ?? "").trim();
    return {
      current: await text(SEL.priceNew),
      old: await text(SEL.priceOld),
      cycle: await text(SEL.priceCycle),
    };
  }

  /** Отображаемое число игроков (напр. "5-10" / "200+"). */
  async readPlayers(): Promise<string> {
    return (
      (await this.root().locator(SEL.playersValue).first().textContent()) ?? ""
    ).trim();
  }

  /** Значение нативного range-слайдера как число. */
  async rangeValue(): Promise<number> {
    return Number((await this.range().inputValue()) || "0");
  }

  /** Подвинуть слайдер в максимум (нативный range: фокус + End). */
  async sliderToMax(): Promise<void> {
    await this.range().press("End");
  }

  /** Подвинуть слайдер в минимум (нативный range: фокус + Home). */
  async sliderToMin(): Promise<void> {
    await this.range().press("Home");
  }
}
