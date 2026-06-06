/**
 * GamePanelVersionsPage — раздел Versions сервера (/server/{uuid}/minecraft/versions).
 *
 * Шапка "Currently running ..." (.server__version) + сетка семейств server-software
 * (.server__versions-type: Vanilla/Paper/NeoForge/Fabric/...). Клик по семейству → drill-down
 * ?type=NAME (Go Back + тогл Show Snapshot Versions). Работает offline.
 *
 * ⚠️ install = деструктивный rebuild — методы только читают/драйвят drill-down, НЕ устанавливают.
 * Методы — действия/читатели; assert'ы в спеке. Подтверждено MCP-recon 06-Jun-2026.
 */
import { type Locator, type Page } from "@playwright/test";
import { GamePanelBasePage } from "./GamePanelBasePage";
import { GAME_PANEL_VERSIONS } from "../../utils/selectors";

export class GamePanelVersionsPage extends GamePanelBasePage {
  constructor(page: Page, private readonly uuid: string) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.open(`/server/${this.uuid}/minecraft/versions`);
    await this.installedBlock.waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  }

  get installedBlock(): Locator {
    return this.page.locator(GAME_PANEL_VERSIONS.installedBlock).first();
  }
  get installedTitle(): Locator {
    return this.page.locator(GAME_PANEL_VERSIONS.installedTitle).first();
  }
  get grid(): Locator {
    return this.page.locator(GAME_PANEL_VERSIONS.root).first();
  }
  familyCards(): Locator {
    return this.page.locator(GAME_PANEL_VERSIONS.familyCard);
  }
  /** Карточка семейства по имени (Vanilla/Paper/NeoForge/...). */
  familyByName(name: string): Locator {
    return this.page.locator(GAME_PANEL_VERSIONS.familyCard, { hasText: name });
  }
  get goBack(): Locator {
    return this.page.locator(GAME_PANEL_VERSIONS.goBack).first();
  }
  get snapshotToggle(): Locator {
    return this.page.locator(GAME_PANEL_VERSIONS.snapshotToggle).first();
  }

  /** Открыть список версий семейства (drill-down). ⚠️ install НЕ жмём. */
  async openFamily(name: string): Promise<void> {
    await this.familyByName(name).first().click();
    await this.goBack.waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});
  }
}
