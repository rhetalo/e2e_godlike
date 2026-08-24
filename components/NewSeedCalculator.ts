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

  // ─── версии ──────────────────────────────────────────────────────────────

  /** Выбрать версию по value (mc:… для Minecraft, mp:… для модпака). */
  async selectVersionValue(value: string): Promise<void> {
    await this.gameVersionSelect().selectOption(value);
  }

  /**
   * Выбрать первую модпак-версию (option с префиксом `mp:`) и вернуть её value.
   *
   * Намеренно НЕ хардкодим значение. Оно уже дважды уезжало: формат id сменился с
   * `curseforge-925200-7852998` на `curseforge:925200:7852998` (DEV-400, составные id),
   * а сами версии ATM10 обновляются сами по себе. Тест проверяет «модпак-версия
   * пробрасывает modpackId», а не «конкретно v6.2.1 существует», поэтому берём то, что
   * страница предлагает сейчас.
   *
   * Возвращает null, если модпак-версий в списке нет — спек решает, падать или скипать.
   */
  async selectFirstModpackVersion(): Promise<string | null> {
    const select = this.gameVersionSelect();
    await select.waitFor({ state: "attached", timeout: 15_000 });
    const value = await select.evaluate((el) => {
      const options = [...(el as HTMLSelectElement).options];
      return options.find((o) => o.value.startsWith("mp:"))?.value ?? null;
    });
    if (value === null) return null;
    await select.selectOption(value);
    return value;
  }

  // ─── сид: чипы / поиск / кастом ────────────────────────────────────────────

  seedChips(): Locator {
    return this.root().locator(SEL.chip);
  }

  /** Кликнуть seed-чип по индексу; вернуть его catalog-id (data-id) и подпись. */
  async selectSeedChip(index = 0): Promise<{ id: string | null; name: string }> {
    const chip = this.seedChips().nth(index);
    const id = await chip.getAttribute("data-id");
    const name = ((await chip.textContent()) ?? "").trim();
    await chip.click();
    return { id, name };
  }

  /** Ввести запрос в поиск сидов — открывает дропдаун с результатами. */
  async searchSeed(query: string): Promise<void> {
    await this.root().locator(SEL.seedSearch).fill(query);
  }

  /** Пункты дропдауна поиска сидов. */
  searchResults(): Locator {
    return this.root().locator(SEL.searchListItem);
  }

  /** Выбрать результат поиска по индексу; вернуть его текст. */
  async pickSearchResult(index = 0): Promise<string> {
    const item = this.searchResults().nth(index);
    const txt = ((await item.textContent()) ?? "").trim();
    await item.click();
    return txt;
  }

  /** Ввести произвольный сид в поле кастомного сида (Enter применяет). */
  async setCustomSeed(value: string): Promise<void> {
    const input = this.root().locator(SEL.customSeed);
    await input.fill(value);
    await input.press("Enter");
  }

  // ─── тариф ступенями / summary / CTA ───────────────────────────────────────

  /** Кликнуть ступень тарифа (slider-label) по data-step-index. */
  async selectTierStep(stepIndex: number): Promise<void> {
    await this.root().locator(`${SEL.sliderLabel}[data-step-index="${stepIndex}"]`).click();
  }

  /** Summary-блок: выбранный сид + версия (data-sc-sum-seed / -version). */
  async readSummary(): Promise<{ seed: string; version: string }> {
    const root = this.root();
    const text = async (sel: string) =>
      ((await root.locator(sel).first().textContent()) ?? "").trim();
    return { seed: await text(SEL.sumSeed), version: await text(SEL.sumVersion) };
  }

  /**
   * URL корзины, который построит CTA «Create server» (читается из data-href без клика —
   * атрибут синхронен выбору версии/сида/тарифа). Безопасно: навигации нет.
   */
  async ctaHref(): Promise<string> {
    return (await this.cta().getAttribute("data-href")) ?? "";
  }
}
