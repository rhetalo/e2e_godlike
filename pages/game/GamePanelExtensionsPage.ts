/**
 * GamePanelExtensionsPage — каталог Plugins/Mods (/server/{uuid}/extensions) и
 * Modpacks (/server/{uuid}/modpacks).
 *
 * ⚠️ ОДИН компонент .server__extensions для обоих экранов (отличаются контентом;
 * document.title у modpacks тоже "Extensions"). Заголовок h1 = "Mods" / "Modpacks".
 * Фильтр-кнопки Mods/Plugins/All/Installed, поиск, Category/Author, sort-by; у элемента — Install.
 * Работает offline.
 *
 * ⚠️ Install НЕ жмём (установка мода/плагина = мутация) — структурные/read-only проверки.
 * Методы — действия/читатели; assert'ы в спеке. Подтверждено MCP-recon 06-Jun-2026.
 */
import { type Locator, type Page } from "@playwright/test";
import { GamePanelBasePage } from "./GamePanelBasePage";
import { GAME_PANEL_EXTENSIONS } from "../../utils/selectors";

export class GamePanelExtensionsPage extends GamePanelBasePage {
  constructor(page: Page, private readonly uuid: string) {
    super(page);
  }

  // Рендер «chrome» компонента (корень + полоса type-фильтров) отделён от загрузки САМОГО
  // каталога: каталог агрегируется из внешних провайдеров (Modrinth/CurseForge/Hangar/Spigot/
  // Polymart) и стал грузиться дольше — раньше медленные данные задерживали появление тулбара,
  // и клик по type-кнопке падал по actionTimeout (15s). Ждём тулбар отдельно и с запасом;
  // данные каталога ждёт уже спек через waitForResponse. (bump+split, 18-Aug-2026.)
  static readonly CHROME_TIMEOUT = 30_000;

  /** Корень + полоса type-фильтров отрисованы (не дожидаясь загрузки данных каталога). */
  private async waitForCatalogChrome(): Promise<void> {
    await this.root.waitFor({ state: "visible", timeout: GamePanelExtensionsPage.CHROME_TIMEOUT });
    await this.typeButtons().first().waitFor({ state: "visible", timeout: GamePanelExtensionsPage.CHROME_TIMEOUT });
  }

  /** Каталог Plugins/Mods. */
  async gotoExtensions(): Promise<void> {
    await this.open(`/server/${this.uuid}/extensions`);
    await this.waitForCatalogChrome();
  }
  /** Каталог Modpacks (тот же компонент). */
  async gotoModpacks(): Promise<void> {
    await this.open(`/server/${this.uuid}/modpacks`);
    await this.waitForCatalogChrome();
  }

  get root(): Locator {
    return this.page.locator(GAME_PANEL_EXTENSIONS.root).first();
  }
  get headerTitle(): Locator {
    return this.page.locator(GAME_PANEL_EXTENSIONS.headerTitle).first();
  }
  typeButtons(): Locator {
    return this.page.locator(GAME_PANEL_EXTENSIONS.typeButton);
  }
  get searchInput(): Locator {
    return this.page.locator(GAME_PANEL_EXTENSIONS.searchInput).first();
  }
  filterItems(): Locator {
    return this.page.locator(GAME_PANEL_EXTENSIONS.filterItem);
  }

  // ── каталог-карточки (подтв. live DOM 20-Jul-2026) ──
  cards(): Locator {
    return this.page.locator(GAME_PANEL_EXTENSIONS.card);
  }
  cardTitles(): Locator {
    return this.page.locator(GAME_PANEL_EXTENSIONS.cardTitle);
  }

  /**
   * Переключить type-фильтр (Mods / Plugins / All / Installed). Кнопка type отличается от
   * per-item Install тем, что живёт в полосе `__extension-type__button`.
   */
  async filterTo(type: "Mods" | "Plugins" | "All" | "Installed"): Promise<void> {
    const btn = this.typeButtons().filter({ hasText: new RegExp(`^\\s*${type}\\s*$`, "i") }).first();
    // Ждём видимость с запасом (не полагаясь на дефолтный actionTimeout 15s): полоса type-фильтров
    // может дорисоваться позже при медленном каталоге. См. waitForCatalogChrome.
    await btn.waitFor({ state: "visible", timeout: GamePanelExtensionsPage.CHROME_TIMEOUT });
    await btn.click();
  }

  /**
   * Поиск по каталогу (debounced во Vue — ждать конкретный ответ лучше в спеке).
   * ⚠️ `searchInput` — Vuetify-обёртка `.v-text-field` (div, не editable); печатать надо во
   * вложенный <input> (подтв. live DOM 20-Jul-2026).
   */
  async searchFor(term: string): Promise<void> {
    const input = this.searchInput.locator("input").first();
    await input.click();
    await input.fill("");
    // посимвольно — debounced-вотчер Vuetify не срабатывает на программный fill
    await input.pressSequentially(term, { delay: 60 });
  }

  /**
   * Кнопка Install на карточке каталога (по индексу). Именно карточная кнопка — не type-фильтр
   * «Installed». Клик открывает install-диалог (ещё не мутация — мутация = confirmInstall()).
   */
  cardInstallButton(index = 0): Locator {
    return this.cards().nth(index).locator("button", { hasText: /^\s*Install\s*$/i }).first();
  }

  async openInstallDialog(index = 0): Promise<void> {
    await this.cardInstallButton(index).click();
    await this.installDialog.waitFor({ state: "visible", timeout: 15_000 });
  }

  get installDialog(): Locator {
    return this.page.locator(GAME_PANEL_EXTENSIONS.installDialog).first();
  }
  get installDialogTitle(): Locator {
    return this.page.locator(GAME_PANEL_EXTENSIONS.installDialogTitle).first();
  }
  /** Кнопки внутри install-диалога. */
  dialogButton(name: "Install" | "Cancel"): Locator {
    return this.installDialog.locator("button", { hasText: new RegExp(`^\\s*${name}\\s*$`, "i") }).first();
  }

  /** Закрыть install-диалог БЕЗ установки (Esc). */
  async dismissInstallDialog(): Promise<void> {
    await this.page.keyboard.press("Escape");
    await this.installDialog.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
  }

  /** ⚠️ МУТАЦИЯ: подтвердить установку в открытом диалоге. */
  async confirmInstall(): Promise<void> {
    await this.dialogButton("Install").click();
  }

  /** Кнопка Uninstall на карточке (доступна в фильтре Installed). ⚠️ МУТАЦИЯ. */
  uninstallButton(index = 0): Locator {
    return this.cards().nth(index).locator("button", { hasText: /^\s*Uninstall\s*$/i }).first();
  }
}
