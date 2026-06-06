/**
 * GamePanelUpgradePage — страница апгрейда сервера (/server/{uuid}/upgrade).
 *
 * Вход — ссылка "Boost my server" с overview (промокод в href). Карточка текущего плана
 * (.current-plan-card) + карточки планов на выбор (.simple-plan-card) + цены + Budget/Premium.
 *
 * ⚠️ ПЛАТЁЖНЫЙ ФЛОУ: план НЕ выбираем, checkout НЕ проходим — только структурные проверки.
 * Подтверждено MCP-recon 06-Jun-2026.
 */
import { type Locator, type Page } from "@playwright/test";
import { GamePanelBasePage } from "./GamePanelBasePage";
import { GAME_PANEL_UPGRADE } from "../../utils/selectors";

export class GamePanelUpgradePage extends GamePanelBasePage {
  constructor(page: Page, private readonly uuid: string) {
    super(page);
  }

  /** Войти через "Boost my server" с overview (реальный флоу; промокод берётся из href). */
  async gotoViaBoost(): Promise<void> {
    await this.open(`/server/${this.uuid}`);
    await this.page.locator(GAME_PANEL_UPGRADE.boostLink).first().click();
    await this.tour.dismissIfPresent();
    await this.root.waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  }

  get root(): Locator {
    return this.page.locator(GAME_PANEL_UPGRADE.root).first();
  }
  get currentPlanCard(): Locator {
    return this.page.locator(GAME_PANEL_UPGRADE.currentPlanCard).first();
  }
  planCards(): Locator {
    return this.page.locator(GAME_PANEL_UPGRADE.planCard);
  }
  /** Регекс цены (валюта + число) — для проверки, что цены отрендерены в корне. */
  get priceText(): RegExp {
    return GAME_PANEL_UPGRADE.priceText;
  }
}
