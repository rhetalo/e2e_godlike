/**
 * vps.panel.power.actions.spec.ts
 * ─────────────────────────────────
 * Управление питанием VPS с реальными переходами состояний (stateful, serial).
 *
 * Каждый power-тест: нормализует состояние → действие (клик → модал → confirm,
 * либо прямой Boot) → ждёт новую строку в activity table → ждёт Complete →
 * проверяет финальный статус. afterAll возвращает сервер в Running.
 *
 * State-machine:
 *   Running →[Shutdown]→ Stopped →[Boot]→ Running →[Power Off]→ Stopped →[Boot]→
 *   Running →[Restart]→ Running.
 *
 * Таймауты из реальной activity history (May 2026): Boot/Poweroff 3–5с,
 * Shutdown 6–43с, Restart ~10с. Статус VirtFusion обновляет через ~2с поллинг.
 * Слитые тесты длиннее микро-шагов → test.setTimeout(180s) (см. teardown-флоки панелей).
 *
 * ── СЕЛЕКТОРЫ: все через VpsPanelServerPage (data-action на кнопках НЕТ). ──
 *   Status div.p-3; Boot всегда в DOM (disabled@Running); Shutdown/Power Off/Restart
 *   открывают .modal.show; confirm = *ConfirmButton геттеры PO; activity table.normal.
 *
 * Запуск:
 *   npx playwright test tests/vps/panel/vps.panel.power.actions.spec.ts --project=chromium
 */
import { test, expect, type Locator, type Browser, type BrowserContext } from "@playwright/test";
import { VpsPanelServerPage } from "../../../pages/VpsPanelServerPage";
import { loginAndSaveSession, STORAGE_STATE_PATH, TEST_SERVER_UUID } from "../../../utils/auth";

test.use({ viewport: { width: 1440, height: 900 } });

// Серийно: все тесты работают с одним сервером и меняют его состояние.
test.describe.configure({ mode: "serial" });

let sharedContext: BrowserContext;
let serverPage: VpsPanelServerPage;

/**
 * Открыть модал подтверждения и нажать confirm-кнопку (геттер PO).
 * data-bs-dismiss закрывает модал сам — ждём его скрытия, без waitForTimeout.
 */
async function confirmAction(sp: VpsPanelServerPage, confirmButton: Locator): Promise<void> {
  await expect(sp.activeModal).toBeVisible({ timeout: 8_000 });
  await expect(confirmButton).toBeVisible({ timeout: 5_000 });
  await confirmButton.click();
  await expect(sp.activeModal).not.toBeVisible({ timeout: 5_000 });
}

/** Действие через activity table: дождаться новой строки и её завершения. */
async function awaitTaskComplete(
  sp: VpsPanelServerPage,
  rowsBefore: number,
  completeTimeout: number,
): Promise<string> {
  await sp.waitForNewActivityRow(rowsBefore, 15_000);
  await sp.waitForLatestTaskComplete(completeTimeout);
  return sp.getLatestTaskName();
}

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginAndSaveSession(browser);
  sharedContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await sharedContext.newPage();
  serverPage = new VpsPanelServerPage(page, TEST_SERVER_UUID);
  await serverPage.goto();
});

