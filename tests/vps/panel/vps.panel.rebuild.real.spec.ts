/**
 * vps.panel.rebuild.real.spec.ts
 * ──────────────────────────────
 * SUITE 7 (вынесен отдельным файлом, НЕ дробится): РЕАЛЬНЫЙ rebuild — переустановка ОС.
 *
 * ⚠️  ДЕСТРУКТИВНО — разрешено владельцем (одноразовый тестовый сервер). Реально
 *     переустанавливает ОС: выбор шаблона → Install → "Install Without" SSH →
 *     задача Build → Complete → Running. Тем самым расшибает любое pending
 *     "Server Setup" состояние, оставляя сервер чистым.
 *
 * Интент не менялся — только стиль (console/networkidle убраны). Reach до страницы
 * выбора ОС — общий openRebuildPage() (см. vps.panel.rebuild.helpers.ts).
 *
 * Запуск (осознанно, отдельно):
 *   npx playwright test tests/vps/panel/vps.panel.rebuild.real.spec.ts --project=vps-panel
 */
import { test, expect, type Browser } from "@playwright/test";
import { loginAndSaveSession, TEST_SERVER_UUID, PANEL_URL } from "../../../utils/auth";
import { openRebuildPage } from "./vps.panel.rebuild.helpers";

test.use({ viewport: { width: 1440, height: 900 } });

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginAndSaveSession(browser);
});

test.describe("@critical VPS-панель — Rebuild: РЕАЛЬНЫЙ install (Build)", () => {
  test("@critical TC-VPS-BUILD-001 реальный rebuild ОС → задача Build → Complete → Running", async ({
    browser,
  }) => {
    test.setTimeout(300_000); // переустановка ОС + ожидание Complete

    const { context, page, serverPage, rebuildPage, navigated } = await openRebuildPage(browser);
    test.skip(!navigated, "Страница Rebuild недоступна — сервер остановлен или модал не открылся");

    try {
      await test.step("выбрать ОС (AlmaLinux 8) → кнопка Install отражает выбор", async () => {
        await rebuildPage.selectOs("AlmaLinux 8", "AlmaLinux");
        expect(await rebuildPage.getInstallButtonText()).toContain("Install with");
      });

      await test.step("запустить РЕАЛЬНЫЙ rebuild (Install → Install Without SSH)", async () => {
        await rebuildPage.confirmRealRebuild();
      });

      await test.step("на странице сервера: задача Build → Complete → Running", async () => {
        // Raw-навигация (без serverPage.goto(), чтобы не отменить только что запущенный rebuild).
        await page.goto(`${PANEL_URL}/server/${TEST_SERVER_UUID}`, {
          waitUntil: "domcontentloaded",
          timeout: 30_000,
        });
        // Экран «Installation Failed» отдаём в poll как значение → в отчёте видна причина, а не таймаут.
        await expect
          .poll(
            async () =>
              (await serverPage.isInstallFailed())
                ? "INSTALLATION FAILED"
                : serverPage.getLatestTaskName(),
            { timeout: 90_000, intervals: [2_000, 3_000, 5_000] },
          )
          .toMatch(/Build|Install/i);
        await serverPage.waitForLatestTaskComplete(180_000);
        await serverPage.waitForStatus("Running", 120_000);
      });

      // 21-Oct-2026: попытка «прошла», а сервер остался с build_fail (экран Installation Failed
      // после reload) → следующие VPS-спеки падали. Проверяем ИТОГ после свежей загрузки.
      await test.step("после reload: нет «Installation Failed», статус Running, ОС поднялась", async () => {
        await page.reload({ waitUntil: "domcontentloaded" });
        await expect(serverPage.statusBadge.or(serverPage.installFailedHeading).first()).toBeVisible({
          timeout: 30_000,
        });
        await expect(serverPage.installFailedHeading, "сервер остался в Installation Failed").toBeHidden();
        await serverPage.waitForStatus("Running", 60_000);
        await serverPage.waitForGuestReady();
      });
    } finally {
      await context.close();
    }
  });
});
