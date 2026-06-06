/**
 * GamePanelFilesPage — файловый менеджер (/server/{uuid}/files).
 *
 * Список — v-data-table. Создание: «New folder»/«New file» → диалог (имя + Save).
 * Удаление (МУТАЦИЯ): выделить чекбокс строки → нижний «Delete» → confirm-диалог
 * (.v-card.dialog → primary). Файл уходит в Recycle Bin (24ч), из активной папки исчезает.
 *
 * Методы — действия и читатели состояния; assert'ы в спеках.
 */
import { type Locator, type Page } from "@playwright/test";
import { GamePanelBasePage } from "./GamePanelBasePage";
import { GAME_PANEL_FILES } from "../../utils/selectors";

export class GamePanelFilesPage extends GamePanelBasePage {
  constructor(page: Page, private readonly uuid: string) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.open(`/server/${this.uuid}/files`);
    await this.newFolderButton.waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  }

  get newFolderButton(): Locator {
    return this.page.locator(GAME_PANEL_FILES.newFolderButton).first();
  }
  get newFileButton(): Locator {
    return this.page.locator(GAME_PANEL_FILES.newFileButton).first();
  }

  /** Локатор имени файла/папки в списке (точное совпадение). */
  fileEntry(name: string): Locator {
    return this.page
      .locator(GAME_PANEL_FILES.fileName)
      .filter({ hasText: new RegExp(`^${escapeRegExp(name)}$`) })
      .first();
  }

  /** Строка таблицы, содержащая имя. */
  fileRow(name: string): Locator {
    return this.page.locator(GAME_PANEL_FILES.row, { hasText: name }).first();
  }

  async hasEntry(name: string): Promise<boolean> {
    return this.fileEntry(name).isVisible({ timeout: 3_000 }).catch(() => false);
  }

  /** Создать папку с именем через диалог «Create folder». */
  async createFolder(name: string): Promise<void> {
    await this.newFolderButton.click();
    const dialog = this.page
      .locator(".v-card")
      .filter({ has: this.page.locator(GAME_PANEL_FILES.dialogTitle, { hasText: /Create folder/i }) })
      .first();
    await dialog.waitFor({ state: "visible", timeout: 8_000 });
    await dialog.locator(GAME_PANEL_FILES.dialogNameInput).first().fill(name);
    await dialog.locator(GAME_PANEL_FILES.dialogSaveButton).first().click();
    await dialog.waitFor({ state: "hidden", timeout: 8_000 }).catch(() => {});
    await this.fileEntry(name).waitFor({ state: "visible", timeout: 10_000 });
  }

  /** Удалить запись: чекбокс строки → нижний Delete → подтверждение. */
  async deleteEntry(name: string): Promise<void> {
    const row = this.fileRow(name);
    await row.locator(GAME_PANEL_FILES.rowCheckbox).first().check({ force: true });
    await this.page
      .locator(`${GAME_PANEL_FILES.footerActionGroup} button`)
      .filter({ hasText: /^\s*Delete\s*$/ })
      .first()
      .click();
    // confirm-диалог «Delete File» — подтверждение danger-кнопкой
    const confirm = this.page
      .locator(".v-card")
      .filter({ has: this.page.locator(GAME_PANEL_FILES.dialogTitleSel, { hasText: /Delete File/i }) })
      .first();
    await confirm.waitFor({ state: "visible", timeout: 8_000 });
    await confirm.locator(GAME_PANEL_FILES.deleteConfirmButton).first().click();
    await confirm.waitFor({ state: "hidden", timeout: 8_000 }).catch(() => {});
    await this.fileEntry(name).waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
  }

  /** Best-effort уборка (для precondition/teardown). */
  async deleteEntryIfPresent(name: string): Promise<void> {
    if (await this.hasEntry(name)) {
      await this.deleteEntry(name).catch(() => {});
    }
  }

  // --- Структурные диалоги/меню (read-only; submit/Generate/Proceed НЕ жмём) ---

  get activeDialog(): Locator {
    return this.page.locator(".v-overlay--active").first();
  }
  get sftpButton(): Locator {
    return this.page.locator(GAME_PANEL_FILES.sftpButton).first();
  }
  get curseForgeButton(): Locator {
    return this.page.locator(GAME_PANEL_FILES.curseForgeButton).first();
  }

  /** Открыть SFTP Connect диалог. ⚠️ Generate/Save НЕ жмём. */
  async openSftpDialog(): Promise<void> {
    await this.sftpButton.click();
    await this.page
      .locator(GAME_PANEL_FILES.sftpForm)
      .first()
      .waitFor({ state: "visible", timeout: 10_000 })
      .catch(() => {});
  }

  /** Открыть CurseForge upload-модпак диалог. ⚠️ Proceed НЕ жмём. */
  async openCurseForgeDialog(): Promise<void> {
    await this.curseForgeButton.click();
    await this.activeDialog.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
  }

  /** Открыть per-row "..." меню действий для записи по имени. */
  async openRowMenu(name: string): Promise<void> {
    await this.fileRow(name).locator(GAME_PANEL_FILES.rowActionsBtn).first().click();
    await this.rowMenuItems().first().waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
  }

  /** Открыть "..." меню первой строки, у которой есть кнопка действий (без привязки к имени). */
  async openAnyRowMenu(): Promise<void> {
    const row = this.page
      .locator(GAME_PANEL_FILES.row)
      .filter({ has: this.page.locator(GAME_PANEL_FILES.rowActionsBtn) })
      .first();
    await row.locator(GAME_PANEL_FILES.rowActionsBtn).first().click();
    await this.rowMenuItems().first().waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
  }
  rowMenuItems(): Locator {
    return this.page.locator(GAME_PANEL_FILES.rowActionsItem);
  }
  rowMenuItem(text: string): Locator {
    return this.page.locator(GAME_PANEL_FILES.rowActionsItem, { hasText: text }).first();
  }

  /** Закрыть открытый overlay/меню (Escape) — без выполнения действия. */
  async closeOverlay(): Promise<void> {
    await this.page.keyboard.press("Escape");
    await this.activeDialog.waitFor({ state: "hidden", timeout: 8_000 }).catch(() => {});
  }

  /** Переименовать запись (МУТАЦИЯ): "..."→Rename → новое имя → confirm. Self-cleaning в спеке. */
  async renameEntry(oldName: string, newName: string): Promise<void> {
    await this.openRowMenu(oldName);
    await this.rowMenuItem("Rename").click();
    // открылся rename-диалог (новый active overlay) с предзаполненным именем
    const input = this.activeDialog.locator(GAME_PANEL_FILES.dialogNameInput).first();
    await input.waitFor({ state: "visible", timeout: 8_000 });
    await input.fill(newName);
    await this.page.locator(GAME_PANEL_FILES.renameConfirm).first().click();
    await this.fileEntry(newName).waitFor({ state: "visible", timeout: 10_000 });
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
