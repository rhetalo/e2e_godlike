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
}
