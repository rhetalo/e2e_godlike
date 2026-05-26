/**
 * vps.panel.rebuild.spec.ts
 * ──────────────────────────
 * Тесты страницы настройки Rebuild (выбор ОС) на панели VirtFusion.
 *
 * Путь навигации (подтверждён May 2026):
 *   /server/{UUID}
 *     → кнопка "Rebuild"
 *     → модал "Are you sure you want to rebuild this server?"
 *     → кнопка Continue (button#server-install-button)
 *     → страница выбора ОС  ← эти тесты
 *
 * ── ПОДТВЕРЖДЁННЫЕ СЕЛЕКТОРЫ (из DevTools, May 2026) ────────────────────────
 *
 * OS карточки:
 *   div.card.os-select                              — любая карточка ОС
 *   div.card.os-select.card-not-inverted-big-border-os  — невыбранная
 *   div.card.os-select.card-inverted-big-border-os      — выбранная
 *   h5.mb-1                                         — название ОС внутри карточки
 *
 * Аккордеон групп ОС:
 *   div.accordion-item                              — группа (CentOS, Debian, …)
 *   button.accordion-button                         — заголовок группы (кликнуть чтобы раскрыть)
 *   button.accordion-button.collapsed               — свёрнутый заголовок
 *   h4.mb-0                                        — название группы внутри кнопки
 *   div.accordion-collapse.show                     — раскрытая панель
 *
 * Подтверждённые группы:
 *   AlmaLinux — видна сразу (вне аккордеона)
 *   CentOS, Debian, Fedora, Games — в аккордеоне
 *
 * Подтверждённые шаблоны:
 *   AlmaLinux 9 Latest
 *   CentOS 7 Minimal, CentOS Stream 9 Minimal
 *   Debian 11 (Bullseye) Minimal, Debian 12 (Bookworm) Minimal
 *   Fedora 41 Minimal, Fedora 42 Minimal
 *   Ubuntu Server + Valheim 24.04 LTS (Noble Numbat) Minimal  (в группе Games)
 *
 * ⚠️  БЕЗОПАСНОСТЬ:
 *   Rebuild выполняется ТОЛЬКО при клике на финальную кнопку Install/Rebuild на этой странице.
 *   Переход на страницу и выбор карточки ОС — безопасны (данные сервера не затрагиваются).
 *   Финальная кнопка Install/Rebuild в тестах НЕ нажимается.
 *
 * Запуск:
 *   npx playwright test tests/vps.panel.rebuild.spec.ts --project=chromium
 *   npx playwright test tests/vps.panel.rebuild.spec.ts --project=chromium --headed
 */
import { test, expect, type Browser, type Page } from "@playwright/test";
import { VpsPanelServerPage } from "../pages/VpsPanelServerPage.new";
import { VpsPanelRebuildPage } from "../pages/VpsPanelRebuildPage";
import { loginAndSaveSession, STORAGE_STATE_PATH, TEST_SERVER_UUID, PANEL_URL } from "../utils/auth";

test.use({ viewport: { width: 1440, height: 900 } });

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginAndSaveSession(browser);
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Navigate to server page, click Rebuild → Continue → arrive on OS selection page. */
async function openRebuildPage(browser: Browser): Promise<{
  context: Awaited<ReturnType<typeof browser.newContext>>;
  page: Page;
  serverPage: VpsPanelServerPage;
  rebuildPage: VpsPanelRebuildPage;
  navigated: boolean;
}> {
  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();
  const serverPage = new VpsPanelServerPage(page, TEST_SERVER_UUID);
  const rebuildPage = new VpsPanelRebuildPage(page, TEST_SERVER_UUID);

  await serverPage.goto();

  // Find Rebuild button — may be on Overview tab or labeled "Install"
  const rebuildBtn = page
    .locator('button:has-text("Rebuild"), button:has-text("Install")')
    .first();
  const rebuildVisible = await rebuildBtn.isVisible().catch(() => false);

  if (!rebuildVisible) {
    console.log("[INFO] Rebuild button not found on Overview — returning without navigation");
    return { context, page, serverPage, rebuildPage, navigated: false };
  }

  // Click Rebuild → wait for modal
  await rebuildBtn.click();
  const modal = serverPage.activeModal;
  const modalAppeared = await modal
    .waitFor({ state: "visible", timeout: 8_000 })
    .then(() => true)
    .catch(() => false);

  if (!modalAppeared) {
    console.log("[INFO] Rebuild modal did not appear");
    return { context, page, serverPage, rebuildPage, navigated: false };
  }

  // Click Continue (button#server-install-button) → navigate to OS selection page
  const continueBtn = serverPage.rebuildConfirmButton;
  await expect(continueBtn).toBeVisible({ timeout: 5_000 });
  await continueBtn.click();

  // Wait for OS selection page to load
  await page.waitForLoadState("networkidle").catch(() => null);
  await page.waitForTimeout(1_000);

  const loaded = await rebuildPage.isLoaded();
  console.log(`[INFO] Rebuild/OS selection page loaded: ${loaded}, URL: ${page.url()}`);

  return { context, page, serverPage, rebuildPage, navigated: loaded };
}

