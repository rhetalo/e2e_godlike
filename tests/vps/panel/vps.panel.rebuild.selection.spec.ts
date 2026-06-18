/**
 * vps.panel.rebuild.selection.spec.ts
 * ────────────────────────────────────
 * Rebuild (выбор ОС), часть 2: выбор карточки (single-select), поведение кнопки
 * Install, секция Swap Space, возврат на сервер. Финальный Install НЕ нажимается.
 */
import { test, expect, type Browser } from "@playwright/test";
import { loginAndSaveSession } from "../../../utils/auth";
import { openRebuildPage, goBackToServer } from "./vps.panel.rebuild.helpers";

test.use({ viewport: { width: 1440, height: 900 } });

const SKIP_REASON = "Страница Rebuild недоступна — сервер остановлен или модал не открылся";

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginAndSaveSession(browser);
});

test.describe("@regression VPS-панель — Rebuild: выбор ОС (Install не нажимаем)", () => {
  test("TC-VPS-RBD-003 | single-select: выбор карточки даёт .selected-card/.border-success; вторая снимает первую", async ({
    browser,
  }) => {
    const { context, rebuildPage, navigated } = await openRebuildPage(browser);
    test.skip(!navigated, SKIP_REASON);

    try {
      const almaCard = rebuildPage.osCardByName("AlmaLinux 9 Latest");

      await test.step("клик AlmaLinux → .selected-card + .border-success, выбрана ровно одна", async () => {
        await rebuildPage.expandAccordion("AlmaLinux");
        await expect(almaCard).toBeVisible({ timeout: 10_000 });
        await expect(almaCard).not.toHaveClass(/selected-card/);
        await almaCard.click();
        await expect(almaCard).toHaveClass(/selected-card/, { timeout: 5_000 });
        await expect(almaCard).toHaveClass(/border-success/);
        await expect(rebuildPage.selectedOsCard).toHaveCount(1);
      });

      await test.step("выбор Debian 12 → AlmaLinux снят, выбрана по-прежнему одна (single-select)", async () => {
        await rebuildPage.expandAccordion("Debian");
        const debianCard = rebuildPage.osCardByName("Debian 12");
        await expect(debianCard).toBeVisible({ timeout: 8_000 });
        await debianCard.click();
        await expect(debianCard).toHaveClass(/selected-card/, { timeout: 5_000 });
        await expect(almaCard).not.toHaveClass(/selected-card/);
        await expect(rebuildPage.selectedOsCard).toHaveCount(1);
      });
    } finally {
      await context.close();
    }
  });

  test("TC-VPS-RBD-004 | кнопка Install: отсутствует до выбора, появляется с названием ОС и меняется; Swap Space появляется", async ({
    browser,
  }) => {
    const { context, rebuildPage, navigated } = await openRebuildPage(browser);
    test.skip(!navigated, SKIP_REASON);

    try {
      await test.step("до выбора ОС кнопка Install отсутствует в DOM", async () => {
        expect(await rebuildPage.isInstallButtonVisible()).toBe(false);
      });

      const almaCard = rebuildPage.osCardByName("AlmaLinux 9 Latest");
      let almaText = "";

      await test.step("выбор AlmaLinux → кнопка Install появляется с названием ОС", async () => {
        await rebuildPage.expandAccordion("AlmaLinux");
        await expect(almaCard).toBeVisible({ timeout: 10_000 });
        await almaCard.click();
        await expect(rebuildPage.finalInstallButton).toBeVisible({ timeout: 5_000 });
        almaText = await rebuildPage.getInstallButtonText();
        expect(almaText).toMatch(/^Install with /);
        expect(almaText).toContain("AlmaLinux");
      });

      await test.step("смена на Debian 11 → текст кнопки меняется на Debian", async () => {
        await rebuildPage.expandAccordion("Debian");
        const debianCard = rebuildPage.osCardByName("Debian 11");
        await expect(debianCard).toBeVisible({ timeout: 8_000 });
        await debianCard.click();
        await expect
          .poll(async () => rebuildPage.getInstallButtonText(), { timeout: 5_000 })
          .toContain("Debian");
        expect(await rebuildPage.getInstallButtonText()).not.toBe(almaText);
      });

      await test.step("после выбора ОС появляется секция Swap Space (3+ варианта)", async () => {
        await expect
          .poll(async () => rebuildPage.swapSpaceCards.count(), { timeout: 5_000 })
          .toBeGreaterThanOrEqual(3);
      });
    } finally {
      await context.close();
    }
  });

  test("TC-VPS-RBD-005 | возврат на сервер без Install — статус сервера виден (rebuild не запущен)", async ({
    browser,
  }) => {
    const { context, page, serverPage, navigated } = await openRebuildPage(browser);
    test.skip(!navigated, SKIP_REASON);

    try {
      await goBackToServer(page);
      // serverPage.goto() обрабатывает Cancel Rebuild, если страница в rebuild-режиме.
      await serverPage.goto();
      await expect(serverPage.statusBadge).toBeVisible({ timeout: 15_000 });
      expect(["Running", "Stopped"]).toContain(await serverPage.getStatusText());
    } finally {
      await context.close();
    }
  });
});
