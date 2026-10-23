/**
 * GamePanelFilesPage — файловый менеджер (/server/{uuid}/files).
 *
 * Список — v-data-table. Создание: «New folder»/«New file» → диалог (имя + Save).
 * Удаление (МУТАЦИЯ): выделить чекбокс строки → нижний «Delete» → confirm-диалог
 * (.v-card.dialog → primary). Файл уходит в Recycle Bin (24ч), из активной папки исчезает.
 *
 * Методы — действия и читатели состояния; assert'ы в спеках.
 */
import { type Locator, type Page, expect } from "@playwright/test";
import { GamePanelBasePage } from "./GamePanelBasePage";
import { GAME_PANEL_FILES } from "../../utils/selectors";

/** Кадр стрима поиска файлов (поля сняты live 23-Oct-2026; контракт - kb/products/up/api/files.md). */
export type SearchFrame =
  | { type: "match"; file: { path: string; name: string; is_file: boolean } }
  | { type: "progress"; listings: number; elapsed_ms: number }
  | {
      type: "end";
      status: string;
      reason: string | null;
      listings: number;
      matches: number;
      elapsed_ms: number;
      failed_directories: number;
    };

export class GamePanelFilesPage extends GamePanelBasePage {
  constructor(page: Page, private readonly uuid: string) {
    super(page);
  }

  /** Открыть файловый менеджер; `dir` - сразу в папку (`/plugins`), иначе корень. */
  async goto(dir?: string): Promise<void> {
    const query = dir ? `?dir=${encodeURIComponent(dir)}` : "";
    await this.open(`/server/${this.uuid}/files${query}`);
    await this.newFolderButton.waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  }

  // ── поиск файлов (DEV-476) ──────────────────────────────────────────────────
  get searchInput(): Locator {
    return this.page.locator(GAME_PANEL_FILES.searchInput).first();
  }

  /**
   * Поиск от текущей папки: ввести строку + Enter (без Enter запрос не уходит) и дочитать стрим до конца.
   * Возвращает кадры text/event-stream (`data: {type: match|progress|end, ...}`) как объекты.
   */
  async searchCapturingStream(term: string): Promise<{ status: number; contentType: string; frames: SearchFrame[] }> {
    await this.searchInput.fill(term);
    const [resp] = await Promise.all([
      this.page.waitForResponse((r) => GAME_PANEL_FILES.searchApi.test(r.url()), { timeout: 20_000 }),
      this.searchInput.press("Enter"),
    ]);
    const body = await resp.text();
    const frames = body
      .split("\n\n")
      .map((chunk) => chunk.replace(/^data:\s*/, "").trim())
      .filter(Boolean)
      .map((json) => JSON.parse(json) as SearchFrame);
    return { status: resp.status(), contentType: resp.headers()["content-type"] ?? "", frames };
  }

