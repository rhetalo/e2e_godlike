/**
 * GamePanelConfigPage — таб Config сервера (/server/{uuid}/config).
 *
 * Это редактор server.properties: каждое свойство — строка `.server__config-switch`
 * с Vuetify-инпутом и текстом-именем свойства (motd, difficulty, max-players, ...).
 *
 * ⚠️ Save-кнопки нет — форма АВТОСЕЙВИТ при изменении поля (PATCH на blur). Поэтому
 * setValue() делает fill → blur → ждёт ответ PATCH автосейва; персист проверяется в спеке через
 * reload + getValue(). id инпутов динамические — якоримся по имени свойства в тексте строки.
 *
 * Методы — действия и читатели состояния; assert'ы в спеке.
 */
import { type Locator, type Page } from "@playwright/test";
import { GamePanelBasePage } from "./GamePanelBasePage";
import { GAME_PANEL_CONFIG } from "../../utils/selectors";

export class GamePanelConfigPage extends GamePanelBasePage {
  constructor(page: Page, private readonly uuid: string) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.open(`/server/${this.uuid}/config`);
    // дождаться, что форма отрендерилась — строка motd есть всегда
    await this.row("motd").waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  }

  /** Строка-свойство по имени (motd/difficulty/...). Текст строки начинается с имени свойства. */
  row(prop: string): Locator {
    return this.page
      .locator(GAME_PANEL_CONFIG.row)
      .filter({ hasText: new RegExp(`^${escapeRegExp(prop)}`) })
      .first();
  }

  /** Текстовый инпут указанного свойства. */
  input(prop: string): Locator {
    return this.row(prop).locator(GAME_PANEL_CONFIG.input).first();
  }

  async hasField(prop: string): Promise<boolean> {
    return this.row(prop).isVisible({ timeout: 5_000 }).catch(() => false);
  }

  /** Текущее значение текстового свойства. */
  async getValue(prop: string): Promise<string> {
    return (await this.input(prop).inputValue().catch(() => "")) ?? "";
  }

  /**
   * Задать значение текстового свойства и дождаться автосейва.
   * Автосейв триггерится blur'ом — кликаем по инпуту другого свойства, затем ждём сеть.
   */
  async setValue(prop: string, value: string): Promise<void> {
    const field = this.input(prop);
    // Ждём ответ автосейва (PATCH к api/v2 сервера), а не networkidle — тот на странице сервера не
    // наступает (websocket-консоль). Слушатель ДО действия. Значение не изменилось → PATCH нет →
    // ограниченный таймаут без падения; персист в любом случае проверяет спек перезагрузкой.
    const saved = this.page
      .waitForResponse(
        (r) => r.request().method() === "PATCH" && /\/api\/v2\/servers\//.test(r.url()),
        { timeout: 8_000 },
      )
      .catch(() => null);
    await field.click();
    await field.fill(value);
    await field.blur(); // триггерит PATCH (автосейв)
    await saved;
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
