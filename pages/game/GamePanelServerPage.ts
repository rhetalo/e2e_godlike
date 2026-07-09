/**
 * GamePanelServerPage — страница сервера game-панели (/server/{uuid}).
 *
 * Содержит: статус, power-контролы (Start/Restart/Kill/Boost), Server
 * Information (Domain/IP, ID, Name, Location), консоль, Server Usage, а также
 * две навигации:
 *   - таб-полоса контента: GAME_PANEL_TABS (Overview/Console/Files/...);
 *   - серверный сайдбар: GAME_PANEL_SECTIONS (Sharing/Backups/Tasks/...).
 *
 * ⚠️ Power-методы (start/restart/kill) — МУТИРУЮЩИЕ. В smoke (Phase 1) они НЕ
 * вызываются; их используют только stateful-тесты Phase 2 с teardown.
 * Методы возвращают состояние/выполняют действия; assert'ы — в спеках.
 */
import { type Locator, type Page } from "@playwright/test";
import { GamePanelBasePage } from "./GamePanelBasePage";
import { GAME_PANEL_SERVER, GAME_PANEL_POWER, GAME_PANEL_DIALOG } from "../../utils/selectors";

export class GamePanelServerPage extends GamePanelBasePage {
  constructor(page: Page, private readonly uuid: string) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.open(`/server/${this.uuid}`);
    // Overview подгружается асинхронно — ждём power-область (Restart есть и онлайн, и оффлайн).
    await this.restartButton.waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  }

  // ── Power controls (toggle Start ⇄ Shut Down; Restart/Kill открывают confirm-диалог) ──
  // Имена кнопок — точные (exact), т.к. "Start" — подстрока "Starting".
  get startButton(): Locator {
    return this.page.getByRole("button", { name: GAME_PANEL_POWER.start, exact: true });
  }
  get startingButton(): Locator {
    // транзиент с многоточием: «Starting...» → regex, не exact
    return this.page.getByRole("button", { name: /Starting/i });
  }
  get consoleLog(): Locator {
    return this.page.locator(GAME_PANEL_SERVER.consoleLog).first();
  }
  get shutDownButton(): Locator {
    return this.page.getByRole("button", { name: GAME_PANEL_POWER.shutDown, exact: true });
  }
  get restartButton(): Locator {
    return this.page.getByRole("button", { name: GAME_PANEL_POWER.restart, exact: true });
  }
  get killButton(): Locator {
    return this.page.getByRole("button", { name: GAME_PANEL_POWER.kill, exact: true });
  }
  get editServerButton(): Locator {
    return this.page.locator(GAME_PANEL_SERVER.editServer).first();
  }
  get consoleCommandInput(): Locator {
    return this.page.locator(GAME_PANEL_SERVER.consoleCommandInput).first();
  }

  // ── Confirmation / EULA dialog (Vuetify .v-card.dialog) ───────
  private dialogByTitle(titleRe: RegExp): Locator {
    return this.page.locator(GAME_PANEL_DIALOG.root).filter({ hasText: titleRe }).first();
  }

  /** Принять EULA, если диалог появился после Start (первый старт). Возвращает, был ли он. */
  async acceptEulaIfPresent(timeoutMs = 6_000): Promise<boolean> {
    const dlg = this.dialogByTitle(GAME_PANEL_DIALOG.eulaTitle);
    if (!(await dlg.isVisible({ timeout: timeoutMs }).catch(() => false))) return false;
    await dlg.locator(GAME_PANEL_DIALOG.confirmBtn).first().click();
    await dlg.waitFor({ state: "hidden", timeout: 8_000 }).catch(() => {});
    return true;
  }

  /**
   * Подтвердить confirm-диалог, ЕСЛИ он появился. Исторически Restart/Kill открывали
   * модалку «Restart/Kill the server?». В текущем UI действие срабатывает СРАЗУ, без
   * модалки (подтверждено вживую 19-Jun-2026) — поэтому ждём диалог МЯГКО: появился →
   * жмём confirm; не появился → действие уже выполнилось, идём дальше (без падения).
   * Тот же best-effort-подход, что и в clickShutDown.
   */
  private async confirmDialogIfPresent(titleRe: RegExp, timeoutMs = 2_000): Promise<void> {
    const dlg = this.dialogByTitle(titleRe);
    if (!(await dlg.isVisible({ timeout: timeoutMs }).catch(() => false))) return;
    await dlg.locator(GAME_PANEL_DIALOG.confirmBtn).first().click();
    await dlg.waitFor({ state: "hidden", timeout: 8_000 }).catch(() => {});
  }

  // ── Power actions (МУТИРУЮЩИЕ — только Phase 2 с teardown) ─────
  // Power-кнопка temporarily DISABLED, пока сервер в переходном состоянии (Stopping/Starting/
  // Installing). Дефолтный actionTimeout (15с) не переживал «element is not enabled» на
  // подлагивающем сервере (соседний тест оставил его дозаканчивать операцию). Даём клику щедрый
  // таймаут — он auto-ждёт, пока кнопка станет enabled (сервер выйдет из перехода).
  private static readonly POWER_CLICK_TIMEOUT = 120_000;

  /** Клик Start + приём EULA. НЕ ждёт Online — используйте waitForOnline(). */
  async clickStart(): Promise<void> {
    if (await this.isOnline()) return; // уже онлайн — «Start» превратился в «Shut Down»
    await this.startButton.click({ timeout: GamePanelServerPage.POWER_CLICK_TIMEOUT });
    await this.acceptEulaIfPresent();
  }
  async clickRestart(): Promise<void> {
    await this.restartButton.click({ timeout: GamePanelServerPage.POWER_CLICK_TIMEOUT });
    await this.confirmDialogIfPresent(GAME_PANEL_DIALOG.restartTitle);
  }
  async clickKill(): Promise<void> {
    await this.killButton.click({ timeout: GamePanelServerPage.POWER_CLICK_TIMEOUT });
    await this.confirmDialogIfPresent(GAME_PANEL_DIALOG.killTitle);
  }
  /** Shut Down — тоггл Start'а, без модалки (на всякий случай подтверждаем, если появилась). */
  async clickShutDown(): Promise<void> {
    if (await this.isOffline()) return; // уже оффлайн — «Shut Down» превратился в «Start»
    await this.shutDownButton.click({ timeout: GamePanelServerPage.POWER_CLICK_TIMEOUT });
    const dlg = this.page.locator(GAME_PANEL_DIALOG.root).first();
    if (await dlg.isVisible({ timeout: 1_500 }).catch(() => false)) {
      await dlg.locator(GAME_PANEL_DIALOG.confirmBtn).first().click().catch(() => {});
      await dlg.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {});
    }
  }

  // ── State / waits ─────────────────────────────────────────────
  async isOnline(): Promise<boolean> {
    return this.shutDownButton.isVisible({ timeout: 1_000 }).catch(() => false);
  }
  async isOffline(): Promise<boolean> {
    return this.startButton.isVisible({ timeout: 1_000 }).catch(() => false);
  }
  /** Online = появилась кнопка Shut Down. Щедрый таймаут: первый старт ставит файлы/конфиги. */
  async waitForOnline(timeoutMs = 300_000): Promise<void> {
    await this.shutDownButton.waitFor({ state: "visible", timeout: timeoutMs });
  }
  async waitForOffline(timeoutMs = 90_000): Promise<void> {
    await this.startButton.waitFor({ state: "visible", timeout: timeoutMs });
  }
  async ensureOnline(timeoutMs = 300_000): Promise<void> {
    if (await this.isOnline()) return;
    await this.clickStart();
    await this.waitForOnline(timeoutMs);
  }

  /**
   * Дождаться полного цикла рестарта: сервер ДОЛЖЕН уйти из Running
   * (тоггл «Shut Down» исчезает → Stopping/Start/Starting) и вернуться в Online.
   * Это доказывает, что рестарт реально произошёл, а не «ничего не изменилось».
   */
  async waitForRestartCycle(onlineTimeoutMs = 300_000): Promise<void> {
    await this.shutDownButton.waitFor({ state: "hidden", timeout: 45_000 });
    await this.waitForOnline(onlineTimeoutMs);
  }

  /** Текст консоли (websocket-лог) — источник правды по действиям с сервером. */
  async getConsoleText(): Promise<string> {
    return (await this.consoleLog.innerText().catch(() => "")) ?? "";
  }

  /** Отправить команду в консоль сервера (Enter). Сервер должен быть Online. */
  async sendConsoleCommand(command: string): Promise<void> {
    await this.consoleCommandInput.fill(command);
    await this.consoleCommandInput.press("Enter");
  }

  /**
   * Дождаться, пока сервер закончил загрузку и готов принимать команды
   * (в логе появляется маркер вида «Done (..s)!» / «For help, type "help"»).
   * Модовый сервер грузится дольше — отсюда щедрый таймаут.
   */
  async waitForConsoleReady(timeoutMs = 180_000): Promise<void> {
    await this.page
      .locator(GAME_PANEL_SERVER.consoleLog)
      .filter({ hasText: /Done \(|For help, type|RCON running|players online/i })
      .first()
      .waitFor({ state: "visible", timeout: timeoutMs });
  }
  async ensureOffline(timeoutMs = 90_000): Promise<void> {
    if (await this.isOffline()) return;
    await this.clickShutDown();
    await this.waitForOffline(timeoutMs);
  }

  /** Таб контента по названию (Overview/Console/Files/...). */
  tab(name: string): Locator {
    return this.page.getByRole("link", { name, exact: false }).first();
  }

  /** Серверный раздел в сайдбаре (Sharing/Backups/Tasks/...). */
  section(name: string): Locator {
    return this.page.getByRole("link", { name, exact: false }).first();
  }

  // ── State readers ─────────────────────────────────────────────
  /** Первое найденное на странице слово-статус (Online/Offline/...). */
  async getStatusText(): Promise<string> {
    const body = await this.page.locator("body").innerText().catch(() => "");
    const match = body.match(GAME_PANEL_SERVER.statusWord);
    return match ? match[0] : "";
  }

  /** Текст адреса подключения «<host>:<port>» из Server Information (формат-агностично). */
  async getAddress(): Promise<string | null> {
    return ((await this.addressLabel.textContent().catch(() => null)) ?? "").trim() || null;
  }

  /** Хост из адреса подключения: реальный IP или srvN.godlike.club (FQDN ноды). */
  async getConnectionHost(): Promise<string | null> {
    const m = (await this.getAddress() ?? "").match(GAME_PANEL_SERVER.addressPattern);
    return m ? m[1] : null;
  }

  /** Порт из адреса подключения. */
  async getConnectionPort(): Promise<string | null> {
    const m = (await this.getAddress() ?? "").match(GAME_PANEL_SERVER.addressPattern);
    return m ? m[2] : null;
  }

  /** Элемент с именем сервера на странице (идентичность / проверка доступа). */
  nameLabel(name: string): Locator {
    return this.page.getByText(name).first();
  }

  /** Видимая строка адреса подключения (Server IP) в Server Information. */
  get addressLabel(): Locator {
    return this.page.locator(GAME_PANEL_SERVER.connectionValue).first();
  }

  /** Элемент с UUID сервера (Server Information). */
  uuidLabel(uuid: string): Locator {
    return this.page.getByText(uuid).first();
  }

  // ── Access control (Phase 5 / IDOR) ───────────────────────────
  /** Сообщение отказа доступа к чужому/несуществующему серверу. */
  get notFoundError(): Locator {
    return this.page.getByText(/requested resource does not exist/i).first();
  }
  /** Видны ли power-контролы = доступ к серверу предоставлен (Start/Shut Down/Restart). */
  async hasPowerControls(): Promise<boolean> {
    return (
      (await this.startButton.isVisible({ timeout: 1_500 }).catch(() => false)) ||
      (await this.shutDownButton.isVisible({ timeout: 500 }).catch(() => false)) ||
      (await this.restartButton.isVisible({ timeout: 500 }).catch(() => false))
    );
  }

  // ── Edit Server / rename (МУТАЦИЯ — self-cleaning в спеке) ─────
  /** Заголовок-имя сервера (h2). Обновляется реактивно после "Save Changes". */
  get overviewTitle(): Locator {
    return this.page.locator(GAME_PANEL_SERVER.overviewTitle).first();
  }
  async openEditServer(): Promise<void> {
    await this.editServerButton.click();
    await this.page
      .locator(GAME_PANEL_SERVER.editDialog)
      .first()
      .waitFor({ state: "visible", timeout: 10_000 });
  }
  /**
   * Переименовать сервер: Edit Server → имя → Save Changes. Диалог закрывается, заголовок
   * обновляется реактивно. ⚠️ "Reinstall Server" в этом диалоге НЕ трогаем (деструктив).
   */
  async setServerName(name: string): Promise<void> {
    await this.openEditServer();
    const input = this.page.locator(GAME_PANEL_SERVER.editNameInput).first();
    await input.waitFor({ state: "visible", timeout: 10_000 });
    // ⚠️ Диалог асинхронно ДОЗАГРУЖАЕТ текущее имя уже после открытия. Если заполнить раньше,
    // ответ fetch затирает нашу модель и Save шлёт старое имя (в MCP с задержками populate
    // успевал ДО ввода — потому баг и не воспроизводился вручную). Поэтому сначала ждём, пока
    // значение поля СТАБИЛИЗИРУЕТСЯ (непустое и неизменное ~1.2с = populate завершён), потом fill.
    await this.page
      .waitForFunction(
        (sel) => {
          const el = document.querySelector(sel) as HTMLInputElement | null;
          const w = window as unknown as { __nv?: string; __nc?: number };
          if (!el || !el.value) {
            w.__nc = 0;
            return false;
          }
          if (w.__nv === el.value) {
            w.__nc = (w.__nc ?? 0) + 1;
          } else {
            w.__nv = el.value;
            w.__nc = 0;
          }
          return (w.__nc ?? 0) >= 3;
        },
        GAME_PANEL_SERVER.editNameInput,
        { timeout: 8_000, polling: 400 },
      )
      .catch(() => {});
    await input.fill(name);
    await this.page.locator(GAME_PANEL_SERVER.editSaveButton).first().click();
    await this.page
      .locator(GAME_PANEL_SERVER.editDialog)
      .first()
      .waitFor({ state: "hidden", timeout: 10_000 })
      .catch(() => {});
  }
}