  /** Папки совпадений в таблице результатов поиска. */
  searchResultPaths(): Locator {
    return this.page.locator(GAME_PANEL_FILES.filePath);
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

  /**
   * Строка таблицы с записью `name` (имя совпадает точно). Подстрокой нельзя: `world` ловил служебную
   * строку «World Backups» (23-Oct-2026).
   */
  fileRow(name: string): Locator {
    return this.page.locator(GAME_PANEL_FILES.row).filter({ has: this.fileEntry(name) }).first();
  }

  async hasEntry(name: string): Promise<boolean> {
    return this.isShownWithin(this.fileEntry(name), 3_000);
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

  /**
   * Выбрать строку по имени. Vuetify-чекбокс в v-data-table: реальный <input> скрыт и
   * управляется обёрткой .v-selection-control, а таблица асинхронно ре-рендерит строки —
   * из-за чего .check({force}) флоил ("did not change its state": mouse-click попадал в
   * момент ре-рендера, нативный toggle терялся). Санкционированный паттерн репо
   * (TEST_GUIDELINES §7.5 / VpsPanelMediaPage): dispatchEvent('click') — синтетический
   * клик прямо в узел, без скролла и гонки actionability — + web-first verify.
   */
  private async selectRow(name: string): Promise<void> {
    const checkbox = this.fileRow(name).locator(GAME_PANEL_FILES.rowCheckbox).first();
    await checkbox.dispatchEvent("click");
    await expect(checkbox).toBeChecked({ timeout: 5_000 });
  }

  /** Удалить запись: чекбокс строки → нижний Delete → подтверждение. */
  async deleteEntry(name: string): Promise<void> {
    await this.confirmDeleteOf(name);
    await this.fileEntry(name).waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
  }

  /**
   * Чекбокс строки → нижний Delete → «Delete File» → подтвердить. Для `world` дальше открывается окно
   * World Backup (удаление ждёт выбора в нём), для остальных записей удаление уходит сразу.
   */
  async confirmDeleteOf(name: string): Promise<void> {
    await this.selectRow(name);
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
  }

  // ── World Backup при удалении мира (DEV-418, DEV-571) ───────────────────────

  /** Окно «Save Your World First?». */
  get worldBackupPrompt(): Locator {
    return this.page
      .locator(".v-overlay--active")
      .filter({ has: this.page.locator(GAME_PANEL_FILES.worldBackupPromptMarker) })
      .last();
  }
  get worldBackupContinueButton(): Locator {
    return this.worldBackupPrompt.locator(GAME_PANEL_FILES.worldBackupContinue).first();
  }
  /** ⚠️ «Create World Backup» создаёт реальную копию мира. Только для проверки видимости. */
  get worldBackupCreateButton(): Locator {
    return this.worldBackupPrompt.locator(GAME_PANEL_FILES.worldBackupCreate).first();
  }
  get errorToast(): Locator {
    return this.page.locator(GAME_PANEL_FILES.errorToast).last();
  }

  /**
   * Предохранитель: запросы удаления файлов обрываются в браузере, до сервера не доходят. Ставить ДО любого
   * сценария с удалением мира, если нужен только порядок запросов (мир не трогаем).
   */
  async blockFileDeletion(): Promise<void> {
    await this.page.route(GAME_PANEL_FILES.fileDeletionApi, (route) => route.abort());
  }

  /** Подмена ответа abandon на 500 в браузере (бэкенд не трогается) - для проверки отказа. */
  async failWorldBackupAbandon(): Promise<void> {
    await this.page.route(GAME_PANEL_FILES.worldBackupAbandonApi, (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: '{"message":"Server Error"}' }),
    );
  }

  /** Снять подмены из blockFileDeletion / failWorldBackupAbandon. */
  async clearDeletionRoutes(): Promise<void> {
    await this.page.unroute(GAME_PANEL_FILES.fileDeletionApi);
    await this.page.unroute(GAME_PANEL_FILES.worldBackupAbandonApi);
  }

  /**
   * Нажать «Continue Without Backup» и вернуть по порядку изменяющие запросы abandon / удаления
   * (`POST world-backups/abandon`, `POST files/trash`). Ждёт удаления либо тоста ошибки - что раньше.
   */
  async continueWithoutWorldBackup(): Promise<string[]> {
    const sent: string[] = [];
    const track = (r: { url(): string; method(): string }): void => {
      const url = r.url();
      if (GAME_PANEL_FILES.worldBackupAbandonApi.test(url)) sent.push(`${r.method()} abandon`);
      if (GAME_PANEL_FILES.fileDeletionApi.test(url)) sent.push(`${r.method()} ${url.match(/files\/(trash|delete)/)![0]}`);
    };
    this.page.on("request", track);
    const deletion = this.page.waitForRequest(GAME_PANEL_FILES.fileDeletionApi, { timeout: 20_000 });
    const failed = this.errorToast.waitFor({ state: "visible", timeout: 20_000 });
    await this.worldBackupContinueButton.click();
    await Promise.race([deletion, failed]).catch(() => {});
    this.page.off("request", track);
    deletion.catch(() => {});
    failed.catch(() => {});
    return sent;
  }

  /** Закрыть окно World Backup (Escape закрывает его вместе с «Delete File», DEV-571/UX-2). */
  async closeWorldBackupPrompt(): Promise<void> {
    await this.page.keyboard.press("Escape");
    await this.worldBackupPrompt.waitFor({ state: "hidden", timeout: 8_000 });
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

  get modpackSetupDialog(): Locator {
    return this.page.locator(GAME_PANEL_FILES.modpackSetupDialog).first();
  }
  get modpackSetupCards(): Locator {
    return this.modpackSetupDialog.locator(GAME_PANEL_FILES.modpackSetupCard);
  }
  /** ⚠️ «Order now» = реальный заказ услуги. Только для проверки видимости, НЕ кликать. */
  get modpackSetupOrderButton(): Locator {
    return this.modpackSetupDialog.locator(GAME_PANEL_FILES.modpackSetupOrder).first();
  }
  get modpackSetupDismissButton(): Locator {
    return this.modpackSetupDialog.locator(GAME_PANEL_FILES.modpackSetupDismiss).first();
  }
  get curseForgeDialog(): Locator {
    return this.page.locator(GAME_PANEL_FILES.curseForgeDialog).first();
  }

  /**
   * Перезайти в Files и нажать «Upload custom modpack». С 16-Oct-2026 кнопка сначала показывает апселл
   * Custom Modpack Setup, но только когда уже пришёл GET .../modpack-setup/quote (иначе - сразу
   * CurseForge-диалог, гонка). Поэтому слушатель quote ставим ДО навигации и кликаем после ответа -
   * апселл появляется детерминированно (recon 18-Oct, 3/3). ⚠️ «Order now» НЕ жмём.
   */
  async openUploadCustomModpack(): Promise<void> {
    const quote = this.page.waitForResponse((r) => /\/minecraft\/modpack-setup\/quote/.test(r.url()), {
      timeout: 30_000,
    });
    await this.goto();
    await quote;
    await this.curseForgeButton.click();
    await this.modpackSetupDialog.or(this.curseForgeDialog).first().waitFor({ state: "visible", timeout: 10_000 });
  }

  /** Апселл → «I’ll upload it myself» → CurseForge upload-диалог. ⚠️ Proceed НЕ жмём. */
  async chooseSelfUpload(): Promise<void> {
    await this.modpackSetupDismissButton.click();
    await this.curseForgeDialog.waitFor({ state: "visible", timeout: 10_000 });
  }

  get curseForgeStatusSuccess(): Locator {
    return this.curseForgeDialog.locator(GAME_PANEL_FILES.curseForgeStatusSuccess);
  }
  get curseForgeStatusError(): Locator {
    return this.curseForgeDialog.locator(GAME_PANEL_FILES.curseForgeStatusError);
  }
  get curseForgeSkippedEntries(): Locator {
    return this.curseForgeDialog.locator(GAME_PANEL_FILES.curseForgeSkippedEntries);
  }
  /** ⚠️ Proceed = установка модов на сервер. Только для проверки состояния, НЕ кликать. */
  get curseForgeProceed(): Locator {
    return this.page.locator(GAME_PANEL_FILES.curseForgeProceed).first();
  }

  /**
   * Выбрать manifest.json в CurseForge-диалоге и дождаться ответа валидации (DEV-556).
   * Валидация read-only: на сервер ничего не ставится, пока не нажат Proceed.
   */
  async selectManifest(name: string, content: string): Promise<void> {
    const validated = this.page.waitForResponse((r) => /\/minecraft\/manifest\/validate/.test(r.url()), {
      timeout: 30_000,
    });
    await this.page.locator(GAME_PANEL_FILES.curseForgeFileInput).setInputFiles({
      name,
      mimeType: "application/json",
      buffer: Buffer.from(content),
    });
    await validated;
  }

  /** Закрыть CurseForge-диалог кнопкой Cancel (Escape его не закрывает). */
  async closeCurseForgeDialog(): Promise<void> {
    await this.page.locator(GAME_PANEL_FILES.curseForgeCancel).first().click();
    await this.curseForgeDialog.waitFor({ state: "hidden", timeout: 8_000 });
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

  // --- CodeMirror-редактор (открытие текстового файла; в тестах read-only) ---

  /** Контейнер с содержимым CodeMirror (.cm-content). Монтируется АСИНХРОННО. */
  get editorContent(): Locator {
    return this.page.locator(GAME_PANEL_FILES.editorContent).first();
  }

  /** Открыть текстовый файл в редакторе через "..."→Open и дождаться монтажа CodeMirror. */
  async openFileInEditor(name: string): Promise<void> {
    await this.openRowMenu(name);
    await this.rowMenuItem("Open").click();
    await this.editorContent.waitFor({ state: "visible", timeout: 15_000 });
  }

  /** Текст в редакторе — для проверки, что файл реально загрузился. */
  async getEditorText(): Promise<string> {
    return (await this.editorContent.innerText().catch(() => "")).trim();
  }

  /** Уйти из редактора без сохранения — вернуться к списку файлов. */
  async leaveEditor(): Promise<void> {
    await this.goto();
  }

  // --- Recycle Bin (удаление = перенос в корзину 24ч; Restore возвращает в корень) ---

  get recycleBinButton(): Locator {
    return this.page.locator(GAME_PANEL_FILES.recycleBinButton).first();
  }

  /** Перейти в Recycle Bin (URL ?dir=/.trash-<id>). */
  async openRecycleBin(): Promise<void> {
    await this.recycleBinButton.click();
    await this.page.waitForURL(/\.trash/i, { timeout: 15_000 }).catch(() => {});
  }

  /** Восстановить запись из корзины: чекбокс строки → bulk "Restore". Self-cleaning в спеке. */
  async restoreEntry(name: string): Promise<void> {
    await this.selectRow(name);
    // Restore — отдельная кнопка вне footerActionGroup; .click() дождётся снятия disabled после выбора.
    await this.page.locator(GAME_PANEL_FILES.recycleRestoreButton).first().click();
    await this.fileEntry(name).waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
