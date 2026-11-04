/**
 * GamePanelConfigPage — таб Server Properties сервера (/server/{uuid}/config; до 04-Nov-2026 «Config»).
 *
 * Это редактор server.properties. С редизайна 04-Nov-2026 свойства разложены по группам, а на
 * экране только активная группа → перед работой со свойством reveal() вводит его ключ в поиск
 * «Search all settings». Строка = `.property-setting`, ключ - `<code>` в заголовке; якоримся
 * по точному ключу.
 *
 * ⚠️ Автосейва больше нет. typeValue() только вводит значение (строка --dirty, save-bar);
 * discard() откатывает, saveAndRestart() сохраняет И перезапускает сервер (offline-сервер
 * при этом ЗАПУСКАЕТСЯ, подтверждения нет) → сохранение только на mut-серверах + ensureOffline.
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

  /** Плашка несохранённых правок («N unsaved change», Discard / Save & restart). */
  get saveBar(): Locator {
    return this.page.locator(GAME_PANEL_CONFIG.saveBar).first();
  }

  /** motd в превью «Preview in the multiplayer list» (видно в группе Server list). */
  get previewMotd(): Locator {
    return this.page.locator(GAME_PANEL_CONFIG.previewMotd).first();
  }

  /** Показать строку свойства: на экране только активная группа, поиск открывает любую. */
  async reveal(prop: string): Promise<void> {
    await this.search.fill(prop);
    await this.row(prop).waitFor({ state: "visible", timeout: 10_000 });
  }

  /** Открыть группу сайдбара (Gameplay / World / ... / Server list) со сброшенным поиском. */
  async openGroup(name: string): Promise<void> {
    await this.search.fill("");
    await this.page.locator(GAME_PANEL_CONFIG.group).filter({ hasText: name }).first().click();
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

  /** Есть ли у свойства несохранённая правка (строка --dirty, метка «Unsaved»). */
  async isDirty(prop: string): Promise<boolean> {
    return this.row(prop).evaluate(
      (el, cls) => el.classList.contains(cls),
      GAME_PANEL_CONFIG.dirtyRow.slice(1),
    );
  }

  /** Ввести значение БЕЗ сохранения (появляется save-bar). */
  async typeValue(prop: string, value: string): Promise<void> {
    await this.reveal(prop);
    await this.input(prop).fill(value);
    await this.saveBar.waitFor({ state: "visible", timeout: 10_000 });
  }

  /** Discard: откатить все несохранённые правки. */
  async discard(): Promise<void> {
    await this.saveBar.getByRole("button", { name: /Discard/i }).click();
    await this.saveBar.waitFor({ state: "hidden", timeout: 10_000 });
  }

  /**
   * Save & restart: сохранить server.properties и перезапустить сервер (без подтверждения).
   * Ждём ответ PUT .../properties, а не networkidle (websocket-консоль его не даёт).
   */
  async saveAndRestart(): Promise<void> {
    const saved = this.page.waitForResponse(
      (r) => r.request().method() === "PUT" && /\/api\/v2\/servers\/[^/]+\/properties/.test(r.url()),
      { timeout: 20_000 },
    );
    await this.saveBar.getByRole("button", { name: /Save & restart/i }).click();
    await saved;
    await this.saveBar.waitFor({ state: "hidden", timeout: 10_000 });
  }

  /** Ввести значение и сохранить (Save & restart). ⚠️ Перезапускает сервер. */
  async setValue(prop: string, value: string): Promise<void> {
    await this.typeValue(prop, value);
    await this.saveAndRestart();
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
