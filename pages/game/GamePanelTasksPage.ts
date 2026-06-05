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
}
