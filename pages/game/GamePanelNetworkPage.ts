/**
 * GamePanelNetworkPage — раздел Port & Domains сервера (/server/{uuid}/network).
 *
 * Subdomain-блок (домен-селект + Update/Copy Subdomain) и Network Ports (карточки
 * портов + Add Additional Port). Работает и offline.
 *
 * ⚠️ В тестах НЕ мутируем (Update Subdomain / Add Port меняют сетевые настройки) —
 * только структурные/read-only проверки. Методы — читатели; assert'ы в спеке.
 */
import { type Locator, type Page } from "@playwright/test";
import { GamePanelBasePage } from "./GamePanelBasePage";
import { GAME_PANEL_NETWORK } from "../../utils/selectors";

export class GamePanelNetworkPage extends GamePanelBasePage {
  constructor(page: Page, private readonly uuid: string) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.open(`/server/${this.uuid}/network`);
    await this.subdomainBlock.waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  }

  get subdomainBlock(): Locator {
    return this.page.locator(GAME_PANEL_NETWORK.subdomainBlock).first();
  }
  get updateSubdomainButton(): Locator {
    return this.page.locator(GAME_PANEL_NETWORK.updateSubdomainButton).first();
  }
  get portsSection(): Locator {
    return this.page.locator(GAME_PANEL_NETWORK.portsSection).first();
  }
  get addPortButton(): Locator {
    return this.page.locator(GAME_PANEL_NETWORK.addPortButton).first();
  }
  portCards(): Locator {
    return this.page.locator(GAME_PANEL_NETWORK.portCard);
  }

  // --- Add Additional Port диалог (структурный; ⚠️ "Add Port" НЕ жмём — добавит порт) ---

  get activeDialog(): Locator {
    return this.page.locator(".v-overlay--active").first();
  }
  /** Открыть диалог добавления порта. */
  async openAddPortDialog(): Promise<void> {
    await this.addPortButton.click();
    await this.activeDialog.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
  }
  get addPortNameInput(): Locator {
    return this.page.locator(GAME_PANEL_NETWORK.addPortNameInput).first();
  }
  get addPortConfirm(): Locator {
    return this.page.locator(GAME_PANEL_NETWORK.addPortConfirm).first();
  }
  /** Закрыть диалог (Escape) — без добавления порта. */
  async closeDialog(): Promise<void> {
    await this.page.keyboard.press("Escape");
    await this.activeDialog.waitFor({ state: "hidden", timeout: 8_000 }).catch(() => {});
  }

  // --- Copy-кнопки (clipboard, read-only — проверяем присутствие) ---
  get copySubdomainButton(): Locator {
    return this.page.locator(GAME_PANEL_NETWORK.copySubdomainButton).first();
  }
  get copyPortIpButton(): Locator {
    return this.page.locator(GAME_PANEL_NETWORK.copyPortIpButton).first();
  }
}
