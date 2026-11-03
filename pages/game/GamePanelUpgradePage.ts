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

  /** Открыть апгрейд с ?ram=N (вход от RAM-диалога модпака / Lag Score, DEV-594). */
  async gotoWithRam(ram: string): Promise<void> {
    await this.open(`/server/${this.uuid}/upgrade?ram=${encodeURIComponent(ram)}`);
    await this.root.waitFor({ state: "visible", timeout: 20_000 });
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
  /** Метка цены на карточке текущего плана: «Recommended plan» или «Your current Plan». */
  get currentPlanPriceLabel(): Locator {
    return this.currentPlanCard.locator(GAME_PANEL_UPGRADE.currentPlanPriceLabel);
  }
  get recommendedLabelText(): RegExp {
    return GAME_PANEL_UPGRADE.recommendedLabelText;
  }
  /** Значение RAM-селекта конфигуратора («32 GB»); виден = тарифы загружены. */
  get configuratorRam(): Locator {
    return this.page.locator(GAME_PANEL_UPGRADE.configuratorRamValue).first();
  }
  /** RAM карточки текущего/рекомендованного плана в GB (из «RAM: N GB»), null - нет категории. */
  async currentPlanRamGb(): Promise<number | null> {
    const texts = await this.currentPlanCard.locator(GAME_PANEL_UPGRADE.currentPlanCategory).allInnerTexts();
    return parseGb(texts.find((t) => /RAM/i.test(t)));
  }
  /** RAM конфигуратора в GB. */
  async configuratorRamGb(): Promise<number | null> {
    return parseGb(await this.configuratorRam.innerText());
  }
  /** Регекс цены (валюта + число) — для проверки, что цены отрендерены в корне. */
  get priceText(): RegExp {
    return GAME_PANEL_UPGRADE.priceText;
  }
}

function parseGb(text: string | undefined): number | null {
  const m = text?.match(/(\d+)\s*GB/i);
  return m ? Number(m[1]) : null;
}
