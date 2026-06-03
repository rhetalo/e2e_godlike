/**
 * GamePanelLoginPage — страница входа game-панели (/login).
 *
 * Особенность: сначала показан чузер «Through Login/Password», который
 * раскрывает форму email/password. Локаторы — из utils/selectors.ts.
 */
import { type Locator, type Page } from "@playwright/test";
import { GamePanelBasePage } from "./GamePanelBasePage";
import { GAME_PANEL_LOGIN } from "../../utils/selectors";

export class GamePanelLoginPage extends GamePanelBasePage {
  constructor(page: Page) {
    super(page);
  }

  get chooserButton(): Locator {
    return this.page.locator(GAME_PANEL_LOGIN.chooserButton).first();
  }
  get emailInput(): Locator {
    return this.page.locator(GAME_PANEL_LOGIN.email).first();
  }
  get passwordInput(): Locator {
    return this.page.locator(GAME_PANEL_LOGIN.password).first();
  }
  get loginButton(): Locator {
    return this.page.locator(GAME_PANEL_LOGIN.submit).first();
  }
  get errorToast(): Locator {
    return this.page.locator(GAME_PANEL_LOGIN.error).first();
  }

  async goto(): Promise<void> {
    await this.open("/login");
    await this.revealForm();
  }

  /** Раскрывает форму email/password, если она скрыта за чузером. */
  async revealForm(): Promise<void> {
    if (await this.emailInput.isVisible({ timeout: 2_000 }).catch(() => false)) return;
    await this.chooserButton.click().catch(() => {});
    await this.emailInput.waitFor({ state: "visible", timeout: 10_000 });
  }

  async loginWith(email: string, password: string): Promise<void> {
    await this.revealForm();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  /** type атрибута поля пароля — для проверки маскирования. */
  async passwordInputType(): Promise<string | null> {
    return this.passwordInput.getAttribute("type");
  }
}
