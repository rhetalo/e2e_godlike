import { type Page, type Locator, expect } from "@playwright/test";
import { PANEL_URL, TEST_SERVER_UUID } from "../utils/auth";
import { CookieBanner } from "../components/CookieBanner";
import { setupBannerHandlers } from "../utils/bannerHandlers";

/**
 * VpsPanelServerPage — https://vf-panel.godlike.host/server/{UUID}
 * VirtFusion v4.x server detail management page.
 *
 * ── CONFIRMED SELECTORS (from live DevTools, May 2026) ──────────────────────
 *
 * STATUS BADGE (both states, &nbsp; resolves to space in innerText):
 *   <div class="p-3">&nbsp;&nbsp;Running</div>
 *   <div class="p-3">&nbsp;&nbsp;Stopped</div>
 *
 * POWER BUTTONS (confirmed May 2026 — NO data-action attributes on buttons):
 *   button:has-text("Boot")       — disabled when Running, enabled when Stopped
 *   button:has-text("Shutdown")   — opens modal
 *   button:has-text("Power Off")  — opens modal
 *   button:has-text("Restart")    — opens modal
 *
 * NOTE: VirtFusion renders plain <button> elements with text labels only.
 *       data-action attributes do NOT exist on these buttons.
 *       Boot button is ALWAYS in the DOM — disabled when Running, enabled when Stopped.
 *
 * BOOTSTRAP MODALS (.modal.show when open):
 *   Shutdown  title: "Shutdown Server"
 *             body:  "Are you sure you want to shutdown this server?"
 *             confirm: button.btn.btn-primary.w-100[data-bs-dismiss="modal"]:has-text("Shutdown")
 *
 *   Restart   title: "Restart Server"
 *             body:  "Are you sure you want to restart this server?"
 *             confirm: button.btn.btn-primary.w-100[data-bs-dismiss="modal"]:has-text("Restart")
 *
 *   Power Off title: "Power Off Server"
 *             body:  "Are you sure you want to power off this server?"
 *             confirm: button.btn.btn-primary.w-100[data-bs-dismiss="modal"]:has-text("Power Off")
 *
 *   Rebuild   body:  "Are you sure you want to rebuild this server?"
 *             confirm: button#server-install-button.btn.btn-danger.w-100[data-bs-dismiss="modal"]
 *
 *   Cancel (ALL modals): button.btn.btn-light.w-100[data-bs-dismiss="modal"]
 *   NOTE: data-bs-dismiss auto-closes modal on click — no extra wait needed.
 *
 * ACTIVITY TABLE:
 *   table.table.table-normal — columns: Task | Requested | Duration | Progress
 *   span.badge.badge-active  — "Complete" status badge per row
 *   Debug rows have id="debugNNNN" — excluded from row counts.
 */
export class VpsPanelServerPage {
  readonly url: string;

  constructor(readonly page: Page, uuid: string = TEST_SERVER_UUID) {
    this.url = `${PANEL_URL}/server/${uuid}`;
  }

