/**
 * GamePanelConfigPage — таб Config сервера (/server/{uuid}/config).
 *
 * Это редактор server.properties: каждое свойство — строка `.server__config-switch`
 * с Vuetify-инпутом и текстом-именем свойства (motd, difficulty, max-players, ...).
 *
 * ⚠️ Save-кнопки нет — форма АВТОСЕЙВИТ при изменении поля (PATCH на blur). Поэтому
 * setValue() делает fill → blur → ждёт networkidle; персист проверяется в спеке через
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
    await field.click();
    await field.fill(value);
    await field.blur(); // триггерит PATCH (автосейв)
    // ВАЖНО: networkidle на странице сервера не наступает (websocket-консоль) — ждём
    // ограниченно и гасим .catch, иначе вечное ожидание. Этого хватает на автосейв-PATCH.
    await this.page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
