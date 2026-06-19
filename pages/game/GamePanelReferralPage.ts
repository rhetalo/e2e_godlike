/**
 * GamePanelReferralPage — реферальная программа (/referral).
 *
 * Глобальная страница (default_layout), НЕ server-scoped. Реф-ссылка (readonly) + Copy Link,
 * баланс + Request Withdrawal, How It Works, соц-кнопки, Referrals Analytics.
 *
 * ⚠️ Request Withdrawal (вывод средств) НЕ жмём — структурные проверки. Подтверждено MCP-recon 06-Jun-2026.
 */
import { type Locator } from "@playwright/test";
import { GamePanelBasePage } from "./GamePanelBasePage";
import { GAME_PANEL_REFERRAL } from "../../utils/selectors";

export class GamePanelReferralPage extends GamePanelBasePage {
  async goto(): Promise<void> {
    await this.open(`/referral`);
    await this.title.waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  }

  get title(): Locator {
    return this.page.locator(GAME_PANEL_REFERRAL.title).first();
  }
  get refLink(): Locator {
    return this.page.locator(GAME_PANEL_REFERRAL.refLink).first();
  }
  get copyLinkButton(): Locator {
    return this.page.locator(GAME_PANEL_REFERRAL.copyLinkButton).first();
  }
  get withdrawButton(): Locator {
    return this.page.locator(GAME_PANEL_REFERRAL.withdrawButton).first();
  }
  get howItWorks(): Locator {
    return this.page.locator(GAME_PANEL_REFERRAL.howItWorks).first();
  }

  /**
   * Значение readonly реф-ссылки. refLink → <input.v-field__input> (Vuetify) внутри
   * обёртки .link-card__input; читаем .value. evaluate-форма устойчива и к не-input DOM.
   */
  async refLinkValue(): Promise<string> {
    return this.refLink.evaluate((el) =>
      (el instanceof HTMLInputElement ? el.value : (el.textContent ?? "")).trim(),
    );
  }
}
