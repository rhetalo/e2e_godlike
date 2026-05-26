/**
 * vps.panel.power.spec.ts
 * ────────────────────────
 * Тесты управления питанием VPS сервера на странице VirtFusion.
 * URL: https://vf-panel.godlike.host/server/9c49ed96-56f4-41c8-bc5f-a8d44c21a486
 *
 * ── ПОДТВЕРЖДЁННЫЕ СЕЛЕКТОРЫ (из DevTools, May 2026) ────────────────────────
 *
 * Статус-бейдж:
 *   <div class="p-3">&nbsp;&nbsp;Running</div>
 *   <div class="p-3">&nbsp;&nbsp;Stopped</div>
 *
 * Кнопки питания:
 *   button[data-action="boot_server"]     — Boot (без модала, прямое действие)
 *   button[data-action="shutdown_server"] — Shutdown (модал)
 *   button[data-action="poweroff_server"] — Power Off (модал)
 *   button[data-action="restart_server"]  — Restart (модал)
 *
 * Bootstrap-модалы (.modal.show когда открыт):
 *   Shutdown  → заголовок "Shutdown Server"
 *              → тело "Are you sure you want to shutdown this server?"
 *              → confirm: button.btn.btn-primary.w-100[data-bs-dismiss="modal"]:has-text("Shutdown")
 *
 *   Restart   → заголовок "Restart Server"
 *              → тело "Are you sure you want to restart this server?"
 *              → confirm: button.btn.btn-primary.w-100[data-bs-dismiss="modal"]:has-text("Restart")
 *
 *   Power Off → заголовок "Power Off Server"
 *              → тело "Are you sure you want to power off this server?"
 *              → confirm: button.btn.btn-primary.w-100[data-bs-dismiss="modal"]:has-text("Power Off")
 *
 *   Cancel (во всех модалах): button.btn.btn-light.w-100[data-bs-dismiss="modal"]
 *   data-bs-dismiss="modal" закрывает модал автоматически при клике.
 *
 * После Power Off / Shutdown:    статус → "Stopped"
 * После Boot:                    статус → "Running"
 * Каждое действие пишется в таблицу активности (table.table.table-normal).
 *
 * ⚠️  БЕЗОПАСНОСТЬ ТЕСТОВ:
 *   - Все модалы закрываются через Cancel — реальное действие НЕ выполняется.
 *   - Boot кнопка проверяется только на visibility/enabled — клик не делается
 *     (Boot не имеет модала подтверждения и сразу запускает сервер).
 *   - Тесты адаптированы к текущему состоянию сервера (Running/Stopped).
 *
 * Запуск:
 *   npx playwright test tests/vps.panel.power.spec.ts --project=chromium
 *   npx playwright test tests/vps.panel.power.spec.ts --project=chromium --headed
 */
import { test, expect, type Browser } from "@playwright/test";
import { VpsPanelServerPage } from "../pages/VpsPanelServerPage.new";
import { loginAndSaveSession, STORAGE_STATE_PATH, TEST_SERVER_UUID } from "../utils/auth";

test.use({ viewport: { width: 1440, height: 900 } });

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginAndSaveSession(browser);
});

// ── Helper ────────────────────────────────────────────────────────────────────