test.afterAll(async () => {
  // Возвращаем сервер в рабочее состояние Running после всех операций.
  try {
    if (!(await serverPage.getStatusText()).includes("Running")) {
      await serverPage.ensureRunning(60_000);
    }
  } catch (e) {
    console.log(`[TEARDOWN] Не удалось восстановить сервер в Running: ${e}`);
  } finally {
    await sharedContext.close();
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// Power-переходы (SUITE 1–4 свёрнуты: один тест на действие, шаги внутри)
// ══════════════════════════════════════════════════════════════════════════════
test.describe("@critical VPS-питание — переходы состояний", () => {
  test("Shutdown: Running → Stopped (модал → confirm → activity → статус)", async () => {
    test.setTimeout(180_000);
    await serverPage.goto();

    await test.step("нормализация + кнопки при Running (Boot отключён)", async () => {
      await serverPage.ensureRunning(60_000);
      await expect(serverPage.shutdownButton).toBeEnabled({ timeout: 10_000 });
      await expect(serverPage.powerOffButton).toBeEnabled({ timeout: 5_000 });
      await expect(serverPage.restartButton).toBeEnabled({ timeout: 5_000 });
      // Boot всегда в DOM (подтверждено в PO) и при Running — disabled.
      await expect(serverPage.bootButton).toBeDisabled({ timeout: 5_000 });
    });

    await test.step("Shutdown → модал → confirm → задача Shutdown завершилась", async () => {
      const rowsBefore = await serverPage.getActivityRowCount();
      await serverPage.shutdownButton.click();
      await confirmAction(serverPage, serverPage.shutdownConfirmButton);
      expect(await awaitTaskComplete(serverPage, rowsBefore, 90_000)).toBe("Shutdown");
    });

    await test.step("статус = Stopped, активна только Boot", async () => {
      await serverPage.waitForStatus("Stopped", 30_000);
      expect(await serverPage.getStatusText()).toContain("Stopped");
      await expect(serverPage.bootButton).toBeEnabled({ timeout: 10_000 });
    });
  });

  test("Boot: Stopped → Running (прямой клик, без модала)", async () => {
    test.setTimeout(180_000);

    await test.step("предусловие: сервер Stopped", async () => {
      await serverPage.ensureStopped(60_000);
      expect(await serverPage.getStatusText()).toContain("Stopped");
    });

    await test.step("Boot → задача Boot завершилась → статус Running", async () => {
      const rowsBefore = await serverPage.getActivityRowCount();
      await expect(serverPage.bootButton).toBeEnabled({ timeout: 5_000 });
      await serverPage.bootButton.click();
      expect(await awaitTaskComplete(serverPage, rowsBefore, 30_000)).toBe("Boot");
      await serverPage.waitForStatus("Running", 30_000);
      expect(await serverPage.getStatusText()).toContain("Running");
    });
  });

  test("Power Off: Running → Stopped (модал → confirm)", async () => {
    test.setTimeout(180_000);

    await test.step("нормализация: Running", async () => {
      await serverPage.ensureRunning(60_000);
      expect(await serverPage.getStatusText()).toContain("Running");
    });

    await test.step("Power Off → модал → confirm → задача Poweroff завершилась", async () => {
      const rowsBefore = await serverPage.getActivityRowCount();
      await serverPage.powerOffButton.click();
      await confirmAction(serverPage, serverPage.powerOffConfirmButton);
      expect(await awaitTaskComplete(serverPage, rowsBefore, 30_000)).toBe("Poweroff");
      await serverPage.waitForStatus("Stopped", 30_000);
      expect(await serverPage.getStatusText()).toContain("Stopped");
    });
  });

  test("Restart: Running → Running (модал → confirm, без перехода в Stopped)", async () => {
    test.setTimeout(180_000);

    await test.step("нормализация: Running (boot после Power Off при необходимости)", async () => {
      await serverPage.ensureRunning(60_000);
      expect(await serverPage.getStatusText()).toContain("Running");
    });

    await test.step("Restart → модал → confirm → задача Restart/Reboot завершилась", async () => {
      const rowsBefore = await serverPage.getActivityRowCount();
      await serverPage.restartButton.click();
      await confirmAction(serverPage, serverPage.restartConfirmButton);
      // VirtFusion может писать "Restart" или "Reboot".
      expect(await awaitTaskComplete(serverPage, rowsBefore, 90_000)).toMatch(/restart|reboot/i);
    });

    await test.step("итоговый статус Running (не Stopped)", async () => {
      await serverPage.waitForStatus("Running", 60_000);
      const status = await serverPage.getStatusText();
      expect(status).toContain("Running");
      expect(status).not.toContain("Stopped");
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 5 — Activity table после всех операций
// ══════════════════════════════════════════════════════════════════════════════
test.describe("@regression VPS-питание — Activity table после операций", () => {
  test("записи Boot/Shutdown/Poweroff присутствуют, все Complete, прогресс 100%, реальный duration", async () => {
    await expect(serverPage.activityTable).toBeVisible({ timeout: 10_000 });

    await test.step("в таблице есть Boot, Shutdown и Poweroff от этого запуска", async () => {
      const tasks = (await serverPage.getActivityTaskNames()).map((t) => t.toLowerCase());
      expect(tasks.some((t) => t.includes("boot"))).toBe(true);
      expect(tasks.some((t) => t.includes("shutdown"))).toBe(true);
      expect(tasks.some((t) => t.includes("poweroff") || t.includes("power off"))).toBe(true);
    });

    await test.step("каждая видимая строка имеет статус Complete", async () => {
      const rowCount = await serverPage.activityRows.count();
      expect(await serverPage.completeBadges.count()).toBeGreaterThanOrEqual(rowCount);
    });

    await test.step("прогресс последней задачи = 100%", async () => {
      await expect(serverPage.latestTaskProgressBar).toHaveAttribute("aria-valuenow", "100", {
        timeout: 10_000,
      });
    });

    await test.step("в строке реальный duration (N sec / N min)", async () => {
      const rowText = await serverPage.activityRows.first().innerText().catch(() => "");
      expect(rowText).toMatch(/\d+\s*(sec|min)/i);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 6 — Структура модалов подтверждения (без выполнения действий)
// ══════════════════════════════════════════════════════════════════════════════
test.describe("@regression VPS-питание — структура модалов подтверждения", () => {
  const MODALS = [
    {
      name: "Shutdown",
      button: () => serverPage.shutdownButton,
      confirm: () => serverPage.shutdownConfirmButton,
      title: "Shutdown Server",
      question: "Are you sure you want to shutdown this server?",
    },
    {
      name: "Power Off",
      button: () => serverPage.powerOffButton,
      confirm: () => serverPage.powerOffConfirmButton,
      title: "Power Off Server",
      question: "Are you sure you want to power off this server?",
    },
    {
      name: "Restart",
      button: () => serverPage.restartButton,
      confirm: () => serverPage.restartConfirmButton,
      title: "Restart Server",
      question: "Are you sure you want to restart this server?",
    },
  ] as const;

  test("каждый модал: заголовок + вопрос + confirm + cancel; Cancel не меняет статус", async () => {
    test.setTimeout(120_000);
    await serverPage.ensureRunning(60_000);
    const statusBefore = await serverPage.getStatusText();

    for (const m of MODALS) {
      await test.step(`${m.name}: модал с заголовком, вопросом и кнопками`, async () => {
        await m.button().click();
        await expect(serverPage.activeModal).toBeVisible({ timeout: 8_000 });
        await expect(serverPage.activeModal).toContainText(m.title);
        await expect(serverPage.activeModal).toContainText(m.question);
        await expect(m.confirm()).toBeVisible({ timeout: 5_000 });
        await expect(serverPage.modalCancelButton).toBeVisible({ timeout: 5_000 });
        await serverPage.modalCancelButton.click();
        await expect(serverPage.activeModal).not.toBeVisible({ timeout: 5_000 });
      });
    }

    await test.step("после всех Cancel статус сервера не изменился", async () => {
      expect(await serverPage.getStatusText()).toBe(statusBefore);
    });
  });
});
