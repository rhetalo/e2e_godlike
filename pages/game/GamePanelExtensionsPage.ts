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

  /** Каталог Plugins/Mods. */
  async gotoExtensions(): Promise<void> {
    await this.open(`/server/${this.uuid}/extensions`);
    await this.root.waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  }
  /** Каталог Modpacks (тот же компонент). */
  async gotoModpacks(): Promise<void> {
    await this.open(`/server/${this.uuid}/modpacks`);
    await this.root.waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
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

  // ── Source (источник: CurseForge / Modrinth / Hangar / …) ──
  /** Контрол фильтра Source (по лейблу, не по индексу). */
  get sourceControl(): Locator {
    return this.filterItems().filter({ hasText: GAME_PANEL_EXTENSIONS.sourceFilterLabel }).first();
  }
  /** Открыть меню Source и вернуть список видимых опций (тексты). */
  async openSourceMenu(): Promise<void> {
    await this.sourceControl.click();
    await this.page.locator(GAME_PANEL_EXTENSIONS.overlayOption).first().waitFor({ state: "visible", timeout: 10_000 });
  }
  /** Тексты опций источника для текущей вкладки (Mods/Plugins/Modpacks). */
  async sourceOptions(): Promise<string[]> {
    await this.openSourceMenu();
    const opts = await this.page
      .locator(GAME_PANEL_EXTENSIONS.overlayOption)
      .evaluateAll((els) => Array.from(new Set(els.map((e) => (e.textContent || "").trim()).filter(Boolean))));
    await this.page.keyboard.press("Escape").catch(() => {});
    return opts;
  }
  /** Выбрать источник по имени (CurseForge / Modrinth / …). Меняет provider в запросе списка. */
  async selectSource(name: string): Promise<void> {
    await this.openSourceMenu();
    await this.page
      .locator(GAME_PANEL_EXTENSIONS.overlayOption)
      .filter({ hasText: new RegExp(`^\\s*${name}\\s*$`, "i") })
      .first()
      .click();
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

  /** Installed-карточка по имени расширения (для точечного отката — НЕ по индексу). */
  cardByName(name: string): Locator {
    return this.cards().filter({ hasText: name }).first();
  }

  /**
   * ⚠️ МУТАЦИЯ + self-cleaning: снять ИМЕННО указанное расширение в фильтре Installed нужного типа.
   * Важно: `Installed` контекстен типу — сначала выбрать Mods/Plugins, потом Installed, иначе увидишь
   * installed другого типа и не найдёшь свою карточку (баг отката, пойман 30-Jul на 33cc5e92).
   * Системные плагины (provider=null, напр. godlikemetrics) не трогаем — таргетим строго по имени.
   */
  async uninstallByName(type: "Mods" | "Plugins", name: string): Promise<boolean> {
    await this.filterTo(type);
    await this.filterTo("Installed");
    const card = this.cardByName(name);
    // Installed грузится асинхронно: мгновенный isVisible давал ложное «нечего снимать» и мод/плагин
    // оставался на общем сервере (30-Sep, MOD-004/PLG-006). Ждём карточку, а после клика — сам DELETE.
    const present = await card.waitFor({ state: "visible", timeout: 15_000 }).then(() => true, () => false);
    if (!present) return false;
    const [del] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.request().method() === "DELETE" && /\/minecraft\/(mods|plugins)\//.test(r.url()),
        { timeout: 30_000 },
      ),
      card.locator("button", { hasText: /uninstall/i }).first().click(),
    ]);
    await card.waitFor({ state: "hidden", timeout: 20_000 }).catch(() => {});
    return del.ok();
  }
}
