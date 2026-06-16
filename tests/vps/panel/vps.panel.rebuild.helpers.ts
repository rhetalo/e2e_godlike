/**
 * vps.panel.rebuild.helpers.ts
 * ────────────────────────────
 * Общие хелперы тестов Rebuild (выбор ОС). Не спек — Playwright не собирает как тест.
 *
 * Путь: /server/{UUID} → кнопка Rebuild → модал → Continue (#server-install-button)
 *       → страница выбора ОС. URL при этом НЕ меняется (rebuild-view на том же URL).
 *
 * ⚠️ Навигация и выбор карточки ОС — безопасны. РЕАЛЬНЫЙ rebuild стартует только
 *    по кнопке "Install with ..." (vps.panel.rebuild.real.spec.ts).
 */
import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { VpsPanelServerPage } from "../../../pages/VpsPanelServerPage";
import { VpsPanelRebuildPage } from "../../../pages/VpsPanelRebuildPage";
import { STORAGE_STATE_PATH, TEST_SERVER_UUID, PANEL_URL } from "../../../utils/auth";

export interface RebuildReach {
  context: BrowserContext;
  page: Page;
  serverPage: VpsPanelServerPage;
  rebuildPage: VpsPanelRebuildPage;
  navigated: boolean;
}

/**
 * Открыть страницу выбора ОС: server → Rebuild → Continue.
 * Возвращает navigated=false (вместо throw), если кнопка/модал недоступны —
 * вызывающий тест делает test.skip(!navigated, reason) (санкционированный skip).
 */
export async function openRebuildPage(browser: Browser): Promise<RebuildReach> {
  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();
  const serverPage = new VpsPanelServerPage(page, TEST_SERVER_UUID);
  const rebuildPage = new VpsPanelRebuildPage(page, TEST_SERVER_UUID);

  await serverPage.goto();

  // Rebuild доступна в любом power-статусе. data-bs-target уникален (только реальная кнопка
  // в Overview, не скрытые модальные). Транзиент сразу после "Cancel Rebuild" (кнопка на миг
  // пропадает) лечим одной перезагрузкой overview — serverPage.goto() снова гасит pending setup.
  const rebuildBtn = page.locator('button[data-bs-target="#reinstallServerModal"]').first();
  let rebuildVisible = await rebuildBtn.isVisible({ timeout: 15_000 }).catch(() => false);
  if (!rebuildVisible) {
    await serverPage.goto();
    rebuildVisible = await rebuildBtn.isVisible({ timeout: 15_000 }).catch(() => false);
  }
  if (!rebuildVisible) {
    return { context, page, serverPage, rebuildPage, navigated: false };
  }

  await rebuildBtn.click();
  const modalAppeared = await serverPage.activeModal
    .waitFor({ state: "visible", timeout: 8_000 })
    .then(() => true)
    .catch(() => false);
  if (!modalAppeared) {
    return { context, page, serverPage, rebuildPage, navigated: false };
  }

  await expect(serverPage.rebuildConfirmButton).toBeVisible({ timeout: 5_000 });
  await serverPage.rebuildConfirmButton.click();

  // Страница выбора ОС загружена, когда карточки ОС появились в DOM (в т.ч. внутри
  // свёрнутых аккордеонов → ждём attached, не visible).
  const navigated = await rebuildPage.allOsCards
    .first()
    .waitFor({ state: "attached", timeout: 20_000 })
    .then(() => true)
    .catch(() => false);

  return { context, page, serverPage, rebuildPage, navigated };
}

/** Вернуться на страницу сервера (без networkidle). */
export async function goBackToServer(page: Page): Promise<void> {
  await page
    .goto(`${PANEL_URL}/server/${TEST_SERVER_UUID}`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    .catch(() => null);
}
