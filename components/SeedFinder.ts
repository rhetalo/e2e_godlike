/**
 * SeedFinder — «Find Your Perfect Seed» на странице списка сидов /minecraft-seeds/.
 *
 * ⚠️ recon 02-Oct-2026: бывший NewSeedCalculator (план/цена/слайдер/CTA → /cart-seed) со
 * страницы УДАЛЁН; на его месте фильтр сидов с тем же корнем .godlike-new-seed-calculator.
 * Воронка /cart-seed теперь только на одиночной странице сида (SeedPage).
 *
 * Как устроен:
 *   - инлайн-конфиг window.GodlikeNewSeedCalculator: seeds[] (versions[], platform, filters[]),
 *     versions[] (mc:* / mp:*), filterGroups[];
 *   - фильтры: версия (<select>), редакция (All/Java/Bedrock), теги (Biome/Geography/Structure);
 *   - результат: счётчик «Matching seeds N» + карточки (по 3, «Show more» добавляет пачку).
 *
 * Методы — действия/ридеры состояния; assert'ы остаются в спеках.
 */
import type { Locator, Page } from "@playwright/test";
import { SEED_FINDER as SEL } from "../utils/selectors";

export interface SeedCardInfo {
  title: string;
  href: string;
  openHref: string;
  seed: string;
  tags: string[];
}

export class SeedFinder {
  constructor(private readonly page: Page) {}

  root(): Locator {
    return this.page.locator(SEL.root);
  }

  gameVersionSelect(): Locator {
    return this.root().locator(SEL.gameVersionSelect);
  }

  cards(): Locator {
    return this.root().locator(SEL.card);
  }

  clearButton(): Locator {
    return this.root().locator(SEL.clear);
  }

  emptyState(): Locator {
    return this.root().locator(SEL.empty);
  }

  moreButton(): Locator {
    return this.root().locator(SEL.more);
  }

  lessButton(): Locator {
    return this.root().locator(SEL.less);
  }

  editionButton(edition: "" | "Java" | "Bedrock"): Locator {
    return this.root().locator(`${SEL.editionSegment}[data-edition="${edition}"]`);
  }

  filterTag(slug: string): Locator {
    return this.root().locator(`${SEL.filterTag}[data-filter-slug="${slug}"]`);
  }

  /**
   * Дождаться гидрации: отрисована хотя бы одна карточка сида.
   * ⚠️ Как и прежний калькулятор, виджет инициализируется ЛЕНИВО — только после реального
   * pointer-события (в headless без mouse-нуджа карточки не появляются).
   */
  async waitReady(timeoutMs = 45_000): Promise<void> {
    await this.root().waitFor({ state: "visible", timeout: timeoutMs });
    await this.page.waitForLoadState("networkidle").catch(() => {});
    await this.root().scrollIntoViewIfNeeded().catch(() => {});
    await this.page.mouse.move(400, 400);
    await this.page.mouse.move(650, 480);
    await this.cards().first().waitFor({ state: "visible", timeout: timeoutMs });
  }

  // ─── фильтры ──────────────────────────────────────────────────────────────

  /** Выбрать версию по value (mc:… для Minecraft, mp:… для модпака). */
  async selectVersion(value: string): Promise<void> {
    await this.gameVersionSelect().selectOption(value);
  }

  /** Все value из select версий (mc:… / mp:…). */
  async versionValues(): Promise<string[]> {
    return this.gameVersionSelect()
      .locator("option")
      .evaluateAll((opts) => opts.map((o) => (o as HTMLOptionElement).value));
  }

  async selectEdition(edition: "" | "Java" | "Bedrock"): Promise<void> {
    await this.editionButton(edition).click();
  }

  /** Кликнуть тег фильтра; если он спрятан под «+N more» — сначала раскрыть группы. */
  async toggleFilterTag(slug: string): Promise<void> {
    const tag = this.filterTag(slug);
    if (!(await tag.isVisible())) {
      const toggles = this.root().locator(`${SEL.filterToggle}[aria-expanded="false"]`);
      for (const t of await toggles.all()) await t.click();
    }
    await tag.click();
  }

  /** Подпись тега (без бейджа NEW). */
  async filterTagLabel(slug: string): Promise<string> {
    return this.filterTag(slug).evaluate(
      (el) => (el.firstChild?.textContent ?? el.textContent ?? "").trim(),
    );
  }

  async clearFilters(): Promise<void> {
    await this.clearButton().click();
  }

  // ─── результат ────────────────────────────────────────────────────────────

  /** «Matching seeds N» как число. */
  async readCount(): Promise<number> {
    return Number(((await this.root().locator(SEL.count).textContent()) ?? "").trim());
  }

  /** Подпись активных фильтров (пусто, если фильтров нет). */
  async readMeta(): Promise<string> {
    return ((await this.root().locator(SEL.meta).textContent()) ?? "").trim();
  }

  /** «Show more seeds (N)» → N (сколько сидов ещё не показано). */
  async readRemaining(): Promise<number> {
    const text = (await this.moreButton().textContent()) ?? "";
    return Number(text.match(/\((\d+)\)/)?.[1] ?? NaN);
  }

  async showMore(): Promise<void> {
    await this.moreButton().click();
  }

  async showLess(): Promise<void> {
    await this.lessButton().click();
  }

  async cardInfo(index = 0): Promise<SeedCardInfo> {
    const card = this.cards().nth(index);
    const title = card.locator(SEL.cardTitle);
    return {
      title: ((await title.textContent()) ?? "").trim(),
      href: (await title.getAttribute("href")) ?? "",
      openHref: (await card.locator(SEL.cardOpen).getAttribute("href")) ?? "",
      seed: ((await card.locator(SEL.cardSeedValue).textContent()) ?? "").trim(),
      tags: (await card.locator(SEL.cardTag).allTextContents()).map((t) => t.trim()),
    };
  }

  async allCardInfo(): Promise<SeedCardInfo[]> {
    const n = await this.cards().count();
    const out: SeedCardInfo[] = [];
    for (let i = 0; i < n; i++) out.push(await this.cardInfo(i));
    return out;
  }

  /** «Copy seed» на карточке — кладёт значение сида в буфер обмена. */
  async copySeed(index = 0): Promise<void> {
    await this.cards().nth(index).locator(SEL.cardCopy).click();
  }

  /** «Open seed» на карточке — НАВИГАЦИЯ на страницу сида (спек ждёт URL). */
  async openSeed(index = 0): Promise<void> {
    await this.cards().nth(index).locator(SEL.cardOpen).click();
  }

  async readClipboard(): Promise<string> {
    return this.page.evaluate(() => navigator.clipboard.readText());
  }

  /**
   * Оракул: сколько сидов из инлайн-конфига страницы подходит под mc-версию (без других
   * фильтров). Сверяем UI-счётчик с данными, а не с захардкоженным числом — контент меняется.
   */
  async configCountForMcVersion(mcVersion: string): Promise<number> {
    return this.page.evaluate((v) => {
      const cfg = (window as unknown as {
        GodlikeNewSeedCalculator?: { seeds: { versions: string[] }[] };
      }).GodlikeNewSeedCalculator;
      return cfg ? cfg.seeds.filter((s) => s.versions.includes(v)).length : -1;
    }, mcVersion);
  }
}
