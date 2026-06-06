/**
 * GamePanelTasksPage — раздел Tasks сервера (/server/{uuid}/tasks).
 *
 * Панель «All Tasks» (табы Your/Default + дефолтные задачи «Send command» /
 * «Send power action» с Configure/Run) и «Scheduled Tasks» (по умолчанию пусто).
 * Работает offline.
 *
 * ⚠️ В тестах НЕ жмём Run/Configure (Run выполняет задачу = мутация, напр. power-action).
 * Методы — читатели; assert'ы в спеке.
 */
import { type Locator, type Page } from "@playwright/test";
import { GamePanelBasePage } from "./GamePanelBasePage";
import { GAME_PANEL_TASKS } from "../../utils/selectors";

export class GamePanelTasksPage extends GamePanelBasePage {
  constructor(page: Page, private readonly uuid: string) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.open(`/server/${this.uuid}/tasks`);
    await this.page.locator(GAME_PANEL_TASKS.panel).first().waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  }

  panels(): Locator {
    return this.page.locator(GAME_PANEL_TASKS.panel);
  }

  /** Задача-шаблон по заголовку («Send command» / «Send power action»). */
  taskByTitle(title: string): Locator {
    return this.page.locator(GAME_PANEL_TASKS.taskItem).filter({ hasText: title }).first();
  }
  async hasTask(title: string): Promise<boolean> {
    return this.taskByTitle(title).isVisible({ timeout: 5_000 }).catch(() => false);
  }

  /** Заголовок секции запланированных задач. */
  get scheduledTitle(): Locator {
    return this.page.getByText("Scheduled Tasks").first();
  }
  /** Пустое состояние списка запланированных задач. */
  get scheduledEmptyState(): Locator {
    return this.page.getByText(/no scheduled tasks/i).first();
  }

  // ── Create / delete задачи (МУТАЦИЯ — self-cleaning в спеке) ────

  /** Создать задачу "Send command": Configure → имя + payload → Save. */
  async configureSendCommand(name: string, payload: string): Promise<void> {
    await this.taskByTitle("Send command").locator(GAME_PANEL_TASKS.configureButton).first().click();
    await this.page.locator(GAME_PANEL_TASKS.dialog).first().waitFor({ state: "visible", timeout: 10_000 });
    await this.page.locator(GAME_PANEL_TASKS.dialogNameInput).first().fill(name);
    await this.page.locator(GAME_PANEL_TASKS.dialogPayloadInput).first().fill(payload);
    await this.page.locator(GAME_PANEL_TASKS.dialogSave).first().click();
    await this.page.locator(GAME_PANEL_TASKS.dialog).first().waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
  }

  async openYourTasks(): Promise<void> {
    await this.page.locator(GAME_PANEL_TASKS.yourTasksTab).first().click();
  }

  /** Созданная задача по имени. */
  yourTask(name: string): Locator {
    return this.page.locator(GAME_PANEL_TASKS.taskItem, { hasText: name }).first();
  }
  async hasYourTask(name: string): Promise<boolean> {
    return this.yourTask(name).isVisible({ timeout: 5_000 }).catch(() => false);
  }

  /** Удалить созданную задачу: иконка-меню строки → Remove → confirm "Delete". */
  async removeYourTask(name: string): Promise<void> {
    await this.yourTask(name).locator("button").last().click(); // иконка-меню (последняя кнопка строки)
    await this.page.locator(GAME_PANEL_TASKS.taskMenuItem, { hasText: "Remove" }).first().click();
    await this.page.locator(GAME_PANEL_TASKS.deleteConfirm).first().click();
    await this.yourTask(name).waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
  }

  /** Best-effort уборка (precondition/teardown): открыть Your Tasks и удалить, если есть. */
  async removeYourTaskIfPresent(name: string): Promise<void> {
    await this.openYourTasks().catch(() => {});
    if (await this.hasYourTask(name)) {
      await this.removeYourTask(name).catch(() => {});
    }
  }
}
