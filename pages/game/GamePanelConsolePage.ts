/**
 * GamePanelConsolePage — полноэкранная консоль (/server/{uuid}/console).
 *
 * Командный инпут + кнопка "Commands" → диалог-палитра (searchable справочник команд).
 * Палитра работает offline (это справочник UI); отправка команд требует Online (см. console.spec.ts).
 *
 * ⚠️ Команды НЕ отправляем в палитре — только открыть/отфильтровать/прочитать.
 * Методы — действия/читатели; assert'ы в спеке. Подтверждено MCP-recon 06-Jun-2026.
 */
import { type Locator, type Page } from "@playwright/test";
import { GamePanelBasePage } from "./GamePanelBasePage";
import { GAME_PANEL_CONSOLE } from "../../utils/selectors";

export class GamePanelConsolePage extends GamePanelBasePage {
  constructor(page: Page, private readonly uuid: string) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.open(`/server/${this.uuid}/console`);
    await this.commandsButton.waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  }

  get commandInput(): Locator {
    return this.page.locator(GAME_PANEL_CONSOLE.commandInput).first();
  }
  get commandsButton(): Locator {
    return this.page.locator(GAME_PANEL_CONSOLE.commandsButton).first();
  }
  get paletteSearch(): Locator {
    return this.page.locator(GAME_PANEL_CONSOLE.paletteSearch).first();
  }
  paletteItems(): Locator {
    return this.page.locator(GAME_PANEL_CONSOLE.paletteItem);
  }
  paletteItem(name: string): Locator {
    return this.page.locator(GAME_PANEL_CONSOLE.paletteItem, { hasText: name }).first();
  }

  /** Открыть палитру "Commands". */
  async openPalette(): Promise<void> {
    await this.commandsButton.click();
    await this.paletteSearch.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
  }
  /** Отфильтровать палитру по подстроке. */
  async filterPalette(query: string): Promise<void> {
    await this.paletteSearch.fill(query);
  }
  /** Закрыть палитру (Escape) — без отправки команды. */
  async closePalette(): Promise<void> {
    await this.page.keyboard.press("Escape");
    await this.paletteSearch.waitFor({ state: "hidden", timeout: 8_000 }).catch(() => {});
  }
}
