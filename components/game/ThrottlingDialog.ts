/**
 * ThrottlingDialog — модалка «Lag Detected» game-панели (вебхук CPU-троттлинга →
 * предложение апгрейда тарифа).
 *
 * Page-rooted компонент (модалка — глобальный оверлей поверх страницы сервера).
 * Только читает состояние и закрывает — assert'ы живут в спеках.
 *
 * Confirmed via live DOM 15-Jun-2026: `.upgrade-dialog` с заголовком
 * `.upgrade-dialog__title` («Lag…Detected»), строкой `.upgrade-dialog__user`,
 * кнопками `.dialog__button` (Keep current plan) и `.dialog__button-primary` (Upgrade for $X).
 *
 * ⚠️ Upgrade НЕ жать — платёжный флоу. Закрытие — только через «Keep current plan».
 */
import { type Locator, type Page } from "@playwright/test";
import { GAME_PANEL_THROTTLING } from "../../utils/selectors";

export class ThrottlingDialog {
  constructor(private readonly page: Page) {}

  get root(): Locator {
    return this.page.locator(GAME_PANEL_THROTTLING.dialog).first();
  }
  get title(): Locator {
    return this.root.locator(GAME_PANEL_THROTTLING.title);
  }
  get subtitle(): Locator {
    return this.root.locator(GAME_PANEL_THROTTLING.subtitle);
  }
  get userLine(): Locator {
    return this.root.locator(GAME_PANEL_THROTTLING.userLine);
  }
  get keepButton(): Locator {
    return this.root.locator(GAME_PANEL_THROTTLING.keepButton);
  }
  get upgradeButton(): Locator {
    return this.root.locator(GAME_PANEL_THROTTLING.upgradeButton);
  }

  /** Ждёт появления модалки (приходит real-time по websocket либо на загрузке страницы). */
  async waitForVisible(timeoutMs = 20_000): Promise<boolean> {
    return this.root
      .waitFor({ state: "visible", timeout: timeoutMs })
      .then(() => true)
      .catch(() => false);
  }

  /** Закрыть без апгрейда («Keep current plan»). */
  async dismiss(): Promise<void> {
    await this.keepButton.click();
    await this.root.waitFor({ state: "hidden", timeout: 8_000 }).catch(() => {});
  }
}