  async goto(): Promise<void> {
    // Регистрируем автоматические обработчики баннеров ДО навигации.
    // addLocatorHandler следит за баннером в фоне: если он появится в любой
    // момент теста (даже посреди клика), Playwright закроет его автоматически.
    await setupBannerHandlers(this.page);

    await this.page.goto(this.url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await this.page.waitForLoadState("networkidle").catch(() => null);

    // Проактивное закрытие — на случай если баннер уже был на странице
    // до того, как addLocatorHandler успел зарегистрироваться.
    await new CookieBanner(this.page).dismissAll();
  }

  // ── Server Identity ───────────────────────────────────────────────────────

  /**
   * Status badge.
   * Confirmed HTML: <div class="p-3">&nbsp;&nbsp;Running</div>
   * Filter by text because div.p-3 may appear for other layout blocks too.
   */
  get statusBadge(): Locator {
    return this.page
      .locator("div.p-3")
      .filter({ hasText: /Running|Stopped|Paused|Building/i })
      .first();
  }

  /**
   * Returns normalized status text: "Running", "Stopped", "Paused", "Building".
   * VirtFusion may return "RUNNING" or "Running" depending on version — we normalize.
   */
  async getStatusText(): Promise<string> {
    const raw = await this.statusBadge.innerText({ timeout: 10_000 }).catch(() => "");
    const trimmed = raw.trim();
    if (/running/i.test(trimmed)) return "Running";
    if (/stopped/i.test(trimmed)) return "Stopped";
    if (/paused/i.test(trimmed)) return "Paused";
    if (/building/i.test(trimmed)) return "Building";
    if (/starting/i.test(trimmed)) return "Starting";
    return trimmed;
  }

  async isRunning(): Promise<boolean> {
    return (await this.getStatusText()) === "Running";
  }

  async isStopped(): Promise<boolean> {
    return (await this.getStatusText()) === "Stopped";
  }

  // ── Power Controls ────────────────────────────────────────────────────────

  /**
   * Boot — NO modal, direct action; status → Running.
   * ALWAYS in DOM: disabled when Running, enabled when Stopped.
   */
  get bootButton(): Locator {
    return this.page.locator('button:has-text("Boot")').first();
  }

  /**
   * Shutdown power button (NOT the modal confirm button).
   * Bootstrap keeps modal HTML in DOM even when closed — exclude data-bs-dismiss buttons.
   */
  get shutdownButton(): Locator {
    return this.page
      .locator('button:has-text("Shutdown"):not([data-bs-dismiss="modal"])')
      .first();
  }

  /** Power Off power button (NOT the modal confirm button) */
  get powerOffButton(): Locator {
    return this.page
      .locator('button:has-text("Power Off"):not([data-bs-dismiss="modal"])')
      .first();
  }

  /** Restart power button (NOT the modal confirm button) */
  get restartButton(): Locator {
    return this.page
      .locator('button:has-text("Restart"):not([data-bs-dismiss="modal"])')
      .first();
  }

  get allPowerButtons(): Locator {
    return this.page.locator(
      'button:has-text("Boot"):not([data-bs-dismiss="modal"]), ' +
      'button:has-text("Shutdown"):not([data-bs-dismiss="modal"]), ' +
      'button:has-text("Power Off"):not([data-bs-dismiss="modal"]), ' +
      'button:has-text("Restart"):not([data-bs-dismiss="modal"])',
    );
  }

  // ── Bootstrap Power Action Modals ─────────────────────────────────────────
  //
  // Bootstrap adds .show when modal is open.
  // All cancel buttons are identical:  button.btn.btn-light.w-100[data-bs-dismiss="modal"]
  // data-bs-dismiss means the click itself closes the modal — we just wait ~300ms for animation.

  /** Active Bootstrap modal (.modal.show) */
  get activeModal(): Locator {
    return this.page.locator(".modal.show").first();
  }

  /** Cancel — confirmed identical HTML across ALL power modals */
  get modalCancelButton(): Locator {
    return this.page.locator(
      'button.btn.btn-light.w-100[data-bs-dismiss="modal"]',
    ).first();
  }

  /** Shutdown confirm — btn-primary inside the open modal */
  get shutdownConfirmButton(): Locator {
    return this.page
      .locator('.modal.show button.btn-primary:has-text("Shutdown")')
      .first();
  }

  /** Restart confirm — btn-primary inside the open modal */
  get restartConfirmButton(): Locator {
    return this.page
      .locator('.modal.show button.btn-primary:has-text("Restart")')
      .first();
  }

  /** Power Off confirm — btn-primary inside the open modal */
  get powerOffConfirmButton(): Locator {
    return this.page
      .locator('.modal.show button.btn-primary:has-text("Power Off")')
      .first();
  }

  /** Rebuild confirm — btn-danger, id="server-install-button" (confirmed from HTML) */
  get rebuildConfirmButton(): Locator {
    return this.page.locator("button#server-install-button").first();
  }

  /**
   * Click power button → wait for Bootstrap modal (.modal.show) →
   * assert title fragment is present → click Cancel → wait for animation.
   *
   * Returns { appeared, modalText }.
   * Safe — NEVER confirms the action.
   */
  async clickPowerAndCancel(
    button: Locator,
    expectedTitleFragment: string,
  ): Promise<{ appeared: boolean; modalText: string }> {
    await button.click();

    const modal = this.activeModal;
    const appeared = await modal
      .waitFor({ state: "visible", timeout: 8_000 })
      .then(() => true)
      .catch(() => false);

    if (!appeared) {
      return { appeared: false, modalText: "" };
    }

    const modalText = await modal.innerText().catch(() => "");

    if (!modalText.toLowerCase().includes(expectedTitleFragment.toLowerCase())) {
      console.log(
        `[WARN] Modal did not contain "${expectedTitleFragment}". Got: "${modalText.trim().slice(0, 150)}"`,
      );
    }

    await this.modalCancelButton.click();
    await this.page.waitForTimeout(400);

    return { appeared: true, modalText: modalText.trim() };
  }

  // ── Tab Navigation ────────────────────────────────────────────────────────

  tab(
    label: "Overview" | "Media" | "Options" | "Network" | "Storage" | "Backups" | "Sharing",
  ): Locator {
    return this.page
      .locator(
        `button:has-text("${label}"), a:has-text("${label}"), [role="tab"]:has-text("${label}")`,
      )
      .first();
  }

  get activeTab(): Locator {
    return this.page
      .locator(
        '[class*="active"][class*="tab"], [class*="nav-link"][class*="active"], [aria-selected="true"]',
      )
      .first();
  }

  async clickTab(
    label: "Overview" | "Media" | "Options" | "Network" | "Storage" | "Backups" | "Sharing",
  ): Promise<void> {
    await this.tab(label).click();
    await this.page.waitForTimeout(800);
    await this.page.waitForLoadState("networkidle").catch(() => null);
  }

  // ── Activity Table ────────────────────────────────────────────────────────
  //
  // Confirmed HTML structure (from attached DevTools snapshot):
  //   <table class="table table-normal mb-0">
  //     <thead><tr><th>Task</th><th>Requested</th><th>Duration</th><th>Progress</th></tr></thead>
  //     <tbody>
  //       <tr><td>Poweroff</td>...<span class="badge badge-active w-100">Complete</span></tr>
  //       <tr><td>Boot</td>...</tr>
  //       <tr id="debugNNNN" style="display:none">...</tr>  ← hidden debug rows
  //     </tbody>
  //   </table>

  get activityTable(): Locator {
    return this.page.locator("table.table.table-normal").first();
  }

  /** Visible activity rows — excludes hidden debug rows (id="debugNNNN") */
  get activityRows(): Locator {
    return this.page.locator("table.table.table-normal tbody tr:not([id^='debug'])");
  }

  get completeBadges(): Locator {
    return this.page.locator("span.badge.badge-active");
  }

  /** Returns task name strings from first column of activity table */
  async getActivityTaskNames(): Promise<string[]> {
    const count = await this.activityRows.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = (
        await this.activityRows.nth(i).locator("td").first().innerText().catch(() => "")
      ).trim();
      if (text) names.push(text);
    }
    return names;
  }

