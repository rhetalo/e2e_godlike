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
    await this.neutralizeOverlays();
    return resp;
  }

  /**
   * Нейтрализует оверлеи, перехватывающие клики на страницах сервера:
   *  - `.server__header-help` — контекстная Help-панель (висит ОТКРЫТОЙ: «Why Backups…», помощь по
   *    портам/ролям и т.п.), перекрывает кнопки (backups/network/sharing/role.enforcement);
   *  - shepherd-онбординг — всплывает на ПЕРВОМ заходе на сервер (а серверы изоляции — новые),
   *    иногда уже ПОСЛЕ dismissIfPresent (отложенный триггер) → разовый клик его не ловит.
   * Ставим `pointer-events:none` через <style>: стиль живёт весь lifecycle страницы и применится
   * к оверлею, даже если он появится позже (надёжнее разового клика/таймаута). Клики проходят
   * сквозь оверлей к целевым элементам. Подтверждено recon 26-Jun-2026.
   */
  private async neutralizeOverlays(): Promise<void> {
    await this.page
      .addStyleTag({
        content:
          ".server__header-help, .server__help-wrapper, .shepherd-modal-overlay-container, .shepherd-modal-is-visible, .shepherd-element { pointer-events: none !important; }",
      })
      .catch(() => {});
  }

  url(): string {
    return this.page.url();
  }
}