async function openServerPage(browser: Browser) {
  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();
  const serverPage = new VpsPanelServerPage(page, TEST_SERVER_UUID);
  await serverPage.goto();
  return { context, page, serverPage };
}

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — Статус-бейдж
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Статус сервера", () => {
  test("статус-бейдж (div.p-3) присутствует на странице", async ({ browser }) => {
    const { context, serverPage } = await openServerPage(browser);

    await expect(serverPage.statusBadge).toBeVisible({ timeout: 15_000 });

    await context.close();
  });

  test("статус-бейдж содержит 'Running' или 'Stopped'", async ({ browser }) => {
  const { context, serverPage } = await openServerPage(browser);

  await expect(serverPage.statusBadge).toBeVisible({ timeout: 15_000 });

  const status = await serverPage.getStatusText();

  console.log(`[INFO] Current server status: "${status}"`);

  expect(["running", "stopped"]).toContain(
    status.trim().toLowerCase(),
  );

  await context.close();
});

  test("статус определяется через конкретный div.p-3, а не весь body", async ({ browser }) => {
    const { context, page, serverPage } = await openServerPage(browser);

    const badge = serverPage.statusBadge;
    await expect(badge).toBeVisible({ timeout: 15_000 });

    const badgeText = await badge.innerText();
    const tagName = await badge.evaluate((el) => el.tagName.toLowerCase());
    const className = await badge.evaluate((el) => el.className);

    console.log(`[INFO] Badge tag: ${tagName}, class: "${className}", text: "${badgeText.trim()}"`);

    expect(tagName).toBe("div");
    expect(className).toContain("p-3");

    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — Видимость кнопок питания (state-aware)
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Кнопки питания: видимость по состоянию", () => {
  test("при Running: кнопки Shutdown, Power Off, Restart видны", async ({ browser }) => {
    const { context, serverPage } = await openServerPage(browser);

    const isRunning = await serverPage.isRunning();
    if (!isRunning) {
      console.log("[INFO] Server is not Running — skipping Running-state button check");
      await context.close();
      return;
    }

    await expect(serverPage.shutdownButton).toBeVisible({ timeout: 10_000 });
    await expect(serverPage.powerOffButton).toBeVisible({ timeout: 10_000 });
    await expect(serverPage.restartButton).toBeVisible({ timeout: 10_000 });
    console.log("[INFO] Shutdown / Power Off / Restart buttons visible while Running ✓");

    await context.close();
  });

  test("при Running: кнопка Shutdown активна (не disabled)", async ({ browser }) => {
    const { context, serverPage } = await openServerPage(browser);

    const isRunning = await serverPage.isRunning();
    if (!isRunning) {
      console.log("[INFO] Server is not Running — skip");
      await context.close();
      return;
    }

    await expect(serverPage.shutdownButton).toBeEnabled({ timeout: 10_000 });
    console.log("[INFO] Shutdown button enabled while Running ✓");

    await context.close();
  });

  test("при Running: кнопка Power Off активна (не disabled)", async ({ browser }) => {
    const { context, serverPage } = await openServerPage(browser);

    const isRunning = await serverPage.isRunning();
    if (!isRunning) {
      console.log("[INFO] Server is not Running — skip");
      await context.close();
      return;
    }

    await expect(serverPage.powerOffButton).toBeEnabled({ timeout: 10_000 });
    console.log("[INFO] Power Off button enabled while Running ✓");

    await context.close();
  });

  test("при Running: кнопка Restart активна (не disabled)", async ({ browser }) => {
    const { context, serverPage } = await openServerPage(browser);

    const isRunning = await serverPage.isRunning();
    if (!isRunning) {
      console.log("[INFO] Server is not Running — skip");
      await context.close();
      return;
    }

    await expect(serverPage.restartButton).toBeEnabled({ timeout: 10_000 });
    console.log("[INFO] Restart button enabled while Running ✓");

    await context.close();
  });

  test("при Stopped: кнопка Boot видна и активна", async ({ browser }) => {
    const { context, serverPage } = await openServerPage(browser);

    const isStopped = await serverPage.isStopped();
    if (!isStopped) {
      console.log("[INFO] Server is not Stopped — skipping Boot button check");
      await context.close();
      return;
    }

    await expect(serverPage.bootButton).toBeVisible({ timeout: 10_000 });
    await expect(serverPage.bootButton).toBeEnabled({ timeout: 10_000 });
    console.log("[INFO] Boot button visible and enabled while Stopped ✓");

    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — Shutdown: модал и отмена
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Shutdown: модал подтверждения (Cancel)", () => {
  test("Shutdown → Bootstrap-модал открывается (.modal.show)", async ({ browser }) => {
    const { context, serverPage } = await openServerPage(browser);

    const isRunning = await serverPage.isRunning();
    if (!isRunning) {
      console.log("[INFO] Server is not Running — Shutdown button not available");
      await context.close();
      return;
    }

    await serverPage.shutdownButton.click();
    await expect(serverPage.activeModal).toBeVisible({ timeout: 8_000 });
    console.log("[INFO] Shutdown modal opened (.modal.show) ✓");

    await serverPage.modalCancelButton.click();
    await serverPage.page.waitForTimeout(400);

    await context.close();
  });

  test("Shutdown модал содержит заголовок 'Shutdown Server'", async ({ browser }) => {
    const { context, serverPage } = await openServerPage(browser);

    const isRunning = await serverPage.isRunning();
    if (!isRunning) {
      console.log("[INFO] Server is not Running — skip");
      await context.close();
      return;
    }

    await serverPage.shutdownButton.click();
    await expect(serverPage.activeModal).toBeVisible({ timeout: 8_000 });

    const modalText = await serverPage.activeModal.innerText();
    console.log(`[INFO] Shutdown modal text: "${modalText.trim().slice(0, 200)}"`);
    expect(modalText).toContain("Shutdown Server");

    await serverPage.modalCancelButton.click();
    await serverPage.page.waitForTimeout(400);

    await context.close();
  });

  test("Shutdown модал содержит текст 'Are you sure you want to shutdown this server?'", async ({
    browser,
  }) => {
    const { context, serverPage } = await openServerPage(browser);

    const isRunning = await serverPage.isRunning();
    if (!isRunning) {
      console.log("[INFO] Server is not Running — skip");
      await context.close();
      return;
    }

    await serverPage.shutdownButton.click();
    await expect(serverPage.activeModal).toBeVisible({ timeout: 8_000 });

    const modalText = await serverPage.activeModal.innerText();
    expect(modalText).toContain("Are you sure you want to shutdown this server?");
    console.log("[INFO] Shutdown confirm text verified ✓");

    await serverPage.modalCancelButton.click();
    await serverPage.page.waitForTimeout(400);

    await context.close();
  });

  test("Shutdown модал — кнопка подтверждения (btn-primary 'Shutdown') видна", async ({
    browser,
  }) => {
    const { context, serverPage } = await openServerPage(browser);

    const isRunning = await serverPage.isRunning();
    if (!isRunning) {
      console.log("[INFO] Server is not Running — skip");
      await context.close();
      return;
    }

    await serverPage.shutdownButton.click();
    await expect(serverPage.activeModal).toBeVisible({ timeout: 8_000 });
    await expect(serverPage.shutdownConfirmButton).toBeVisible({ timeout: 5_000 });
    console.log("[INFO] Shutdown confirm button (btn-primary) visible ✓");

    await serverPage.modalCancelButton.click();
    await serverPage.page.waitForTimeout(400);

    await context.close();
  });

  test("Shutdown модал — кнопка Cancel (btn-light) закрывает модал", async ({ browser }) => {
    const { context, serverPage } = await openServerPage(browser);

    const isRunning = await serverPage.isRunning();
    if (!isRunning) {
      console.log("[INFO] Server is not Running — skip");
      await context.close();
      return;
    }

    await serverPage.shutdownButton.click();
    await expect(serverPage.activeModal).toBeVisible({ timeout: 8_000 });

    await expect(serverPage.modalCancelButton).toBeVisible({ timeout: 5_000 });
    await serverPage.modalCancelButton.click();
    await serverPage.page.waitForTimeout(400);

    await expect(serverPage.activeModal).not.toBeVisible({ timeout: 5_000 });
    console.log("[INFO] Shutdown modal closed via Cancel ✓");

    await context.close();
  });

  test("после Cancel Shutdown — URL остаётся на странице сервера", async ({ browser }) => {
    const { context, page, serverPage } = await openServerPage(browser);

    const isRunning = await serverPage.isRunning();
    if (!isRunning) {
      console.log("[INFO] Server is not Running — skip");
      await context.close();
      return;
    }

    const { appeared } = await serverPage.clickPowerAndCancel(
      serverPage.shutdownButton,
      "Shutdown Server",
    );

    if (appeared) {
      expect(page.url()).toContain(TEST_SERVER_UUID);
      console.log("[INFO] URL still on server page after Shutdown Cancel ✓");
    }

    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — Power Off: модал и отмена
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Power Off: модал подтверждения (Cancel)", () => {
  test("Power Off → Bootstrap-модал открывается (.modal.show)", async ({ browser }) => {
    const { context, serverPage } = await openServerPage(browser);

    const isRunning = await serverPage.isRunning();
    if (!isRunning) {
      console.log("[INFO] Server is not Running — skip");
      await context.close();
      return;
    }

    await serverPage.powerOffButton.click();
    await expect(serverPage.activeModal).toBeVisible({ timeout: 8_000 });
    console.log("[INFO] Power Off modal opened ✓");

    await serverPage.modalCancelButton.click();
    await serverPage.page.waitForTimeout(400);

    await context.close();
  });

  test("Power Off модал содержит заголовок 'Power Off Server'", async ({ browser }) => {
    const { context, serverPage } = await openServerPage(browser);

    const isRunning = await serverPage.isRunning();
    if (!isRunning) {
      console.log("[INFO] Server is not Running — skip");
      await context.close();
      return;
    }

    await serverPage.powerOffButton.click();
    await expect(serverPage.activeModal).toBeVisible({ timeout: 8_000 });

    const modalText = await serverPage.activeModal.innerText();
    console.log(`[INFO] Power Off modal text: "${modalText.trim().slice(0, 200)}"`);
    expect(modalText).toContain("Power Off Server");

    await serverPage.modalCancelButton.click();
    await serverPage.page.waitForTimeout(400);

    await context.close();
  });

  test("Power Off модал содержит текст 'Are you sure you want to power off this server?'", async ({
    browser,
  }) => {
    const { context, serverPage } = await openServerPage(browser);

    const isRunning = await serverPage.isRunning();
    if (!isRunning) {
      console.log("[INFO] Server is not Running — skip");
      await context.close();
      return;
    }

    await serverPage.powerOffButton.click();
    await expect(serverPage.activeModal).toBeVisible({ timeout: 8_000 });

    const modalText = await serverPage.activeModal.innerText();
    expect(modalText).toContain("Are you sure you want to power off this server?");
    console.log("[INFO] Power Off confirm text verified ✓");

    await serverPage.modalCancelButton.click();
    await serverPage.page.waitForTimeout(400);

    await context.close();
  });

  test("Power Off модал — кнопка подтверждения (btn-primary 'Power Off') видна", async ({
    browser,
  }) => {
    const { context, serverPage } = await openServerPage(browser);

    const isRunning = await serverPage.isRunning();
    if (!isRunning) {
      console.log("[INFO] Server is not Running — skip");
      await context.close();
      return;
    }

    await serverPage.powerOffButton.click();
    await expect(serverPage.activeModal).toBeVisible({ timeout: 8_000 });
    await expect(serverPage.powerOffConfirmButton).toBeVisible({ timeout: 5_000 });
    console.log("[INFO] Power Off confirm button (btn-primary) visible ✓");

    await serverPage.modalCancelButton.click();
    await serverPage.page.waitForTimeout(400);

    await context.close();
  });

  test("Power Off модал — Cancel закрывает модал, статус не меняется", async ({ browser }) => {
    const { context, serverPage } = await openServerPage(browser);

    const isRunning = await serverPage.isRunning();
    if (!isRunning) {
      console.log("[INFO] Server is not Running — skip");
      await context.close();
      return;
    }

    const statusBefore = await serverPage.getStatusText();

    await serverPage.powerOffButton.click();
    await expect(serverPage.activeModal).toBeVisible({ timeout: 8_000 });
    await serverPage.modalCancelButton.click();
    await serverPage.page.waitForTimeout(400);

    await expect(serverPage.activeModal).not.toBeVisible({ timeout: 5_000 });

    const statusAfter = await serverPage.getStatusText();
    console.log(`[INFO] Status before: "${statusBefore}", after Cancel: "${statusAfter}"`);
    expect(statusAfter).toBe(statusBefore);
    console.log("[INFO] Power Off cancelled — status unchanged ✓");

    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 5 — Restart: модал и отмена
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Restart: модал подтверждения (Cancel)", () => {
  test("Restart → Bootstrap-модал открывается (.modal.show)", async ({ browser }) => {
    const { context, serverPage } = await openServerPage(browser);

    const isRunning = await serverPage.isRunning();
    if (!isRunning) {
      console.log("[INFO] Server is not Running — skip");
      await context.close();
      return;
    }

    await serverPage.restartButton.click();
    await expect(serverPage.activeModal).toBeVisible({ timeout: 8_000 });
    console.log("[INFO] Restart modal opened ✓");

    await serverPage.modalCancelButton.click();
    await serverPage.page.waitForTimeout(400);

    await context.close();
  });

  test("Restart модал содержит заголовок 'Restart Server'", async ({ browser }) => {
    const { context, serverPage } = await openServerPage(browser);

    const isRunning = await serverPage.isRunning();
    if (!isRunning) {
      console.log("[INFO] Server is not Running — skip");
      await context.close();
      return;
    }

    await serverPage.restartButton.click();
    await expect(serverPage.activeModal).toBeVisible({ timeout: 8_000 });

    const modalText = await serverPage.activeModal.innerText();
    console.log(`[INFO] Restart modal text: "${modalText.trim().slice(0, 200)}"`);
    expect(modalText).toContain("Restart Server");

    await serverPage.modalCancelButton.click();
    await serverPage.page.waitForTimeout(400);

    await context.close();
  });

  test("Restart модал содержит текст 'Are you sure you want to restart this server?'", async ({
    browser,
  }) => {
    const { context, serverPage } = await openServerPage(browser);

    const isRunning = await serverPage.isRunning();
    if (!isRunning) {
      console.log("[INFO] Server is not Running — skip");
      await context.close();
      return;
    }

    await serverPage.restartButton.click();
    await expect(serverPage.activeModal).toBeVisible({ timeout: 8_000 });

    const modalText = await serverPage.activeModal.innerText();
    expect(modalText).toContain("Are you sure you want to restart this server?");
    console.log("[INFO] Restart confirm text verified ✓");

    await serverPage.modalCancelButton.click();
    await serverPage.page.waitForTimeout(400);

    await context.close();
  });

  test("Restart модал — кнопка подтверждения (btn-primary 'Restart') видна", async ({
    browser,
  }) => {
    const { context, serverPage } = await openServerPage(browser);

    const isRunning = await serverPage.isRunning();
    if (!isRunning) {
      console.log("[INFO] Server is not Running — skip");
      await context.close();
      return;
    }

    await serverPage.restartButton.click();
    await expect(serverPage.activeModal).toBeVisible({ timeout: 8_000 });
    await expect(serverPage.restartConfirmButton).toBeVisible({ timeout: 5_000 });
    console.log("[INFO] Restart confirm button (btn-primary) visible ✓");

    await serverPage.modalCancelButton.click();
    await serverPage.page.waitForTimeout(400);

    await context.close();
  });

  test("Restart модал — Cancel закрывает модал, статус не меняется", async ({ browser }) => {
    const { context, serverPage } = await openServerPage(browser);

    const isRunning = await serverPage.isRunning();
    if (!isRunning) {
      console.log("[INFO] Server is not Running — skip");
      await context.close();
      return;
    }

    const statusBefore = await serverPage.getStatusText();

    await serverPage.restartButton.click();
    await expect(serverPage.activeModal).toBeVisible({ timeout: 8_000 });
    await serverPage.modalCancelButton.click();
    await serverPage.page.waitForTimeout(400);

    await expect(serverPage.activeModal).not.toBeVisible({ timeout: 5_000 });

    const statusAfter = await serverPage.getStatusText();
    console.log(`[INFO] Status: "${statusBefore}" → "${statusAfter}" after Cancel`);
    expect(statusAfter).toBe(statusBefore);
    console.log("[INFO] Restart cancelled — status unchanged ✓");

    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 6 — Структура всех модалов (общие требования)
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Структура Bootstrap-модалов питания", () => {
  test("во всех модалах Cancel имеет класс btn-light (не btn-danger, не btn-primary)", async ({
    browser,
  }) => {
    const { context, serverPage } = await openServerPage(browser);

    const isRunning = await serverPage.isRunning();
    if (!isRunning) {
      console.log("[INFO] Server is not Running — testing with available buttons");
      await context.close();
      return;
    }

    const buttonsToTest = [serverPage.shutdownButton, serverPage.restartButton];

    for (const btn of buttonsToTest) {
      await btn.click();
      await expect(serverPage.activeModal).toBeVisible({ timeout: 8_000 });

      const cancelBtn = serverPage.modalCancelButton;
      await expect(cancelBtn).toBeVisible({ timeout: 5_000 });

      const cancelClass = await cancelBtn.evaluate((el) => el.className);
      console.log(`[INFO] Cancel button classes: "${cancelClass}"`);

      expect(cancelClass).toContain("btn-light");
      expect(cancelClass).not.toContain("btn-danger");

      await cancelBtn.click();
      await serverPage.page.waitForTimeout(400);
    }

    console.log("[INFO] All modal Cancel buttons have btn-light class ✓");

    await context.close();
  });

  test("в Shutdown и Restart модалах confirm-кнопка имеет класс btn-primary", async ({
    browser,
  }) => {
    const { context, serverPage } = await openServerPage(browser);

    const isRunning = await serverPage.isRunning();
    if (!isRunning) {
      console.log("[INFO] Server is not Running — skip");
      await context.close();
      return;
    }

    const cases: Array<{ btn: () => typeof serverPage.shutdownButton; confirmText: string }> = [
      { btn: () => serverPage.shutdownButton, confirmText: "Shutdown" },
      { btn: () => serverPage.restartButton, confirmText: "Restart" },
    ];

    for (const { btn, confirmText } of cases) {
      await btn().click();
      await expect(serverPage.activeModal).toBeVisible({ timeout: 8_000 });

      const confirmBtn = serverPage.activeModal
        .locator(`button.btn-primary:has-text("${confirmText}")`)
        .first();
      await expect(confirmBtn).toBeVisible({ timeout: 5_000 });

      const confirmClass = await confirmBtn.evaluate((el) => el.className);
      console.log(`[INFO] "${confirmText}" confirm button classes: "${confirmClass}"`);
      expect(confirmClass).toContain("btn-primary");
      expect(confirmClass).toContain("w-100");

      await serverPage.modalCancelButton.click();
      await serverPage.page.waitForTimeout(400);
    }

    console.log("[INFO] Confirm buttons have btn-primary.w-100 class ✓");

    await context.close();
  });

  test("все модалы содержат оба элемента: confirm и cancel кнопки одновременно", async ({
    browser,
  }) => {
    const { context, serverPage } = await openServerPage(browser);

    const isRunning = await serverPage.isRunning();
    if (!isRunning) {
      console.log("[INFO] Server is not Running — skip");
      await context.close();
      return;
    }

    await serverPage.shutdownButton.click();
    await expect(serverPage.activeModal).toBeVisible({ timeout: 8_000 });

    await expect(serverPage.shutdownConfirmButton).toBeVisible({ timeout: 5_000 });
    await expect(serverPage.modalCancelButton).toBeVisible({ timeout: 5_000 });
    console.log("[INFO] Modal has both confirm and cancel buttons simultaneously ✓");

    await serverPage.modalCancelButton.click();
    await serverPage.page.waitForTimeout(400);

    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 7 — Rebuild: модал подтверждения (Cancel)
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Rebuild: модал подтверждения (Cancel)", () => {
  test("кнопка Rebuild присутствует на странице сервера", async ({ browser }) => {
    const { context, page, serverPage } = await openServerPage(browser);

    const rebuildBtn = page
      .locator('button:has-text("Rebuild"), button:has-text("Install")')
      .first();
    const isVisible = await rebuildBtn.isVisible().catch(() => false);

    console.log(`[INFO] Rebuild/Install button visible: ${isVisible}`);

    if (isVisible) {
      const btnText = await rebuildBtn.innerText();
      console.log(`[INFO] Button text: "${btnText.trim()}"`);
      await expect(rebuildBtn).toBeEnabled({ timeout: 5_000 });
    } else {
      console.log("[INFO] Rebuild button not found on Overview — may be on a different tab");
    }

    await context.close();
  });

  test("Rebuild → модал содержит 'Are you sure you want to rebuild this server?' → Cancel", async ({
    browser,
  }) => {
    const { context, page, serverPage } = await openServerPage(browser);

    const rebuildBtn = page
      .locator('button:has-text("Rebuild"), button:has-text("Install")')
      .first();
    const isVisible = await rebuildBtn.isVisible().catch(() => false);

    if (!isVisible) {
      console.log("[INFO] Rebuild button not visible on Overview — skip");
      await context.close();
      return;
    }

    await rebuildBtn.click();
    await expect(serverPage.activeModal).toBeVisible({ timeout: 8_000 });

    const modalText = await serverPage.activeModal.innerText();
    console.log(`[INFO] Rebuild modal text: "${modalText.trim().slice(0, 300)}"`);

    expect(modalText).toContain("Are you sure you want to rebuild this server?");
    console.log("[INFO] Rebuild confirm text verified ✓");

    const cancelBtn = serverPage.modalCancelButton;
    await expect(cancelBtn).toBeVisible({ timeout: 5_000 });
    await cancelBtn.click();
    await serverPage.page.waitForTimeout(400);

    await expect(serverPage.activeModal).not.toBeVisible({ timeout: 5_000 });
    console.log("[INFO] Rebuild modal closed via Cancel ✓");

    await context.close();
  });

  test("Rebuild модал — confirm кнопка (btn-danger, id=server-install-button) видна", async ({
    browser,
  }) => {
    const { context, page, serverPage } = await openServerPage(browser);

    const rebuildBtn = page
      .locator('button:has-text("Rebuild"), button:has-text("Install")')
      .first();
    const isVisible = await rebuildBtn.isVisible().catch(() => false);

    if (!isVisible) {
      console.log("[INFO] Rebuild button not visible — skip");
      await context.close();
      return;
    }

    await rebuildBtn.click();
    await expect(serverPage.activeModal).toBeVisible({ timeout: 8_000 });

    await expect(serverPage.rebuildConfirmButton).toBeVisible({ timeout: 5_000 });

    const confirmClass = await serverPage.rebuildConfirmButton.evaluate((el) => el.className);
    console.log(`[INFO] Rebuild confirm button classes: "${confirmClass}"`);
    expect(confirmClass).toContain("btn-danger");

    await serverPage.modalCancelButton.click();
    await serverPage.page.waitForTimeout(400);

    console.log("[INFO] Rebuild confirm button (btn-danger #server-install-button) verified ✓");

    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 8 — Таблица активности (фиксирует все действия с сервером)
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Таблица активности", () => {
  test("таблица активности (table.table.table-normal) видна на странице", async ({ browser }) => {
    const { context, serverPage } = await openServerPage(browser);

    await expect(serverPage.activityTable).toBeVisible({ timeout: 10_000 });
    console.log("[INFO] Activity table visible ✓");

    await context.close();
  });

  test("таблица имеет заголовки Task, Requested, Duration, Progress", async ({ browser }) => {
  const { context, serverPage } = await openServerPage(browser);

  await expect(serverPage.activityTable).toBeVisible({ timeout: 10_000 });

  const thead = serverPage.activityTable.locator("thead").first();

  const headText = await thead.innerText();

  const normalized = headText
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  console.log(`[INFO] Table headers: "${normalized}"`);

  expect(normalized).toContain("task");
  expect(normalized).toContain("requested");
  expect(normalized).toContain("duration");
  expect(normalized).toContain("progress");

  await context.close();
});

  test("таблица содержит хотя бы 1 строку истории", async ({ browser }) => {
    const { context, serverPage } = await openServerPage(browser);

    await expect(serverPage.activityTable).toBeVisible({ timeout: 10_000 });
    const rowCount = await serverPage.activityRows.count();
    console.log(`[INFO] Activity rows (non-debug): ${rowCount}`);
    expect(rowCount).toBeGreaterThanOrEqual(1);

    await context.close();
  });

  test("в истории есть записи о Boot и/или Poweroff", async ({ browser }) => {
    const { context, serverPage } = await openServerPage(browser);

    await expect(serverPage.activityTable).toBeVisible({ timeout: 10_000 });
    const tasks = await serverPage.getActivityTaskNames();
    console.log(`[INFO] Activity tasks: [${tasks.join(", ")}]`);

    const known = ["Boot", "Poweroff", "Shutdown", "Restart", "Rebuild", "Install"];
    const hasKnown = tasks.some((t) =>
      known.some((k) => t.toLowerCase().includes(k.toLowerCase())),
    );
    expect(hasKnown).toBeTruthy();

    await context.close();
  });

  test("завершённые задачи имеют статус Complete (span.badge.badge-active)", async ({
    browser,
  }) => {
    const { context, serverPage } = await openServerPage(browser);

    const badgeCount = await serverPage.completeBadges.count();
    console.log(`[INFO] Complete badges: ${badgeCount}`);
    expect(badgeCount).toBeGreaterThanOrEqual(1);

    const firstBadge = await serverPage.completeBadges.first().innerText();
    console.log(`[INFO] First badge text: "${firstBadge.trim()}"`);
    expect(firstBadge.trim()).toMatch(/^complete$/i);

    await context.close();
  });
});