  // ── State Transition Helpers ──────────────────────────────────────────────
  //
  // VirtFusion polls state.json every ~2s:
  //   GET /server/534/resource/state.json → { data: { state: { state: "running" | "stopped" } } }
  //
  // While a task is in progress the debug row (id="debugNNNN") shows:
  //   <div class="v-loader v-loader-queue"></div>
  //
  // Task completion: <span class="badge badge-active w-100">Complete</span>
  //
  // Timeouts from real activity history:
  //   Boot:     3–5 sec   → allow 30s
  //   Poweroff: 4–5 sec   → allow 30s
  //   Shutdown: 6–43 sec  → allow 90s
  //   Restart:  ~10 sec   → allow 90s

  /**
   * Loader that appears on a power button while VirtFusion applies the action.
   * Selector: any spinner/loader on the power buttons area.
   */
  get buttonLoader(): Locator {
    return this.page.locator(
      '.v-loader, .spinner, [class*="loader"]',
    ).first();
  }

  /**
   * Active task loader in the activity table debug row.
   * Confirmed HTML: <div class="v-loader v-loader-queue"></div>
   * Appears while a task is queued/in-progress.
   */
  get activityTaskLoader(): Locator {
    return this.page.locator("div.v-loader.v-loader-queue").first();
  }

