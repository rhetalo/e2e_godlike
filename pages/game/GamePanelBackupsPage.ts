/**
 * GamePanelBackupsPage — раздел Backups сервера (/server/{uuid}/backups).
 *
 * Create — INLINE-форма (не модалка): выбрать сервер в v-select + ввести имя →
 * кнопка «Create Backup» (.gradient-button, disabled пока нет сервера+имени). Список
 * .backups-list (NAME/DATE/SIZE/STATUS/TYPE/ACTIONS); статус-чип .backups-list__status
 * (--completed = бэкап готов, это async-джоба). Удаление (МУТАЦИЯ): меню «...» строки →
 * .backups-list__action-menu → пункт «Delete» → confirm. Работает и offline.
 *
 * ⚠️ В тестах НЕ жмём Restore (деструктивно перезапишет сервер) — только Create/Delete
 * над СВОИМ бэкапом (self-cleaning). Квота на тест-сервере — 3 слота.
 *
 * Методы — действия и читатели состояния; assert'ы в спеках.
 */
import { type Locator, type Page } from "@playwright/test";
import { GamePanelBasePage } from "./GamePanelBasePage";
import { GAME_PANEL_BACKUPS } from "../../utils/selectors";

export class GamePanelBackupsPage extends GamePanelBasePage {
  constructor(
    page: Page,
    private readonly uuid: string,
  ) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.open(`/server/${this.uuid}/backups`);
    await this.nameInput.waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  }

  // ── create form ─────────────────────────────────────────────────────────────
  get nameInput(): Locator {
    return this.page.locator(GAME_PANEL_BACKUPS.nameInput).first();
  }
  get createButton(): Locator {
    return this.page.locator(GAME_PANEL_BACKUPS.createButton).first();
  }
  tabs(): Locator {
    return this.page.locator(GAME_PANEL_BACKUPS.tab);
  }

  /**
   * Выбрать сервер в v-select (без него «Create Backup» остаётся disabled). Страница уже
   * скоуплена по UUID (/server/{uuid}/backups), поэтому в дропдане РОВНО одна опция — текущий
   * сервер. Берём первую опцию, а не матчим по имени: имя сервера меняется при переименовании
   * (это и ломало тесты), UUID в URL — нет. Подтверждено live-recon 27-Jun-2026 (1 опция).
   */
  private async selectServer(): Promise<void> {
    await this.page.locator(GAME_PANEL_BACKUPS.serverSelectField).first().click();
    const opt = this.page.locator(GAME_PANEL_BACKUPS.overlayOption).first();
    await opt.waitFor({ state: "visible", timeout: 6_000 });
    await opt.click();
  }

  /**
   * Создать серверный бэкап с именем. Выбирает сервер + имя; клик по «Create Backup»
   * авто-дожидается enabled (actionability). Возвращается, когда строка появилась в списке.
   */
  async createBackup(name: string): Promise<void> {
    await this.selectServer();
    await this.nameInput.fill(name);
    await this.createButton.click({ timeout: 15_000 }); // авто-ожидание enabled (сервер+имя заданы)
    await this.backupRow(name).waitFor({ state: "visible", timeout: 30_000 });
  }

  // ── list ────────────────────────────────────────────────────────────────────
  get list(): Locator {
    return this.page.locator(GAME_PANEL_BACKUPS.list).first();
  }
  get quota(): Locator {
    return this.page.locator(GAME_PANEL_BACKUPS.quota).first();
  }
  /** Все строки списка бэкапов. */
  rows(): Locator {
    return this.page.locator(GAME_PANEL_BACKUPS.row);
  }
  /**
   * Кнопка «...» (управление бэкапом: Restore/Rename/Lock/Delete) первой строки.
   * Отсутствует у ролей без прав на управление бэкапами (напр. Member) — см. role enforcement.
   */
  get anyManageMenuButton(): Locator {
    return this.page.locator(GAME_PANEL_BACKUPS.moreBtn).first();
  }

  /** Строка бэкапа по имени (в колонке NAME). */
  backupRow(name: string): Locator {
    return this.page
      .locator(GAME_PANEL_BACKUPS.row)
      .filter({ has: this.page.locator(GAME_PANEL_BACKUPS.nameCell, { hasText: name }) })
      .first();
  }
  async hasBackup(name: string): Promise<boolean> {
    return this.backupRow(name).isVisible({ timeout: 3_000 }).catch(() => false);
  }

  /** Статус-чип строки (текст: COMPLETED / IN PROGRESS / …). */
  statusOf(name: string): Locator {
    return this.backupRow(name).locator(GAME_PANEL_BACKUPS.status).first();
  }
  /** Чип со статусом «готов» — появляется, когда async-джоба завершилась. */
  completedStatusOf(name: string): Locator {
    return this.backupRow(name).locator(GAME_PANEL_BACKUPS.statusCompleted).first();
  }
  async getStatusText(name: string): Promise<string> {
    return ((await this.statusOf(name).innerText().catch(() => "")) ?? "").trim();
  }

  /**
   * Готов ли бэкап (статус COMPLETED).
   * ⚠️ Статус в списке НЕ обновляется реактивно — перед чтением нужен reload (см. §5h).
   * Поэтому опрашивать через `refresh()` + `isCompleted()` в `expect.poll` (см. backups.spec.ts).
   */
  async isCompleted(name: string): Promise<boolean> {
    return this.completedStatusOf(name).isVisible({ timeout: 3_000 }).catch(() => false);
  }

  /** Перезагрузить страницу (актуализировать статусы — они не обновляются реактивно). */
  async refresh(): Promise<void> {
    await this.goto();
  }

  // ── delete (мутация) ──────────────────────────────────────────────────────────
  /**
   * Удалить бэкап: меню «...» строки → пункт «Delete» (строго по тексту, рядом Restore!) →
   * confirm-диалог .delete-dialog → danger-кнопка .delete-dialog__confirm. Возвращается,
   * когда строка исчезла.
   */
  async deleteBackup(name: string): Promise<void> {
    const row = this.backupRow(name);
    await row.locator(GAME_PANEL_BACKUPS.moreBtn).first().click();
    const del = this.page
      .locator(GAME_PANEL_BACKUPS.menuItem)
      .filter({ hasText: /^Delete$/i })
      .first();
    await del.waitFor({ state: "visible", timeout: 6_000 });
    await del.click();
    const confirm = this.page.locator(GAME_PANEL_BACKUPS.deleteConfirmButton).first();
    await confirm.waitFor({ state: "visible", timeout: 6_000 });
    await confirm.click();
    await row.waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});
  }

  /**
   * Best-effort уборка ВСЕХ строк с этим именем (precondition/teardown).
   * ⚠️ Дубли копятся от прошлых упавших прогонов (self-cleaning не отработал) и забивают
   * квоту слотов (3) → удаляем все совпадающие в цикле, иначе остаток блокирует создание
   * (overlay `backups__slots-limit-overlay`). Кап итераций — чтобы не зациклиться.
   */
  async deleteIfPresent(name: string): Promise<void> {
    for (let i = 0; i < 5 && (await this.hasBackup(name)); i++) {
      await this.deleteBackup(name).catch(() => {});
      await this.refresh().catch(() => {});
    }
  }

  // ── scheduled ─────────────────────────────────────────────────────────────────
  get scheduledSection(): Locator {
    return this.page.locator(GAME_PANEL_BACKUPS.scheduled).first();
  }
  get scheduledEmptyState(): Locator {
    return this.page.locator(GAME_PANEL_BACKUPS.scheduledEmpty).first();
  }

  // scheduled-backup форма (структурно; НЕ сабмитим — расписание не создаём)
  get scheduleToggleLabel(): Locator {
    return this.page.locator(GAME_PANEL_BACKUPS.scheduleLabel).first();
  }
  get setIntervalLabel(): Locator {
    return this.page.locator(GAME_PANEL_BACKUPS.setIntervalLabel).first();
  }
  /** v-checkbox строки "Schedule Backup" (для чтения checked-состояния). */
  private scheduleCheckboxRow(): Locator {
    return this.page.locator(GAME_PANEL_BACKUPS.scheduleCheckbox).filter({ hasText: "Schedule Backup" }).first();
  }
  /** Включить "Schedule Backup" — локальный UI-тоггл; НИЧЕГО не сабмитим. */
  async enableSchedule(): Promise<void> {
    await this.scheduleToggleLabel.click();
  }
  async isScheduleChecked(): Promise<boolean> {
    return this.scheduleCheckboxRow().locator('input[type="checkbox"]').first().isChecked().catch(() => false);
  }
}
