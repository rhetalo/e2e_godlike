/**
 * GiveawayModal — промо/giveaway-модалка панели (Vuetify-диалог `.giveaway-modal`).
 *
 * Аналог ShepherdTour/CookieBanner: всплывает поверх контента (~1×/сессию, напр.
 * «Trustpilot Review Test») и её бэкдроп `.v-overlay__scrim` ПЕРЕХВАТЫВАЕТ клики —
 * из-за чего падали панельные/power-тесты (клик Start упирался в скрим,
 * подтверждено live-recon 27-Jul-2026). Компонент только закрывает модалку и
 * возвращает состояние; assert'ы — в спеках.
 *
 * Закрываем крестиком (`.giveaway-modal__close`), фолбэк — «Maybe later»
 * (`.giveaway-modal__later`). CTA (внешняя ссылка Trustpilot) НЕ трогаем.
 */
import { type Page } from "@playwright/test";
import { GAME_PANEL_GIVEAWAY } from "../../utils/selectors";

export class GiveawayModal {
  constructor(private readonly page: Page) {}

  /** Закрывает модалку, если она видна. Дёшево, когда её нет. Возвращает, была ли она. */
  async dismissIfPresent(): Promise<boolean> {
    const modal = this.page.locator(GAME_PANEL_GIVEAWAY.modal).first();
    if (!(await modal.isVisible({ timeout: 1_000 }).catch(() => false))) return false;

    await this.page
      .locator(GAME_PANEL_GIVEAWAY.close)
      .first()
      .click({ timeout: 2_000 })
      .catch(() => {});
    // фолбэк, если крестик не сработал (перерисовка) — «Maybe later»
    if (await modal.isVisible({ timeout: 500 }).catch(() => false)) {
      await this.page
        .locator(GAME_PANEL_GIVEAWAY.later)
        .first()
        .click({ timeout: 2_000 })
        .catch(() => {});
    }
    await modal.waitFor({ state: "hidden", timeout: 3_000 }).catch(() => {});
    return true;
  }

  async isPresent(): Promise<boolean> {
    return this.page
      .locator(GAME_PANEL_GIVEAWAY.modal)
      .first()
      .isVisible({ timeout: 1_000 })
      .catch(() => false);
  }
}