  /**
   * Progress bar inside the FIRST (most recent) activity row.
   * aria-valuenow goes 0→100 during task execution.
   */
  get latestTaskProgressBar(): Locator {
    return this.activityRows.first().locator(".progress-bar");
  }

  /**
   * Complete badge of the FIRST (most recent) activity row.
   */
  get latestTaskCompleteBadge(): Locator {
    return this.activityRows.first().locator("span.badge.badge-active");
  }

  /**
   * Task name from the first (most recent) row in the activity table.
   */
  async getLatestTaskName(): Promise<string> {
    return (
      await this.activityRows.first().locator("td").first().innerText().catch(() => "")
    ).trim();
  }

  /**
   * Row count snapshot — used to detect when a NEW task row appears.
   */
  async getActivityRowCount(): Promise<number> {
    return this.activityRows.count();
  }

  /**
   * Wait until a new activity row appears (compared to rowCountBefore).
   * Polls every 500ms for up to 15s.
   */
  async waitForNewActivityRow(rowCountBefore: number, timeoutMs = 15_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const current = await this.activityRows.count().catch(() => rowCountBefore);
      if (current > rowCountBefore) return;
      await this.page.waitForTimeout(500);
    }
    throw new Error(`No new activity row appeared within ${timeoutMs}ms`);
  }

  /**
   * Wait until the most recent task shows Complete badge (progress = 100%).
   * Times out after `timeoutMs` ms.
   */
  async waitForLatestTaskComplete(timeoutMs = 90_000): Promise<void> {
    await expect(this.latestTaskCompleteBadge).toBeVisible({ timeout: timeoutMs });
  }

  /**
   * Wait until the status badge shows the expected state.
   * Polls the live DOM — VirtFusion updates div.p-3 via its ~2s poller.
   */
  async waitForStatus(
    expected: "Running" | "Stopped",
    timeoutMs = 90_000,
  ): Promise<void> {
    await expect(
      this.page
        .locator("div.p-3")
        .filter({ hasText: new RegExp(expected, "i") })
        .first(),
    ).toBeVisible({ timeout: timeoutMs });
  }

  /**
   * Ensure server is Running. If Stopped → boot it and wait for Running.
   * Used in beforeEach to normalise state before a test.
   */
  async ensureRunning(timeoutMs = 60_000): Promise<void> {
    const status = await this.getStatusText();
    if (status.includes("Running")) return;

    console.log(`[SETUP] Server is "${status}" — booting before test...`);
    await expect(this.bootButton).toBeVisible({ timeout: 10_000 });
    await expect(this.bootButton).toBeEnabled({ timeout: 10_000 });
    await this.bootButton.click();
    await this.waitForStatus("Running", timeoutMs);
    console.log("[SETUP] Server is Running ✓");
  }

  /**
   * Ensure server is Stopped. If Running → power off and wait for Stopped.
   * Used in beforeEach to normalise state before a test.
   */
  async ensureStopped(timeoutMs = 60_000): Promise<void> {
    const status = await this.getStatusText();
    if (status.includes("Stopped")) return;

    console.log(`[SETUP] Server is "${status}" — powering off before test...`);
    await this.powerOffButton.click();
    const modal = this.activeModal;
    const appeared = await modal
      .waitFor({ state: "visible", timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    if (appeared) {
      await this.powerOffConfirmButton.click();
    }
    await this.waitForStatus("Stopped", timeoutMs);
    console.log("[SETUP] Server is Stopped ✓");
  }

  // ── Alerts ────────────────────────────────────────────────────────────────

  get successAlert(): Locator {
    return this.page.locator('[class*="alert-success"], [class*="toast-success"]').first();
  }

  get errorAlert(): Locator {
    return this.page
      .locator('[class*="alert-danger"], [class*="alert-error"], [class*="toast-error"]')
      .first();
  }
}
