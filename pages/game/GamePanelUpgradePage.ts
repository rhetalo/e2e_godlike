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

  // --- Тир Budget / Premium (DEV-547). Только UI и calc: Save Setup / Confirm не жмём. ---

  /** Открыть страницу апгрейда без параметров (вход server_management). */
  async goto(): Promise<void> {
    await this.open(`/server/${this.uuid}/upgrade`);
    await this.root.waitFor({ state: "visible", timeout: 20_000 });
  }

  /** Выбранный тир конфигуратора («Budget» / «Premium»). */
  get configuratorTierSelected(): Locator {
    return this.page.locator(GAME_PANEL_UPGRADE.configuratorTierSelected).first();
  }

  /** Открыть сетку See All Plans и дождаться карточек. */
  async openAllPlans(): Promise<void> {
    await this.page.locator(GAME_PANEL_UPGRADE.seeAllPlansButton).first().click();
    await this.allPlansCards().first().waitFor({ state: "visible", timeout: 20_000 });
  }

  allPlansCards(): Locator {
    return this.page.locator(`${GAME_PANEL_UPGRADE.allPlansRoot} ${GAME_PANEL_UPGRADE.allPlansCard}`);
  }

  /** Выбранный тир каждой карточки сетки (по порядку), «» - у карточки нет выбранного тира. */
  async allPlansCardTiers(): Promise<string[]> {
    const cards = await this.allPlansCards().all();
    return Promise.all(
      cards.map(async (card) => {
        const active = card.locator(GAME_PANEL_UPGRADE.allPlansTierActive);
        return (await active.count()) ? (await active.first().innerText()).trim() : "";
      }),
    );
  }

  /** Карточка сетки по имени плана («Ultra»). */
  allPlansCard(planName: string): Locator {
    return this.allPlansCards().filter({
      has: this.page.locator(GAME_PANEL_UPGRADE.allPlansCardName, { hasText: new RegExp(`^\\s*${planName}\\s*$`) }),
    });
  }

  /** Выбранный тир карточки сетки. */
  allPlansCardTierActive(planName: string): Locator {
    return this.allPlansCard(planName).locator(GAME_PANEL_UPGRADE.allPlansTierActive);
  }

  /** Переключить тир на карточке сетки (только calc, без Save Setup). */
  async chooseAllPlansTier(planName: string, tier: "Budget" | "Premium"): Promise<void> {
    await this.allPlansCard(planName).locator(GAME_PANEL_UPGRADE.allPlansTierButton, { hasText: tier }).click();
  }

  /** Вернуться из сетки в конфигуратор (Back). */
  async backToConfigurator(): Promise<void> {
    await this.page.locator(GAME_PANEL_UPGRADE.backButton).first().click();
    await this.configuratorTierSelected.waitFor({ state: "visible", timeout: 20_000 });
  }
}

function parseGb(text: string | undefined): number | null {
  const m = text?.match(/(\d+)\s*GB/i);
  return m ? Number(m[1]) : null;
}
