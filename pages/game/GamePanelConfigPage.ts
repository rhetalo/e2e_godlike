/**
 * GamePanelConfigPage — таб Server Properties сервера (/server/{uuid}/config; до 04-Nov-2026 «Config»).
 *
 * Это редактор server.properties. С редизайна 04-Nov-2026 свойства разложены по группам, а на
 * экране только активная группа → перед работой со свойством reveal() вводит его ключ в поиск
 * «Search all settings». Строка = `.property-setting`, ключ - `<code>` в заголовке; якоримся
 * по точному ключу.
 *
 * ⚠️ Save-кнопки нет — форма АВТОСЕЙВИТ при изменении поля (PATCH на blur). Поэтому
 * setValue() делает fill → blur → ждёт ответ PATCH автосейва; персист проверяется в спеке через
 * reload + getValue().
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
    // дождаться, что редактор отрендерился — поиск по свойствам есть всегда
    await this.search.waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  }

  /** Поле «Search all settings». */
  get search(): Locator {
    return this.page.locator(GAME_PANEL_CONFIG.search).first();
  }

  /** Показать строку свойства: на экране только активная группа, поиск открывает любую. */
  async reveal(prop: string): Promise<void> {
    await this.search.fill(prop);
    await this.row(prop).waitFor({ state: "visible", timeout: 10_000 });
  }

  /** Строка-свойство по точному ключу (motd/difficulty/...). */
  row(prop: string): Locator {
    return this.page
      .locator(GAME_PANEL_CONFIG.row)
      .filter({
        has: this.page.locator(GAME_PANEL_CONFIG.rowKey, {
          hasText: new RegExp(`^${escapeRegExp(prop)}$`),
        }),
      })
      .first();
  }

  /** Инпут указанного свойства (text/number). */
  input(prop: string): Locator {
    return this.row(prop).locator(GAME_PANEL_CONFIG.input).first();
  }

  async hasField(prop: string): Promise<boolean> {
    await this.reveal(prop).catch(() => {});
    return this.isShownWithin(this.row(prop), 5_000);
  }

  /** Текущее значение текстового свойства. */
  async getValue(prop: string): Promise<string> {
    await this.reveal(prop).catch(() => {});
    return (await this.input(prop).inputValue().catch(() => "")) ?? "";
  }

  /**
   * Задать значение текстового свойства и дождаться автосейва.
   * Автосейв триггерится blur'ом, затем ждём сеть.
   */
  async setValue(prop: string, value: string): Promise<void> {
    await this.reveal(prop);
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
