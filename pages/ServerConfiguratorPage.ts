/**
 * ServerConfiguratorPage — старый конфигуратор главной `#server-configurator`
 * (вариант A серверного A/B `hostingFunnelVariant`; вариант B = HostingFunnelPage).
 *
 * Открытый Shadow DOM с Tailwind-классами, поэтому якоримся на aria (`data-game-card` + aria-label,
 * aria-pressed, role=slider) и немногие осмысленные классы (`.plan-card`, `.price-display`, `.cta`).
 *
 *   «Choose your game»   - карточки игр, выбранная aria-pressed=true (по умолчанию Minecraft)
 *   Minecraft            - «Select Modpack» (listbox) + quick-pick (ATM 10, BMC 4, …) + версия
 *   «Number of Players»  - слайдер: div-ручка, клавиши Home/End, диапазон зависит от игры/модпака
 *   «Recommended Plan»   - имя тарифа, RAM, слоты, цена со скидкой (now) и старая (was)
 *   Host now             - /cart-main/?productId=…[&modpackId=curseforge:…]&billingCycle=monthly
 *
 * Методы — действия и читатели состояния; assert'ы в спеке. Confirmed live recon 06-Nov-2026.
 */
import { type Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";
import { SERVER_CONFIGURATOR } from "../utils/selectors";

export interface ConfiguratorCartParams {
  productId: string | null;
  modpackId: string | null;
  billingCycle: string | null;
}

export class ServerConfiguratorPage extends BasePage {
  /** Открыть главную и дождаться, что карточка рекомендованного тарифа заполнилась. */
  async open(path: string): Promise<void> {
    await this.goto(path);
    await this.planName.waitFor({ state: "visible", timeout: 30_000 });
  }

  get root(): Locator {
    return this.page.locator(SERVER_CONFIGURATOR.root);
  }

  get gameCards(): Locator {
    return this.page.locator(SERVER_CONFIGURATOR.gameCard);
  }

  gameCard(name: string): Locator {
    return this.page.locator(`${SERVER_CONFIGURATOR.gameCard}[aria-label="${name}"]`).first();
  }

  get selectedGame(): Locator {
    return this.page.locator(SERVER_CONFIGURATOR.selectedGame).first();
  }

  /** Выбрать игру и дождаться пересчёта рекомендованного тарифа. */
  async selectGame(name: string): Promise<void> {
    const before = await this.planSnapshot();
    await this.gameCard(name).click();
    await this.waitPlanChanged(before);
  }

  /** Кнопка-listbox поля по тексту его лейбла (Select Modpack / Modpack Version). */
  field(label: string): Locator {
    return this.page
      .locator(SERVER_CONFIGURATOR.fieldLabel, { hasText: new RegExp(`^${label}$`) })
      .locator("xpath=..")
      .locator(SERVER_CONFIGURATOR.listbox)
      .first();
  }

  get modpackSelect(): Locator {
    return this.field("Select Modpack");
  }

  quickPick(name: string): Locator {
    return this.root.getByRole("button", { name, exact: true });
  }

  get versionSelect(): Locator {
    return this.field("Modpack Version");
  }

  /** Панель выпадающего списка: id из aria-controls кнопки-listbox. */
  private async panelOf(select: Locator): Promise<Locator> {
    const id = await select.getAttribute("aria-controls");
    return this.root.locator(`[id="${id}"]`);
  }

  /** Открыть список модпаков; возвращает его панель (поиск + варианты). */
  async openModpackList(): Promise<Locator> {
    await this.modpackSelect.click();
    const panel = await this.panelOf(this.modpackSelect);
    await panel.locator(SERVER_CONFIGURATOR.option).first().waitFor({ state: "visible", timeout: 15_000 });
    return panel;
  }

  /** Варианты в открытой панели списка. */
  options(panel: Locator): Locator {
    return panel.locator(SERVER_CONFIGURATOR.option);
  }

  /** Ввести запрос в поиск модпаков и дождаться ответа серверного поиска. */
  async searchModpacks(panel: Locator, query: string): Promise<void> {
    const searched = this.page.waitForResponse(
      (r) => /\/minecraft\/modpacks\?/.test(r.url()) && r.url().includes(`query=${encodeURIComponent(query).replace(/%20/g, "+")}`),
      { timeout: 15_000 },
    );
    await panel.locator(SERVER_CONFIGURATOR.listSearch).fill(query);
    await searched;
  }

  /** Выбрать модпак из поиска и дождаться, что подтянулась его версия (поле версии активно). */
  async selectModpackFromList(panel: Locator, name: string): Promise<void> {
    await this.options(panel).filter({ hasText: new RegExp(`^${name}$`) }).first().click();
    await this.versionSelect.and(this.page.locator(":enabled")).waitFor({ state: "visible", timeout: 15_000 });
  }

  /** Открыть список версий; возвращает его панель. */
  async openVersionList(): Promise<Locator> {
    await this.versionSelect.click();
    const panel = await this.panelOf(this.versionSelect);
    await panel.locator(SERVER_CONFIGURATOR.option).first().waitFor({ state: "visible", timeout: 15_000 });
    return panel;
  }

  /** Выбрать версию по индексу в списке; возвращает её подпись. */
  async selectVersion(panel: Locator, index: number): Promise<string> {
    const opt = this.options(panel).nth(index);
    const label = (await opt.innerText()).trim();
    await opt.click();
    await expect(this.versionSelect).toContainText(label, { timeout: 10_000 });
    return label;
  }

  /** Quick-pick модпака (ATM 10 / BMC 4 / …) и ожидание, что селект показал выбор. */
  async pickModpack(name: string): Promise<void> {
    const before = await this.planSnapshot();
    await this.quickPick(name).click();
    await this.waitPlanChanged(before);
  }

  // ─── слайдер игроков ──────────────────────────────────────────────────────

  get playersSlider(): Locator {
    return this.page.locator(SERVER_CONFIGURATOR.playersSlider).first();
  }

  async readSlider(): Promise<{ value: number; max: number; label: string }> {
    return this.playersSlider.evaluate((el) => ({
      value: Number(el.getAttribute("aria-valuenow")),
      max: Number(el.getAttribute("aria-valuemax")),
      label: el.getAttribute("aria-valuetext") ?? "",
    }));
  }

  /** Сдвинуть слайдер клавишей (Home / End / ArrowRight …) и дождаться пересчёта тарифа. */
  async pressSlider(key: string): Promise<void> {
    const before = await this.planSnapshot();
    await this.playersSlider.focus();
    await this.page.keyboard.press(key);
    await this.waitPlanChanged(before);
  }

  // ─── тариф и CTA ──────────────────────────────────────────────────────────

  /** Заголовок «Recommended Plan» (вне .plan-card). */
  get recommendedHeading(): Locator {
    return this.root.getByRole("heading", { name: /Recommended Plan/i });
  }

  get planCard(): Locator {
    return this.page.locator(SERVER_CONFIGURATOR.planCard).first();
  }

  get planName(): Locator {
    return this.page.locator(SERVER_CONFIGURATOR.planName).first();
  }

  get priceNow(): Locator {
    return this.page.locator(SERVER_CONFIGURATOR.priceNow).first();
  }

  get priceWas(): Locator {
    return this.page.locator(SERVER_CONFIGURATOR.priceWas).first();
  }

  async readPrices(): Promise<{ now: number; was: number }> {
    return {
      now: parsePrice(await this.priceNow.innerText()),
      was: parsePrice(await this.priceWas.innerText()),
    };
  }

  get hostNowButton(): Locator {
    return this.page.locator(SERVER_CONFIGURATOR.cta).first();
  }

  /** Host now → корзина /cart-main/; возвращает её query-параметры. Заказ не оформляем. */
  async hostNow(): Promise<ConfiguratorCartParams> {
    await this.hostNowButton.click();
    await this.page.waitForURL(/\/cart-main\//, { timeout: 30_000 });
    const q = new URL(this.page.url()).searchParams;
    return { productId: q.get("productId"), modpackId: q.get("modpackId"), billingCycle: q.get("billingCycle") };
  }

  /** Текст карточки тарифа одной строкой (для детекта пересчёта). */
  private async planSnapshot(): Promise<string> {
    return (await this.planCard.innerText()).replace(/\s+/g, " ");
  }

  private async waitPlanChanged(before: string): Promise<void> {
    await this.page
      .waitForFunction(
        ({ root, sel, prev }) => {
          const el = document.querySelector(root)?.shadowRoot?.querySelector(sel) as HTMLElement | null;
          return !!el && el.innerText.replace(/\s+/g, " ") !== prev;
        },
        { root: SERVER_CONFIGURATOR.root, sel: SERVER_CONFIGURATOR.planCard, prev: before },
        { timeout: 15_000 },
      )
      .catch(() => {
        /* тариф мог не смениться (та же ступень) - вывод делает спек */
      });
  }
}

function parsePrice(text: string): number {
  return Number(text.replace(/[^\d.]/g, ""));
}
