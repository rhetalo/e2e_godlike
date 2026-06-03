/**
 * ShepherdTour — onboarding-оверлей панели (shepherd.js).
 *
 * Аналог CookieBanner для game-панели: оверлей появляется поверх контента и
 * перехватывает клики. Компонент только закрывает его и возвращает состояние —
 * никаких assert (assert'ы живут в спеках).
 *
 * Confirmed via recon 03-Jun-2026: .shepherd-modal-is-visible /
 * .shepherd-modal-overlay-container, закрытие — Escape либо кнопка Skip/Close.
 */
import { type Page } from "@playwright/test";
import { GAME_PANEL_TOUR } from "../../utils/selectors";

export class ShepherdTour {
  constructor(private readonly page: Page) {}

  /** Закрывает тур, если он виден. Дёшево, когда оверлея нет. */
  async dismissIfPresent(): Promise<void> {
    const overlay = this.page.locator(GAME_PANEL_TOUR.overlay).first();
    if (!(await overlay.isVisible({ timeout: 1_500 }).catch(() => false))) return;

    await this.page.keyboard.press("Escape").catch(() => {});
    await this.page
      .locator(GAME_PANEL_TOUR.close)
      .first()
      .click({ force: true, timeout: 1_500 })
      .catch(() => {});
    await overlay.click({ force: true }).catch(() => {});
    await overlay.waitFor({ state: "hidden", timeout: 2_000 }).catch(() => {});
  }

  async isPresent(): Promise<boolean> {
    return this.page
      .locator(GAME_PANEL_TOUR.overlay)
      .first()
      .isVisible({ timeout: 1_000 })
      .catch(() => false);
  }
}
