/**
 * vps.panel.power.actions.spec.ts
 * ─────────────────────────────────
 * Тесты управления питанием VPS сервера с реальными переходами состояний.
 *
 * Каждый тест:
 *   1. Нормализует состояние сервера (ensureRunning / ensureStopped)
 *   2. Запоминает кол-во строк в таблице активности (snapshot)
 *   3. Выполняет действие (клик → модал → confirm или прямой Boot)
 *   4. Ждёт появления новой строки в таблице активности
 *   5. Ждёт Complete badge на новой строке
 *   6. Проверяет финальный статус сервера (Running / Stopped)
 *
 * Порядок тестов спланирован так, чтобы минимизировать лишние операции:
 *   Running → [Shutdown] → Stopped → [Boot] → Running
 *   Running → [Power Off] → Stopped → [Boot] → Running
 *   Running → [Restart]  → Running
 *
 * Таймауты основаны на реальных данных activity history (May 2026):
 *   Boot:     3–5 сек   → 30s
 *   Poweroff: 4–5 сек   → 30s
 *   Shutdown: 6–43 сек  → 90s
 *   Restart:  ~10 сек   → 90s
 *
 * Поллинг статуса: VirtFusion обновляет state.json каждые ~2 сек.
 *
 * Запуск:
 *   npx playwright test tests/vps.panel.power.actions.spec.ts --project=chromium
 *   npx playwright test tests/vps.panel.power.actions.spec.ts --project=chromium --headed
 *
 * ── ПОДТВЕРЖДЁННЫЕ СЕЛЕКТОРЫ (DevTools, May 2026) ──────────────────────────
 *
 * Статус:      div.p-3 — текст "Running" / "Stopped"
 * Boot:        button[data-action="boot_server"]     — прямое действие, без модала
 * Shutdown:    button[data-action="shutdown_server"] — открывает модал → btn-primary "Shutdown"
 * Power Off:   button[data-action="poweroff_server"] — открывает модал → btn-primary "Power Off"
 * Restart:     button[data-action="restart_server"]  — открывает модал → btn-primary "Restart"
 * Cancel:      button.btn.btn-light.w-100[data-bs-dismiss="modal"]
 *
 * Activity table: table.table.table-normal
 *   Строка в процессе: <div class="v-loader v-loader-queue"> в debug-tr (скрытом)
 *   Строка завершена:  <span class="badge badge-active w-100">Complete</span>
 *   Progress bar:      .progress-bar[aria-valuenow="100"] при завершении
 */
import { test, expect, type Browser, type BrowserContext } from "@playwright/test";
import { VpsPanelServerPage } from "../pages/VpsPanelServerPage.new";
import { loginAndSaveSession, STORAGE_STATE_PATH, TEST_SERVER_UUID } from "../utils/auth";

// ── Config ────────────────────────────────────────────────────────────────────

test.use({ viewport: { width: 1440, height: 900 } });

// Все тесты в файле выполняются последовательно (не параллельно),
// потому что они работают с одним сервером и меняют его состояние.
test.describe.configure({ mode: "serial" });

// ── Shared state ──────────────────────────────────────────────────────────────

let sharedContext: BrowserContext;
let serverPage: VpsPanelServerPage;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Открывает модал подтверждения и кликает confirm-кнопку.
 * Ждёт появления модала, кликает confirm.
 * Не ждёт закрытия модала — это происходит автоматически через data-bs-dismiss.
 */
async function confirmModal(sp: VpsPanelServerPage, confirmSelector: string): Promise<void> {
  await expect(sp.activeModal).toBeVisible({ timeout: 8_000 });
  const confirmBtn = sp.page.locator(confirmSelector).first();
  await expect(confirmBtn).toBeVisible({ timeout: 5_000 });
  await confirmBtn.click();
  // data-bs-dismiss закрывает модал автоматически при клике
  await sp.page.waitForTimeout(300);
}

// ── Setup ─────────────────────────────────────────────────────────────────────

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginAndSaveSession(browser);
  sharedContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await sharedContext.newPage();
  serverPage = new VpsPanelServerPage(page, TEST_SERVER_UUID);
  await serverPage.goto();

  // Ждём стабильного состояния перед началом всех тестов
  const initialStatus = await serverPage.getStatusText();
  console.log(`[SETUP] Initial server status: "${initialStatus}"`);
});