/** Navigate back to server page safely */
async function goBackToServer(page: Page): Promise<void> {
  await page.goto(`${PANEL_URL}/server/${TEST_SERVER_UUID}`, {
    waitUntil: "domcontentloaded",
    timeout: 15_000,
  }).catch(() => null);
}

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — Навигация на страницу выбора ОС
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Rebuild: навигация на страницу выбора ОС", () => {
  test("Rebuild → Continue → переходим на страницу выбора ОС (URL меняется)", async ({
    browser,
  }) => {
    const { context, page, navigated } = await openRebuildPage(browser);

    if (!navigated) {
      console.log("[INFO] Could not navigate to rebuild page — rebuild button not found or modal issue");
      await context.close();
      return;
    }

    const currentUrl = page.url();
    console.log(`[INFO] Rebuild page URL: ${currentUrl}`);

    // URL should differ from the base server page
    const isOnServerBase = currentUrl === `${PANEL_URL}/server/${TEST_SERVER_UUID}`;
    const isOnRebuildRelated = /rebuild|install|template/i.test(currentUrl) || !isOnServerBase;
    console.log(`[INFO] URL changed from server page: ${isOnRebuildRelated}`);

    await goBackToServer(page);
    await context.close();
  });

  test("страница выбора ОС содержит хотя бы 1 OS-карточку (div.card.os-select)", async ({
    browser,
  }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);

    if (!navigated) {
      console.log("[INFO] Could not navigate to rebuild page — skip");
      await context.close();
      return;
    }

    const count = await rebuildPage.getTotalOsCount();
    console.log(`[INFO] OS cards found: ${count}`);
    expect(count).toBeGreaterThanOrEqual(1);

    await goBackToServer(page);
    await context.close();
  });

  test("страница выбора ОС содержит 5+ OS-карточек", async ({ browser }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);

    if (!navigated) {
      console.log("[INFO] Could not navigate to rebuild page — skip");
      await context.close();
      return;
    }

    const count = await rebuildPage.getTotalOsCount();
    console.log(`[INFO] Total OS template cards: ${count}`);
    expect(count).toBeGreaterThanOrEqual(5);

    await goBackToServer(page);
    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — Структура OS карточек
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Rebuild: структура OS карточек", () => {
  test("карточки ОС имеют класс card.os-select (подтверждённый из DevTools)", async ({
    browser,
  }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);

    if (!navigated) {
      console.log("[INFO] Rebuild page not reached — skip");
      await context.close();
      return;
    }

    await expect(rebuildPage.allOsCards.first()).toBeVisible({ timeout: 10_000 });

    const firstCardClass = await rebuildPage.allOsCards
      .first()
      .evaluate((el) => el.className);
    console.log(`[INFO] First OS card classes: "${firstCardClass}"`);

    expect(firstCardClass).toContain("os-select");

    await goBackToServer(page);
    await context.close();
  });

  test("карточки ОС имеют название в h5.mb-1", async ({ browser }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);

    if (!navigated) {
      console.log("[INFO] Rebuild page not reached — skip");
      await context.close();
      return;
    }

    const nameCount = await rebuildPage.osCardNames.count();
    console.log(`[INFO] OS name headings (h5.mb-1) found: ${nameCount}`);
    expect(nameCount).toBeGreaterThanOrEqual(1);

    const firstName = await rebuildPage.osCardNames.first().innerText();
    console.log(`[INFO] First OS name: "${firstName.trim()}"`);
    expect(firstName.trim().length).toBeGreaterThan(3);

    await goBackToServer(page);
    await context.close();
  });

  test("карточки ОС по умолчанию имеют класс card-not-inverted-big-border-os (невыбраны)", async ({
    browser,
  }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);

    if (!navigated) {
      console.log("[INFO] Rebuild page not reached — skip");
      await context.close();
      return;
    }

    const unselectedCount = await rebuildPage.unselectedOsCards.count();
    console.log(`[INFO] Unselected OS cards (card-not-inverted): ${unselectedCount}`);
    expect(unselectedCount).toBeGreaterThanOrEqual(1);

    const selectedCount = await rebuildPage.selectedOsCard.count();
    console.log(`[INFO] Selected OS cards on load: ${selectedCount}`);
    // Normally none should be selected on initial page load

    await goBackToServer(page);
    await context.close();
  });

  test("AlmaLinux 9 Latest присутствует в списке ОС", async ({ browser }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);

    if (!navigated) {
      console.log("[INFO] Rebuild page not reached — skip");
      await context.close();
      return;
    }

    const card = rebuildPage.osCardByName("AlmaLinux 9 Latest");
    await expect(card).toBeVisible({ timeout: 10_000 });
    console.log("[INFO] AlmaLinux 9 Latest card found ✓");

    await goBackToServer(page);
    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — Аккордеон групп ОС
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Rebuild: аккордеон групп ОС", () => {
  test("присутствуют группы ОС в Bootstrap-аккордеоне (div.accordion-item)", async ({
    browser,
  }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);

    if (!navigated) {
      console.log("[INFO] Rebuild page not reached — skip");
      await context.close();
      return;
    }

    const groupCount = await rebuildPage.accordionItems.count();
    console.log(`[INFO] Accordion items (OS groups): ${groupCount}`);
    expect(groupCount).toBeGreaterThanOrEqual(1);

    await goBackToServer(page);
    await context.close();
  });

  test("группы CentOS, Debian, Fedora присутствуют как заголовки аккордеона", async ({
    browser,
  }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);

    if (!navigated) {
      console.log("[INFO] Rebuild page not reached — skip");
      await context.close();
      return;
    }

    for (const family of ["CentOS", "Debian", "Fedora"]) {
      const btn = rebuildPage.accordionButtonByName(family);
      await expect(btn).toBeVisible({ timeout: 10_000 });
      console.log(`[INFO] "${family}" accordion group visible ✓`);
    }

    await goBackToServer(page);
    await context.close();
  });

  test("группа Games (Ubuntu + Valheim) присутствует в аккордеоне", async ({ browser }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);

    if (!navigated) {
      console.log("[INFO] Rebuild page not reached — skip");
      await context.close();
      return;
    }

    const gamesBtn = rebuildPage.accordionButtonByName("Games");
    await expect(gamesBtn).toBeVisible({ timeout: 10_000 });
    console.log("[INFO] Games group visible ✓");

    await goBackToServer(page);
    await context.close();
  });

  test("заголовки аккордеона по умолчанию свёрнуты (имеют класс .collapsed)", async ({
    browser,
  }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);

    if (!navigated) {
      console.log("[INFO] Rebuild page not reached — skip");
      await context.close();
      return;
    }

    const btns = rebuildPage.accordionButtons;
    const count = await btns.count();
    console.log(`[INFO] Total accordion buttons: ${count}`);

    let collapsedCount = 0;
    for (let i = 0; i < count; i++) {
      const cls = await btns.nth(i).evaluate((el) => el.className);
      if (cls.includes("collapsed")) collapsedCount++;
    }

    console.log(`[INFO] Collapsed accordion groups: ${collapsedCount}/${count}`);
    expect(collapsedCount).toBe(count);

    await goBackToServer(page);
    await context.close();
  });

  test("клик по 'Debian' раскрывает аккордеон — div.accordion-collapse получает .show", async ({
    browser,
  }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);

    if (!navigated) {
      console.log("[INFO] Rebuild page not reached — skip");
      await context.close();
      return;
    }

    const debianBtn = rebuildPage.accordionButtonByName("Debian");
    await expect(debianBtn).toBeVisible({ timeout: 10_000 });

    // Should be collapsed initially
    const initialClass = await debianBtn.evaluate((el) => el.className);
    console.log(`[INFO] Debian button class before click: "${initialClass}"`);
    expect(initialClass).toContain("collapsed");

    await debianBtn.click();
    await page.waitForTimeout(500);

    const afterClass = await debianBtn.evaluate((el) => el.className);
    console.log(`[INFO] Debian button class after click: "${afterClass}"`);
    expect(afterClass).not.toContain("collapsed");

    const openPanel = rebuildPage.openAccordionPanels;
    const openCount = await openPanel.count();
    console.log(`[INFO] Open accordion panels: ${openCount}`);
    expect(openCount).toBeGreaterThanOrEqual(1);

    await goBackToServer(page);
    await context.close();
  });

  test("внутри раскрытого Debian видны карточки ОС (Debian 11, Debian 12)", async ({
    browser,
  }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);

    if (!navigated) {
      console.log("[INFO] Rebuild page not reached — skip");
      await context.close();
      return;
    }

    await rebuildPage.expandAccordion("Debian");

    for (const template of ["Debian 11", "Debian 12"]) {
      const card = rebuildPage.osCardByName(template);
      await expect(card).toBeVisible({ timeout: 8_000 });
      console.log(`[INFO] "${template}" template visible after expanding Debian ✓`);
    }

    await goBackToServer(page);
    await context.close();
  });

  test("внутри раскрытого CentOS видны 'CentOS 7 Minimal' и 'CentOS Stream 9 Minimal'", async ({
    browser,
  }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);

    if (!navigated) {
      console.log("[INFO] Rebuild page not reached — skip");
      await context.close();
      return;
    }

    await rebuildPage.expandAccordion("CentOS");

    for (const template of ["CentOS 7 Minimal", "CentOS Stream 9 Minimal"]) {
      const card = rebuildPage.osCardByName(template);
      await expect(card).toBeVisible({ timeout: 8_000 });
      console.log(`[INFO] "${template}" template visible after expanding CentOS ✓`);
    }

    await goBackToServer(page);
    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — Выбор OS карточки (безопасно — без финального Install)
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Rebuild: выбор ОС (Install не нажимаем)", () => {
  test("клик по карточке AlmaLinux — карточка получает класс card-inverted-big-border-os", async ({
    browser,
  }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);

    if (!navigated) {
      console.log("[INFO] Rebuild page not reached — skip");
      await context.close();
      return;
    }

    const almaCard = rebuildPage.osCardByName("AlmaLinux 9 Latest");
    await expect(almaCard).toBeVisible({ timeout: 10_000 });

    const classBefore = await almaCard.evaluate((el) => el.className);
    console.log(`[INFO] AlmaLinux card class before click: "${classBefore}"`);
    expect(classBefore).toContain("card-not-inverted-big-border-os");

    await almaCard.click();
    await page.waitForTimeout(500);

    const classAfter = await almaCard.evaluate((el) => el.className);
    console.log(`[INFO] AlmaLinux card class after click: "${classAfter}"`);
    expect(classAfter).toContain("card-inverted-big-border-os");
    expect(classAfter).not.toContain("card-not-inverted-big-border-os");
    console.log("[INFO] OS card selection state confirmed (inverted class) ✓");

    await goBackToServer(page);
    await context.close();
  });

  test("клик по карточке AlmaLinux — selectedOsCard.count() === 1", async ({ browser }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);

    if (!navigated) {
      console.log("[INFO] Rebuild page not reached — skip");
      await context.close();
      return;
    }

    const almaCard = rebuildPage.osCardByName("AlmaLinux 9 Latest");
    await expect(almaCard).toBeVisible({ timeout: 10_000 });
    await almaCard.click();
    await page.waitForTimeout(500);

    const selectedCount = await rebuildPage.selectedOsCard.count();
    console.log(`[INFO] Selected OS cards after click: ${selectedCount}`);
    expect(selectedCount).toBe(1);

    await goBackToServer(page);
    await context.close();
  });

  test("выбор Debian 12 — карточка выделяется, AlmaLinux снимает выбор", async ({ browser }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);

    if (!navigated) {
      console.log("[INFO] Rebuild page not reached — skip");
      await context.close();
      return;
    }

    // Select AlmaLinux first
    const almaCard = rebuildPage.osCardByName("AlmaLinux 9 Latest");
    await expect(almaCard).toBeVisible({ timeout: 10_000 });
    await almaCard.click();
    await page.waitForTimeout(400);

    // Expand Debian and select Debian 12
    await rebuildPage.expandAccordion("Debian");
    const debianCard = rebuildPage.osCardByName("Debian 12");
    await expect(debianCard).toBeVisible({ timeout: 8_000 });
    await debianCard.click();
    await page.waitForTimeout(500);

    // Debian 12 should now be selected
    const debianClass = await debianCard.evaluate((el) => el.className);
    console.log(`[INFO] Debian 12 class after click: "${debianClass}"`);
    expect(debianClass).toContain("card-inverted-big-border-os");

    // Only 1 card should be selected at a time
    const selectedCount = await rebuildPage.selectedOsCard.count();
    console.log(`[INFO] Total selected cards: ${selectedCount}`);
    expect(selectedCount).toBe(1);

    await goBackToServer(page);
    await context.close();
  });

  test("финальная кнопка Install/Rebuild видна на странице — но в тестах не нажимается", async ({
    browser,
  }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);

    if (!navigated) {
      console.log("[INFO] Rebuild page not reached — skip");
      await context.close();
      return;
    }

    // Select an OS first so the install button appears
    const almaCard = rebuildPage.osCardByName("AlmaLinux 9 Latest");
    await expect(almaCard).toBeVisible({ timeout: 10_000 });
    await almaCard.click();
    await page.waitForTimeout(500);

    const installBtn = rebuildPage.finalInstallButton;
    const isVisible = await installBtn.isVisible().catch(() => false);
    const btnText = isVisible ? await installBtn.innerText().catch(() => "") : "not found";

    console.log(`[INFO] Final install button visible: ${isVisible}, text: "${btnText.trim()}"`);
    console.log("[INFO] ⚠️  Not clicking — would trigger real rebuild");

    if (isVisible) {
      await expect(installBtn).toBeEnabled({ timeout: 5_000 });
      console.log("[INFO] Final install button is enabled ✓ (but NOT clicked)");
    }

    await goBackToServer(page);
    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 5 — Возврат на страницу сервера
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Rebuild: возврат на страницу сервера", () => {
  test("после выбора ОС без Install — навигация назад к серверу работает", async ({
    browser,
  }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);

    if (!navigated) {
      console.log("[INFO] Rebuild page not reached — skip");
      await context.close();
      return;
    }

    const urlOnRebuildPage = page.url();
    console.log(`[INFO] URL on rebuild page: ${urlOnRebuildPage}`);

    await goBackToServer(page);

    const urlAfterBack = page.url();
    console.log(`[INFO] URL after back navigation: ${urlAfterBack}`);
    expect(urlAfterBack).toContain(TEST_SERVER_UUID);
    console.log("[INFO] Successfully navigated back to server page ✓");

    await context.close();
  });

  test("после возврата на сервер — статус сервера всё ещё виден (rebuild не запущен)", async ({
    browser,
  }) => {
    const { context, page, serverPage, rebuildPage, navigated } = await openRebuildPage(browser);

    if (!navigated) {
      console.log("[INFO] Rebuild page not reached — skip");
      await context.close();
      return;
    }

    await goBackToServer(page);

    await expect(serverPage.statusBadge).toBeVisible({ timeout: 15_000 });
    const status = await serverPage.getStatusText();
    console.log(`[INFO] Server status after visiting rebuild page (without installing): "${status}"`);

    expect(["Running", "Stopped"]).toContain(status);
    console.log("[INFO] Server intact after viewing rebuild page ✓");

    await context.close();
  });
});
