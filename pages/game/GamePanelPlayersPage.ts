/**
 * GamePanelPlayersPage — таб Players сервера (/server/{uuid}/players).
 *
 * С 04-Nov-2026 - менеджер игроков `.players-manager`: блок whitelist, фильтры и список
 * игроков. Сам таб виден и offline; мутации whitelist в тестах делаются через консоль
 * (см. GamePanelServerPage).
 *
 * Методы — действия и читатели состояния; assert'ы в спеке.
 */
import { type Locator, type Page } from "@playwright/test";
import { GamePanelBasePage } from "./GamePanelBasePage";
import { GAME_PANEL_PLAYERS } from "../../utils/selectors";

export class GamePanelPlayersPage extends GamePanelBasePage {
  constructor(page: Page, private readonly uuid: string) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.open(`/server/${this.uuid}/players`);
    await this.area.waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  }

  /** Корневой блок таба Players. */
  get area(): Locator {
    return this.page.locator(GAME_PANEL_PLAYERS.area).first();
  }

  /** Блок whitelist (переключатель On/Off). */
  get whitelist(): Locator {
    return this.area.locator(GAME_PANEL_PLAYERS.whitelist).first();
  }

  /** Фильтры списка игроков (All/Online/Whitelist/Operators/Banned). */
  get filters(): Locator {
    return this.area.locator(GAME_PANEL_PLAYERS.filters).first();
  }

  /** Таблица игроков. */
  get list(): Locator {
    return this.area.locator(GAME_PANEL_PLAYERS.list).first();
  }
}
