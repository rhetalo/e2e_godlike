/**
 * GamePanelBasePage — базовый класс для страниц game-панели
 * (ultra.panel.godlike.host).
 *
 * Эталонный паттерн для нового surface'а. Отличия от storefront BasePage:
 *  - навигация по АБСОЛЮТНЫМ URL (панель на другом домене, не на baseURL),
 *    как vf-panel через utils/auth.ts — поэтому playwright.config.ts менять не нужно;
 *  - вместо cookie/promo-баннера гасит onboarding-оверлей shepherd.js (ShepherdTour).
 *
 * Методы — действия и читатели состояния; assert'ы остаются в спеках.
 */
import type { Page, Response } from "@playwright/test";
import { ShepherdTour } from "../../components/game/ShepherdTour";
import { GAME_PANEL_URL } from "../../utils/gameAuth";

export abstract class GamePanelBasePage {
  readonly page: Page;
  readonly tour: ShepherdTour;

  constructor(page: Page) {
    this.page = page;
    this.tour = new ShepherdTour(page);
  }

  /** Навигация по абсолютному пути панели + закрытие onboarding-тура. */
  protected async open(pathOrUrl: string): Promise<Response | null> {
    const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${GAME_PANEL_URL}${pathOrUrl}`;
    const resp = await this.page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    // networkidle на панели не всегда наступает (websocket-консоль) — отсюда .catch
    await this.page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
    await this.tour.dismissIfPresent();
    return resp;
  }

  url(): string {
    return this.page.url();
  }
}
