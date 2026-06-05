/**
 * GamePanelPlayersPage — таб Players сервера (/server/{uuid}/players).
 *
 * Рендерит блок `.server__players` с карточками (напр. "Server Administrators").
 * Сам таб виден и offline; управление игроками (whitelist/op) требует Online-
 * сервера и в тестах делается через консоль (см. GamePanelServerPage).
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

  /** Заголовок карточки по тексту (напр. "Server Administrators"). */
  cardTitle(name: string): Locator {
    return this.page.locator(GAME_PANEL_PLAYERS.cardTitle).filter({ hasText: name }).first();
  }

  async hasCard(name: string): Promise<boolean> {
    return this.cardTitle(name).isVisible({ timeout: 5_000 }).catch(() => false);
  }
}
