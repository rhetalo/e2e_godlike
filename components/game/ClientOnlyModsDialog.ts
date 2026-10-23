/**
 * ClientOnlyModsDialog — окно «Some mods were disabled» (DEV-492 / DEV-556).
 *
 * Появляется на страницах сервера, когда сканер на старте переименовал client-only моды в
 * `*.jar.disabled`. Модальное: пока открыто, клики по странице (Start / Shut Down) не проходят.
 * Компонент читает список модов и закрывает окно «Got it» (только localStorage этого браузера,
 * на бэкенд ничего не шлёт). Assert'ы — в спеках. Live DOM 23-Oct-2026.
 */
import { type Locator, type Page } from "@playwright/test";
import { GAME_PANEL_CLIENT_ONLY_NOTICE } from "../../utils/selectors";

export class ClientOnlyModsDialog {
  constructor(private readonly page: Page) {}

  get root(): Locator {
    return this.page.locator(GAME_PANEL_CLIENT_ONLY_NOTICE.root).first();
  }
  get title(): Locator {
    return this.root.locator(GAME_PANEL_CLIENT_ONLY_NOTICE.title).first();
  }
  /** Строки «Disabled client-side mods» (имя файла мода). */
  modNames(): Locator {
    return this.root.locator(GAME_PANEL_CLIENT_ONLY_NOTICE.modName);
  }

  /** «Got it»: закрыть до следующего отключения (растёт revision). */
  async gotIt(): Promise<void> {
    await this.root.getByRole("button", { name: GAME_PANEL_CLIENT_ONLY_NOTICE.gotIt }).click();
    await this.root.waitFor({ state: "hidden", timeout: 10_000 });
  }

  /** Закрыть «Got it», если окно появится за `timeoutMs` (окно всплывает после ответа notice-API). */
  async dismissIfPresent(timeoutMs = 5_000): Promise<boolean> {
    const shown = await this.root.waitFor({ state: "visible", timeout: timeoutMs }).then(
      () => true,
      () => false,
    );
    if (shown) await this.gotIt();
    return shown;
  }
}
