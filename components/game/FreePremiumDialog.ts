/**
 * FreePremiumDialog — промо-модалка "What is a Free Premium?".
 *
 * Кнопка-триггер присутствует на страницах сервера; по клику открывается .premium__dialog
 * со списком премиум-фич и CTA "Get Premium (3-Days Trial)".
 *
 * Page-rooted компонент (как Header/CookieBanner). Не ассертит — возвращает состояние/действует.
 * ⚠️ CTA "Get Premium" НЕ жмём (конверсия/триал). Подтверждено MCP-recon 06-Jun-2026.
 */
import { type Locator, type Page } from "@playwright/test";
import { GAME_PANEL_PREMIUM } from "../../utils/selectors";

export class FreePremiumDialog {
  constructor(private readonly page: Page) {}

  get openButton(): Locator {
    return this.page.locator(GAME_PANEL_PREMIUM.openButton).first();
  }
  get dialog(): Locator {
    return this.page.locator(GAME_PANEL_PREMIUM.dialog).first();
  }
  get cta(): Locator {
    return this.page.locator(GAME_PANEL_PREMIUM.ctaButton).first();
  }

  async open(): Promise<void> {
    await this.openButton.click();
    await this.dialog.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
  }

  /** Закрыть модалку (Escape). ⚠️ CTA "Get Premium" НЕ жмём. */
  async close(): Promise<void> {
    await this.page.keyboard.press("Escape");
    await this.dialog.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
  }
}