test.afterAll(async () => {
  // После всех тестов возвращаем сервер в Running (рабочее состояние)
  try {
    const status = await serverPage.getStatusText();
    if (!status.includes("Running")) {
      console.log(`[TEARDOWN] Server is "${status}" — restoring to Running...`);
      await serverPage.ensureRunning(60_000);
      console.log("[TEARDOWN] Server restored to Running ✓");
    }
  } catch (e) {
    console.log(`[TEARDOWN] Could not restore server state: ${e}`);
  }
  await sharedContext.close();
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — Shutdown: Running → Stopped
// ══════════════════════════════════════════════════════════════════════════════

test.describe("VPS Power — Shutdown: Running → Stopped", () => {
  test("1.1 нормализация: сервер должен быть Running", async () => {
    await serverPage.goto();
    await serverPage.ensureRunning(60_000);

    const status = await serverPage.getStatusText();
    console.log(`[T1.1] Status before Shutdown: "${status}"`);
    expect(status).toContain("Running");
  });

  test("1.2 кнопки при Running: Shutdown/Power Off/Restart видны и активны, Boot скрыт или отключён", async () => {
    await expect(serverPage.shutdownButton).toBeVisible({ timeout: 10_000 });
    await expect(serverPage.shutdownButton).toBeEnabled({ timeout: 5_000 });

    await expect(serverPage.powerOffButton).toBeVisible({ timeout: 5_000 });
    await expect(serverPage.powerOffButton).toBeEnabled({ timeout: 5_000 });

    await expect(serverPage.restartButton).toBeVisible({ timeout: 5_000 });
    await expect(serverPage.restartButton).toBeEnabled({ timeout: 5_000 });

    // Boot должна быть недоступна когда Running
    const bootVisible = await serverPage.bootButton.isVisible().catch(() => false);
    const bootEnabled = await serverPage.bootButton.isEnabled().catch(() => false);
    console.log(`[T1.2] Boot visible=${bootVisible} enabled=${bootEnabled}`);
    if (bootVisible) {
      expect(bootEnabled).toBe(false);
    }

    console.log("[T1.2] Button state at Running verified ✓");
  });

  test("1.3 Shutdown → модал → confirm → новая строка в activity table", async () => {
    const rowsBefore = await serverPage.getActivityRowCount();
    console.log(`[T1.3] Activity rows before Shutdown: ${rowsBefore}`);

    // Клик Shutdown → открывается модал
    await serverPage.shutdownButton.click();
    await confirmModal(
      serverPage,
      'button.btn.btn-primary.w-100[data-bs-dismiss="modal"]:has-text("Shutdown")',
    );

    console.log("[T1.3] Shutdown confirmed, waiting for new activity row...");

    // Новая строка должна появиться
    await serverPage.waitForNewActivityRow(rowsBefore, 15_000);

    const latestTask = await serverPage.getLatestTaskName();
    console.log(`[T1.3] Latest activity task: "${latestTask}"`);
    expect(latestTask).toBe("Shutdown");
  });

  test("1.4 Shutdown → task Complete в activity table (ждём до 90 сек)", async () => {
    console.log("[T1.4] Waiting for Shutdown task to complete...");
    await serverPage.waitForLatestTaskComplete(90_000);

    const latestTask = await serverPage.getLatestTaskName();
    console.log(`[T1.4] Task "${latestTask}" — Complete ✓`);
    expect(latestTask).toBe("Shutdown");

    // Проверяем progress bar = 100%
    const progressValue = await serverPage.latestTaskProgressBar
      .getAttribute("aria-valuenow")
      .catch(() => null);
    console.log(`[T1.4] Progress bar aria-valuenow: "${progressValue}"`);
    if (progressValue !== null) {
      expect(progressValue).toBe("100");
    }
  });

  test("1.5 после Shutdown статус сервера = Stopped", async () => {
    await serverPage.waitForStatus("Stopped", 30_000);

    const status = await serverPage.getStatusText();
    console.log(`[T1.5] Status after Shutdown: "${status}"`);
    expect(status).toContain("Stopped");
  });

  test("1.6 кнопки при Stopped: Boot активна, Shutdown/Power Off/Restart недоступны", async () => {
    await expect(serverPage.bootButton).toBeVisible({ timeout: 10_000 });
    await expect(serverPage.bootButton).toBeEnabled({ timeout: 5_000 });
    console.log("[T1.6] Boot button visible and enabled at Stopped ✓");

    // Shutdown/PowerOff/Restart должны быть отключены или скрыты
    for (const [name, btn] of [
      ["Shutdown", serverPage.shutdownButton],
      ["Power Off", serverPage.powerOffButton],
      ["Restart", serverPage.restartButton],
    ] as const) {
      const visible = await btn.isVisible().catch(() => false);
      const enabled = await btn.isEnabled().catch(() => false);
      console.log(`[T1.6] ${name}: visible=${visible} enabled=${enabled}`);
      if (visible) {
        expect(enabled).toBe(false);
      }
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — Boot: Stopped → Running
// ══════════════════════════════════════════════════════════════════════════════

test.describe("VPS Power — Boot: Stopped → Running", () => {
  test("2.1 нормализация: сервер должен быть Stopped", async () => {
    const status = await serverPage.getStatusText();
    console.log(`[T2.1] Status before Boot: "${status}"`);
    // Должен быть Stopped после предыдущего suite — не делаем лишних действий
    expect(status).toContain("Stopped");
  });

  test("2.2 Boot — прямой клик (без модала) → новая строка Boot в activity table", async () => {
    const rowsBefore = await serverPage.getActivityRowCount();
    console.log(`[T2.2] Activity rows before Boot: ${rowsBefore}`);

    // Boot — НЕТ модала подтверждения, прямое действие
    await expect(serverPage.bootButton).toBeEnabled({ timeout: 5_000 });
    await serverPage.bootButton.click();

    console.log("[T2.2] Boot clicked, waiting for new activity row...");
    await serverPage.waitForNewActivityRow(rowsBefore, 15_000);

    const latestTask = await serverPage.getLatestTaskName();
    console.log(`[T2.2] Latest activity task: "${latestTask}"`);
    expect(latestTask).toBe("Boot");
  });

  test("2.3 Boot → task Complete в activity table (ждём до 30 сек)", async () => {
    console.log("[T2.3] Waiting for Boot task to complete...");
    await serverPage.waitForLatestTaskComplete(30_000);

    const latestTask = await serverPage.getLatestTaskName();
    console.log(`[T2.3] Task "${latestTask}" — Complete ✓`);
    expect(latestTask).toBe("Boot");

    const progressValue = await serverPage.latestTaskProgressBar
      .getAttribute("aria-valuenow")
      .catch(() => null);
    console.log(`[T2.3] Progress bar aria-valuenow: "${progressValue}"`);
    if (progressValue !== null) {
      expect(progressValue).toBe("100");
    }
  });

  test("2.4 после Boot статус сервера = Running", async () => {
    await serverPage.waitForStatus("Running", 30_000);

    const status = await serverPage.getStatusText();
    console.log(`[T2.4] Status after Boot: "${status}"`);
    expect(status).toContain("Running");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — Power Off: Running → Stopped
// ══════════════════════════════════════════════════════════════════════════════

test.describe("VPS Power — Power Off: Running → Stopped", () => {
  test("3.1 нормализация: сервер должен быть Running", async () => {
    await serverPage.ensureRunning(60_000);
    const status = await serverPage.getStatusText();
    console.log(`[T3.1] Status before Power Off: "${status}"`);
    expect(status).toContain("Running");
  });

  test("3.2 Power Off → модал → confirm → новая строка Poweroff в activity table", async () => {
    const rowsBefore = await serverPage.getActivityRowCount();
    console.log(`[T3.2] Activity rows before Power Off: ${rowsBefore}`);

    await serverPage.powerOffButton.click();
    await confirmModal(
      serverPage,
      'button.btn.btn-primary.w-100[data-bs-dismiss="modal"]:has-text("Power Off")',
    );

    console.log("[T3.2] Power Off confirmed, waiting for new activity row...");
    await serverPage.waitForNewActivityRow(rowsBefore, 15_000);

    const latestTask = await serverPage.getLatestTaskName();
    console.log(`[T3.2] Latest activity task: "${latestTask}"`);
    expect(latestTask).toBe("Poweroff");
  });

  test("3.3 Power Off → task Complete в activity table (ждём до 30 сек)", async () => {
    console.log("[T3.3] Waiting for Poweroff task to complete...");
    await serverPage.waitForLatestTaskComplete(30_000);

    const latestTask = await serverPage.getLatestTaskName();
    console.log(`[T3.3] Task "${latestTask}" — Complete ✓`);
    expect(latestTask).toBe("Poweroff");
  });

  test("3.4 после Power Off статус сервера = Stopped", async () => {
    await serverPage.waitForStatus("Stopped", 30_000);

    const status = await serverPage.getStatusText();
    console.log(`[T3.4] Status after Power Off: "${status}"`);
    expect(status).toContain("Stopped");
  });

  // Восстанавливаем Running для следующего suite
  test("3.5 boot после Power Off → Running (восстановление для Restart suite)", async () => {
    const rowsBefore = await serverPage.getActivityRowCount();
    await serverPage.bootButton.click();
    await serverPage.waitForNewActivityRow(rowsBefore, 15_000);
    await serverPage.waitForLatestTaskComplete(30_000);
    await serverPage.waitForStatus("Running", 30_000);

    const status = await serverPage.getStatusText();
    console.log(`[T3.5] Server restored to: "${status}"`);
    expect(status).toContain("Running");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — Restart: Running → Running
// ══════════════════════════════════════════════════════════════════════════════

test.describe("VPS Power — Restart: Running → Running", () => {
  test("4.1 нормализация: сервер должен быть Running", async () => {
    await serverPage.ensureRunning(60_000);
    const status = await serverPage.getStatusText();
    console.log(`[T4.1] Status before Restart: "${status}"`);
    expect(status).toContain("Running");
  });

  test("4.2 Restart → модал → confirm → новая строка Restart в activity table", async () => {
    const rowsBefore = await serverPage.getActivityRowCount();
    console.log(`[T4.2] Activity rows before Restart: ${rowsBefore}`);

    await serverPage.restartButton.click();
    await confirmModal(
      serverPage,
      'button.btn.btn-primary.w-100[data-bs-dismiss="modal"]:has-text("Restart")',
    );

    console.log("[T4.2] Restart confirmed, waiting for new activity row...");
    await serverPage.waitForNewActivityRow(rowsBefore, 15_000);

    const latestTask = await serverPage.getLatestTaskName();
    console.log(`[T4.2] Latest activity task: "${latestTask}"`);
    // VirtFusion может писать "Restart" или "Reboot"
    expect(latestTask).toMatch(/restart|reboot/i);
  });

  test("4.3 Restart → task Complete в activity table (ждём до 90 сек)", async () => {
    console.log("[T4.3] Waiting for Restart task to complete...");
    await serverPage.waitForLatestTaskComplete(90_000);

    const latestTask = await serverPage.getLatestTaskName();
    console.log(`[T4.3] Task "${latestTask}" — Complete ✓`);
    expect(latestTask).toMatch(/restart|reboot/i);
  });

  test("4.4 после Restart статус сервера = Running (не Stopped)", async () => {
    await serverPage.waitForStatus("Running", 60_000);

    const status = await serverPage.getStatusText();
    console.log(`[T4.4] Status after Restart: "${status}"`);
    expect(status).toContain("Running");
    expect(status).not.toContain("Stopped");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 5 — Activity table: проверка записей после всех действий
// ══════════════════════════════════════════════════════════════════════════════

test.describe("VPS Power — Activity table после всех операций", () => {
  test("5.1 в таблице есть записи Boot, Shutdown, Poweroff от этого запуска", async () => {
    await expect(serverPage.activityTable).toBeVisible({ timeout: 10_000 });

    const taskNames = await serverPage.getActivityTaskNames();
    console.log(`[T5.1] All activity tasks: [${taskNames.join(", ")}]`);

    const hasBoot = taskNames.some((t) => t.toLowerCase().includes("boot"));
    const hasShutdown = taskNames.some((t) => t.toLowerCase().includes("shutdown"));
    const hasPoweroff = taskNames.some((t) =>
      ["poweroff", "power off"].some((k) => t.toLowerCase().includes(k)),
    );

    expect(hasBoot).toBe(true);
    expect(hasShutdown).toBe(true);
    expect(hasPoweroff).toBe(true);

    console.log("[T5.1] Boot, Shutdown, Poweroff all present in activity table ✓");
  });

  test("5.2 все видимые строки имеют статус Complete (нет незавершённых задач)", async () => {
    const rowCount = await serverPage.activityRows.count();
    const badgeCount = await serverPage.completeBadges.count();

    console.log(`[T5.2] Total activity rows: ${rowCount}, Complete badges: ${badgeCount}`);

    // Каждая видимая строка должна иметь Complete badge
    // (debug-строки скрыты и исключены из activityRows)
    expect(badgeCount).toBeGreaterThanOrEqual(rowCount);
  });

  test("5.3 progress bar последней задачи = 100%", async () => {
    const progressValue = await serverPage.latestTaskProgressBar
      .getAttribute("aria-valuenow")
      .catch(() => null);
    console.log(`[T5.3] Latest task progress bar: "${progressValue}"`);
    if (progressValue !== null) {
      expect(progressValue).toBe("100");
    }
  });

  test("5.4 таблица содержит реальные duration (не 0 сек)", async () => {
    const firstRow = serverPage.activityRows.first();
    const rowText = await firstRow.innerText().catch(() => "");
    console.log(`[T5.4] First row text: "${rowText.replace(/\s+/g, " ").trim()}"`);

    // Duration должна быть в виде "N sec" или "N min"
    expect(rowText).toMatch(/\d+\s*(sec|min)/i);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 6 — Модалы: структура и содержимое (без выполнения действий)
// ══════════════════════════════════════════════════════════════════════════════

test.describe("VPS Power — Структура модалов подтверждения", () => {
  test("6.1 нормализация: сервер Running для проверки модалов", async () => {
    await serverPage.ensureRunning(60_000);
    const status = await serverPage.getStatusText();
    expect(status).toContain("Running");
  });

  test("6.2 Shutdown модал: заголовок + вопрос + confirm btn-primary + cancel btn-light", async () => {
    await serverPage.shutdownButton.click();
    await expect(serverPage.activeModal).toBeVisible({ timeout: 8_000 });

    const modalText = await serverPage.activeModal.innerText();
    expect(modalText).toContain("Shutdown Server");
    expect(modalText).toContain("Are you sure you want to shutdown this server?");

    await expect(
      serverPage.page.locator(
        'button.btn.btn-primary.w-100[data-bs-dismiss="modal"]:has-text("Shutdown")',
      ).first(),
    ).toBeVisible({ timeout: 5_000 });

    await expect(serverPage.modalCancelButton).toBeVisible({ timeout: 5_000 });
    console.log("[T6.2] Shutdown modal structure verified ✓");

    await serverPage.modalCancelButton.click();
    await serverPage.page.waitForTimeout(400);
    await expect(serverPage.activeModal).not.toBeVisible({ timeout: 5_000 });
  });

  test("6.3 Power Off модал: заголовок + вопрос + confirm + cancel", async () => {
    await serverPage.powerOffButton.click();
    await expect(serverPage.activeModal).toBeVisible({ timeout: 8_000 });

    const modalText = await serverPage.activeModal.innerText();
    expect(modalText).toContain("Power Off Server");
    expect(modalText).toContain("Are you sure you want to power off this server?");

    await expect(
      serverPage.page.locator(
        'button.btn.btn-primary.w-100[data-bs-dismiss="modal"]:has-text("Power Off")',
      ).first(),
    ).toBeVisible({ timeout: 5_000 });

    console.log("[T6.3] Power Off modal structure verified ✓");

    await serverPage.modalCancelButton.click();
    await serverPage.page.waitForTimeout(400);
    await expect(serverPage.activeModal).not.toBeVisible({ timeout: 5_000 });
  });

  test("6.4 Restart модал: заголовок + вопрос + confirm + cancel", async () => {
    await serverPage.restartButton.click();
    await expect(serverPage.activeModal).toBeVisible({ timeout: 8_000 });

    const modalText = await serverPage.activeModal.innerText();
    expect(modalText).toContain("Restart Server");
    expect(modalText).toContain("Are you sure you want to restart this server?");

    await expect(
      serverPage.page.locator(
        'button.btn.btn-primary.w-100[data-bs-dismiss="modal"]:has-text("Restart")',
      ).first(),
    ).toBeVisible({ timeout: 5_000 });

    console.log("[T6.4] Restart modal structure verified ✓");

    await serverPage.modalCancelButton.click();
    await serverPage.page.waitForTimeout(400);
    await expect(serverPage.activeModal).not.toBeVisible({ timeout: 5_000 });
  });

  test("6.5 Cancel закрывает модал — статус сервера НЕ изменился", async () => {
    const statusBefore = await serverPage.getStatusText();
    console.log(`[T6.5] Status before modal cancel check: "${statusBefore}"`);

    await serverPage.shutdownButton.click();
    await expect(serverPage.activeModal).toBeVisible({ timeout: 8_000 });
    await serverPage.modalCancelButton.click();
    await serverPage.page.waitForTimeout(600);
    await expect(serverPage.activeModal).not.toBeVisible({ timeout: 5_000 });

    const statusAfter = await serverPage.getStatusText();
    console.log(`[T6.5] Status after cancel: "${statusAfter}"`);
    expect(statusAfter).toBe(statusBefore);
    console.log("[T6.5] Cancel does not change server state ✓");
  });
});
