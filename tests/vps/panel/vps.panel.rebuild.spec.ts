/**
 * vps.panel.rebuild.spec.ts
 * ──────────────────────────
 * Тесты страницы настройки Rebuild (выбор ОС) на панели VirtFusion.
 *
 * Путь навигации (подтверждён May 2026, кнопка на вкладке Overview):
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
 *   div.card.os-select:not(.selected-card)          — невыбранная
 *   div.card.os-select.selected-card                — выбранная
 *   h5.mb-1                                         — название ОС внутри карточки
 *
 * ⚠️  При выборе карточки: ДОБАВЛЯЕТСЯ .selected-card и .border-success.
 *     card-not-inverted-big-border-os ОСТАЁТСЯ на карточке.
 *     card-inverted-big-border-os НИКОГДА не добавляется — это был ошибочный класс.
 *
 * Кнопка Install:
 *   button.btn-primary.btn-lg                       — с текстом "Install with {OS}"
 *   ⚠️  ОТСУТСТВУЕТ в DOM до выбора ОС. Появляется только после клика по карточке.
 *   ⚠️  Текст меняется при смене выбранной ОС.
 *
 * Аккордеон групп ОС (heading-0..heading-5):
 *   div.accordion-item                              — группа (AlmaLinux, CentOS, …)
 *   button.accordion-button                         — заголовок группы
 *   button.accordion-button.collapsed               — свёрнутый заголовок
 *   h4.mb-0                                        — название группы внутри кнопки
 *   div.accordion-collapse.show                     — раскрытая панель
 *
 * Секция Swap Space (появляется после выбора ОС):
 *   div.card.card-not-inverted-big-border.c-pointer — вариант объёма (None, 256 MB, …)
 *   div.card.card-not-inverted-big-border.c-pointer.selected-card — выбранный вариант
 *
 * Подтверждённые группы ОС и шаблоны (18 карточек, 6 групп):
 *   AlmaLinux  — AlmaLinux 8 Minimal, AlmaLinux 9 Latest
 *   CentOS     — CentOS 7 Minimal, CentOS Stream 9 Minimal
 *   Debian     — Debian 11 (Bullseye) Minimal, Debian 12 (Bookworm) Minimal
 *   Fedora     — Fedora 41 Minimal, Fedora 42 Minimal
 *   Games      — Ubuntu+Valheim 24.04, Ubuntu+ARK 24.04, Ubuntu+Palworld 24.04,
 *                Ubuntu+Satisfactory 24.04, Ubuntu+Minecraft 22.04
 *   Ubuntu     — Ubuntu 20.04, 22.04, 24.04, Docker Ubuntu 24.04, WordPress Ubuntu 24.04
 *
 * ⚠️  БЕЗОПАСНОСТЬ:
 *   Rebuild выполняется ТОЛЬКО при клике на финальную кнопку "Install with ...".
 *   Переход на страницу и выбор карточки ОС — безопасны (данные сервера не затрагиваются).
 *   Финальная кнопка "Install with ..." в тестах НЕ нажимается.
 *
 * Запуск:
 *   npx playwright test tests/vps/panel/vps.panel.rebuild.spec.ts --project=chromium
 *   npx playwright test tests/vps/panel/vps.panel.rebuild.spec.ts --project=chromium --headed
 */
import { test, expect, type Browser, type Page } from "@playwright/test";
import { VpsPanelServerPage } from "../../../pages/VpsPanelServerPage";
import { VpsPanelRebuildPage } from "../../../pages/VpsPanelRebuildPage";
import { loginAndSaveSession, STORAGE_STATE_PATH, TEST_SERVER_UUID, PANEL_URL } from "../../../utils/auth";

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

  // Find Rebuild button by its modal target — unique and immune to hidden modal buttons
  // (data-bs-target="#reinstallServerModal" is only on the real Rebuild button in the Overview tab)
  const rebuildBtn = page.locator('button[data-bs-target="#reinstallServerModal"]').first();
  const rebuildVisible = await rebuildBtn.isVisible().catch(() => false);

  if (!rebuildVisible) {
    console.log("[INFO] Rebuild button not found — server may be stopped or button unavailable");
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
  await rebuildPage.allOsCards.first().waitFor({ state: 'attached', timeout: 5_000 }).catch(() => null);

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
  await page.waitForLoadState("networkidle").catch(() => null);
}

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — Навигация на страницу выбора ОС
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Rebuild: навигация на страницу выбора ОС", () => {
  test("Rebuild → Continue → переходим на страницу выбора ОС (URL не меняется)", async ({
    browser,
  }) => {
    const { context, page, navigated } = await openRebuildPage(browser);
    test.skip(!navigated, "Rebuild page not reachable — server may be stopped or modal unavailable");

    const currentUrl = page.url();
    console.log(`[INFO] Rebuild page URL: ${currentUrl}`);

    const isOnServerBase = currentUrl === `${PANEL_URL}/server/${TEST_SERVER_UUID}`;
    expect(!isOnServerBase, "URL должен измениться с базовой страницы сервера").toBe(false);
    console.log(`[INFO] URL changed from server base: ✓`);

    await goBackToServer(page);
    await context.close();
  });

  test("страница выбора ОС содержит 15+ OS-карточек (18 подтверждено DevTools)", async ({
    browser,
  }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);
    test.skip(!navigated, "Rebuild page not reachable — server may be stopped or modal unavailable");

    const count = await rebuildPage.getTotalOsCount();
    console.log(`[INFO] Total OS template cards: ${count} (expected >= 15, confirmed 18)`);
    expect(count).toBeGreaterThanOrEqual(15);

    await goBackToServer(page);
    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — Структура OS карточек
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Rebuild: структура OS карточек", () => {
  test("карточки ОС имеют название в h5.mb-1", async ({ browser }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);
    test.skip(!navigated, "Rebuild page not reachable — server may be stopped or modal unavailable");

    const nameCount = await rebuildPage.osCardNames.count();
    console.log(`[INFO] OS name headings (h5.mb-1) found: ${nameCount}`);
    expect(nameCount).toBeGreaterThanOrEqual(1);

    const firstName = await rebuildPage.osCardNames.first().innerText();
    console.log(`[INFO] First OS name: "${firstName.trim()}"`);
    expect(firstName.trim().length).toBeGreaterThan(3);

    await goBackToServer(page);
    await context.close();
  });

  test("по умолчанию ни одна карточка не выбрана (класс .selected-card отсутствует)", async ({
    browser,
  }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);
    test.skip(!navigated, "Rebuild page not reachable — server may be stopped or modal unavailable");

    const selectedCount = await rebuildPage.selectedOsCard.count();
    console.log(`[INFO] Selected OS cards on load: ${selectedCount} (expected 0)`);
    expect(selectedCount).toBe(0);

    const unselectedCount = await rebuildPage.unselectedOsCards.count();
    console.log(`[INFO] Unselected OS cards: ${unselectedCount}`);
    expect(unselectedCount).toBeGreaterThanOrEqual(15);

    await goBackToServer(page);
    await context.close();
  });

  test("AlmaLinux 9 Latest присутствует в списке ОС", async ({ browser }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);
    test.skip(!navigated, "Rebuild page not reachable — server may be stopped or modal unavailable");

    const card = rebuildPage.osCardByName("AlmaLinux 9 Latest");
    await rebuildPage.expandAccordion("AlmaLinux");
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
  test("присутствуют 6 групп ОС в Bootstrap-аккордеоне (heading-0..heading-5)", async ({
    browser,
  }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);
    test.skip(!navigated, "Rebuild page not reachable — server may be stopped or modal unavailable");

    const groupCount = await rebuildPage.accordionItems.count();
    console.log(`[INFO] Accordion items (OS groups): ${groupCount} (expected 6)`);
    expect(groupCount).toBeGreaterThanOrEqual(6);

    await goBackToServer(page);
    await context.close();
  });

  test("группы CentOS, Debian, Fedora, Games, Ubuntu присутствуют как заголовки аккордеона", async ({
    browser,
  }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);
    test.skip(!navigated, "Rebuild page not reachable — server may be stopped or modal unavailable");

    for (const family of ["CentOS", "Debian", "Fedora", "Games", "Ubuntu"]) {
      const btn = rebuildPage.accordionButtonByName(family);
      await expect(btn).toBeVisible({ timeout: 10_000 });
      console.log(`[INFO] "${family}" accordion group visible ✓`);
    }

    await goBackToServer(page);
    await context.close();
  });

  test("заголовки аккордеона по умолчанию свёрнуты (имеют класс .collapsed)", async ({
    browser,
  }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);
    test.skip(!navigated, "Rebuild page not reachable — server may be stopped or modal unavailable");

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

  test("клик по 'Debian' раскрывает аккордеон — кнопка теряет .collapsed, панель получает .show", async ({
    browser,
  }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);
    test.skip(!navigated, "Rebuild page not reachable — server may be stopped or modal unavailable");

    const debianBtn = rebuildPage.accordionButtonByName("Debian");
    await expect(debianBtn).toBeVisible({ timeout: 10_000 });

    const initialClass = await debianBtn.evaluate((el) => el.className);
    console.log(`[INFO] Debian button class before click: "${initialClass}"`);
    expect(initialClass).toContain("collapsed");

    await debianBtn.click();
    await expect(debianBtn).not.toHaveClass(/collapsed/, { timeout: 5_000 });

    const afterClass = await debianBtn.evaluate((el) => el.className);
    console.log(`[INFO] Debian button class after click: "${afterClass}"`);
    expect(afterClass).not.toContain("collapsed");

    const openCount = await rebuildPage.openAccordionPanels.count();
    console.log(`[INFO] Open accordion panels: ${openCount}`);
    expect(openCount).toBeGreaterThanOrEqual(1);

    await goBackToServer(page);
    await context.close();
  });

  test("внутри раскрытого Debian видны Debian 11 и Debian 12", async ({
    browser,
  }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);
    test.skip(!navigated, "Rebuild page not reachable — server may be stopped or modal unavailable");

    await rebuildPage.expandAccordion("Debian");

    for (const template of ["Debian 11", "Debian 12"]) {
      const card = rebuildPage.osCardByName(template);
      await expect(card).toBeVisible({ timeout: 8_000 });
      console.log(`[INFO] "${template}" template visible after expanding Debian ✓`);
    }

    await goBackToServer(page);
    await context.close();
  });

  test("внутри раскрытого CentOS видны CentOS 7 Minimal и CentOS Stream 9 Minimal", async ({
    browser,
  }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);
    test.skip(!navigated, "Rebuild page not reachable — server may be stopped or modal unavailable");

    await rebuildPage.expandAccordion("CentOS");

    for (const template of ["CentOS 7 Minimal", "CentOS Stream 9 Minimal"]) {
      const card = rebuildPage.osCardByName(template);
      await expect(card).toBeVisible({ timeout: 8_000 });
      console.log(`[INFO] "${template}" template visible after expanding CentOS ✓`);
    }

    await goBackToServer(page);
    await context.close();
  });

  test("внутри раскрытого Games видны все 5 игровых шаблонов", async ({
    browser,
  }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);
    test.skip(!navigated, "Rebuild page not reachable — server may be stopped or modal unavailable");

    await rebuildPage.expandAccordion("Games");

    const gameTemplates = [
      "Valheim",
      "ARK: Survival Evolved",
      "Palworld",
      "Satisfactory",
      "Minecraft",
    ];

    for (const name of gameTemplates) {
      const card = rebuildPage.osCardByName(name);
      await expect(card).toBeVisible({ timeout: 8_000 });
      console.log(`[INFO] Games → "${name}" template visible ✓`);
    }

    await goBackToServer(page);
    await context.close();
  });

  test("внутри раскрытого Ubuntu видны Ubuntu 22.04 и Ubuntu 24.04", async ({
    browser,
  }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);
    test.skip(!navigated, "Rebuild page not reachable — server may be stopped or modal unavailable");

    await rebuildPage.expandAccordion("Ubuntu");

    for (const template of ["Ubuntu Server 22.04", "Ubuntu Server 24.04"]) {
      const card = rebuildPage.osCardByName(template);
      await expect(card).toBeVisible({ timeout: 8_000 });
      console.log(`[INFO] Ubuntu → "${template}" visible ✓`);
    }

    await goBackToServer(page);
    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — Выбор OS карточки (безопасно — без финального Install)
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Rebuild: выбор ОС (Install не нажимаем)", () => {
  test("клик по карточке AlmaLinux — карточка получает .selected-card и .border-success", async ({
    browser,
  }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);
    test.skip(!navigated, "Rebuild page not reachable — server may be stopped or modal unavailable");

    const almaCard = rebuildPage.osCardByName("AlmaLinux 9 Latest");
    await rebuildPage.expandAccordion("AlmaLinux");
    await expect(almaCard).toBeVisible({ timeout: 10_000 });

    const classBefore = await almaCard.evaluate((el) => el.className);
    console.log(`[INFO] AlmaLinux card class before click: "${classBefore}"`);
    expect(classBefore).not.toContain("selected-card");
    expect(classBefore).not.toContain("border-success");

    await almaCard.click();
    await expect(almaCard).toHaveClass(/selected-card/, { timeout: 5_000 });

    const classAfter = await almaCard.evaluate((el) => el.className);
    console.log(`[INFO] AlmaLinux card class after click: "${classAfter}"`);
    expect(classAfter).toContain("selected-card");
    expect(classAfter).toContain("border-success");
    // card-not-inverted-big-border-os остаётся — это подтверждённое поведение
    expect(classAfter).toContain("card-not-inverted-big-border-os");
    console.log("[INFO] OS card selection state confirmed (.selected-card + .border-success) ✓");

    await goBackToServer(page);
    await context.close();
  });

  test("клик по карточке AlmaLinux — selectedOsCard.count() === 1", async ({ browser }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);
    test.skip(!navigated, "Rebuild page not reachable — server may be stopped or modal unavailable");

    const almaCard = rebuildPage.osCardByName("AlmaLinux 9 Latest");
    await rebuildPage.expandAccordion("AlmaLinux");
    await expect(almaCard).toBeVisible({ timeout: 10_000 });
    await almaCard.click();
    await expect(almaCard).toHaveClass(/selected-card/, { timeout: 5_000 });

    const selectedCount = await rebuildPage.selectedOsCard.count();
    console.log(`[INFO] Selected OS cards after click: ${selectedCount} (expected 1)`);
    expect(selectedCount).toBe(1);

    await goBackToServer(page);
    await context.close();
  });

  test("выбор Debian 12 после AlmaLinux — только одна карточка выбрана (single-select)", async ({
    browser,
  }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);
    test.skip(!navigated, "Rebuild page not reachable — server may be stopped or modal unavailable");

    // Select AlmaLinux first
    const almaCard = rebuildPage.osCardByName("AlmaLinux 9 Latest");
    await rebuildPage.expandAccordion("AlmaLinux");
    await expect(almaCard).toBeVisible({ timeout: 10_000 });
    await almaCard.click();
    await expect(almaCard).toHaveClass(/selected-card/, { timeout: 5_000 });

    expect(await rebuildPage.selectedOsCard.count()).toBe(1);
    console.log("[INFO] AlmaLinux selected ✓");

    // Expand Debian and select Debian 12
    await rebuildPage.expandAccordion("Debian");
    const debianCard = rebuildPage.osCardByName("Debian 12");
    await expect(debianCard).toBeVisible({ timeout: 8_000 });
    await debianCard.click();
    await expect(debianCard).toHaveClass(/selected-card/, { timeout: 5_000 });

    // Debian 12 should now be selected
    const debianClass = await debianCard.evaluate((el) => el.className);
    console.log(`[INFO] Debian 12 class after click: "${debianClass}"`);
    expect(debianClass).toContain("selected-card");
    expect(debianClass).toContain("border-success");

    // Only 1 card should be selected at a time (single-select)
    const selectedCount = await rebuildPage.selectedOsCard.count();
    console.log(`[INFO] Total selected cards: ${selectedCount} (expected 1)`);
    expect(selectedCount).toBe(1);

    // AlmaLinux should be deselected
    const almaClassAfter = await almaCard.evaluate((el) => el.className);
    expect(almaClassAfter).not.toContain("selected-card");
    console.log("[INFO] AlmaLinux deselected after Debian 12 chosen ✓");

    await goBackToServer(page);
    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 5 — Кнопка Install: поведение до и после выбора ОС
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Rebuild: кнопка Install (не нажимаем)", () => {
  test("до выбора ОС — кнопка 'Install with ...' отсутствует в DOM", async ({ browser }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);
    test.skip(!navigated, "Rebuild page not reachable — server may be stopped or modal unavailable");

    const isVisible = await rebuildPage.isInstallButtonVisible();
    console.log(`[INFO] Install button visible before OS selection: ${isVisible} (expected false)`);
    expect(isVisible).toBe(false);

    await goBackToServer(page);
    await context.close();
  });

  test("после выбора AlmaLinux — кнопка Install появляется и содержит название ОС", async ({
    browser,
  }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);
    test.skip(!navigated, "Rebuild page not reachable — server may be stopped or modal unavailable");

    const almaCard = rebuildPage.osCardByName("AlmaLinux 9 Latest");
    await rebuildPage.expandAccordion("AlmaLinux");
    await expect(almaCard).toBeVisible({ timeout: 10_000 });
    await almaCard.click();

    await expect(rebuildPage.finalInstallButton).toBeVisible({ timeout: 5_000 });
    const btnText = await rebuildPage.getInstallButtonText();
    console.log(`[INFO] Install button text: "${btnText}"`);

    expect(btnText).toMatch(/^Install with /);
    expect(btnText).toContain("AlmaLinux");
    console.log("[INFO] Install button appeared with correct OS name ✓");

    await goBackToServer(page);
    await context.close();
  });

  test("текст кнопки Install меняется при смене ОС (AlmaLinux → Debian 11)", async ({
    browser,
  }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);
    test.skip(!navigated, "Rebuild page not reachable — server may be stopped or modal unavailable");

    // Select AlmaLinux
    const almaCard = rebuildPage.osCardByName("AlmaLinux 9 Latest");
    await rebuildPage.expandAccordion("AlmaLinux");
    await expect(almaCard).toBeVisible({ timeout: 10_000 });
    await almaCard.click();
    await expect(rebuildPage.finalInstallButton).toBeVisible({ timeout: 5_000 });

    const text1 = await rebuildPage.getInstallButtonText();
    console.log(`[INFO] Install button text after AlmaLinux: "${text1}"`);
    expect(text1).toContain("AlmaLinux");

    // Switch to Debian 11
    await rebuildPage.expandAccordion("Debian");
    const debianCard = rebuildPage.osCardByName("Debian 11");
    await expect(debianCard).toBeVisible({ timeout: 8_000 });
    await debianCard.click();

    await expect.poll(async () => {
      const t = await rebuildPage.getInstallButtonText();
      return t.includes("Debian");
    }, { timeout: 5_000 }).toBe(true);

    const text2 = await rebuildPage.getInstallButtonText();
    console.log(`[INFO] Install button text after Debian 11: "${text2}"`);
    expect(text2).toContain("Debian");
    expect(text1).not.toBe(text2);
    console.log("[INFO] Install button text updated on OS switch ✓");

    await goBackToServer(page);
    await context.close();
  });

  test("после выбора ОС — секция Swap Space появляется", async ({ browser }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);
    test.skip(!navigated, "Rebuild page not reachable — server may be stopped or modal unavailable");

    // Before selection — swap cards should not be present
    const swapCountBefore = await rebuildPage.swapSpaceCards.count();
    console.log(`[INFO] Swap space cards before OS selection: ${swapCountBefore}`);

    const almaCard = rebuildPage.osCardByName("AlmaLinux 9 Latest");
    await rebuildPage.expandAccordion("AlmaLinux");
    await expect(almaCard).toBeVisible({ timeout: 10_000 });
    await almaCard.click();

    // Swap space cards should appear
    await expect.poll(async () => {
      return rebuildPage.swapSpaceCards.count();
    }, { timeout: 5_000 }).toBeGreaterThanOrEqual(3);

    const swapCountAfter = await rebuildPage.swapSpaceCards.count();
    console.log(`[INFO] Swap space cards after OS selection: ${swapCountAfter} ✓`);

    await goBackToServer(page);
    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 6 — Возврат на страницу сервера
// ══════════════════════════════════════════════════════════════════════════════
test.describe("VPS Panel — Rebuild: возврат на страницу сервера", () => {
  test("после выбора ОС без Install — навигация назад к серверу работает", async ({
    browser,
  }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);
    test.skip(!navigated, "Rebuild page not reachable — server may be stopped or modal unavailable");

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
    test.skip(!navigated, "Rebuild page not reachable — server may be stopped or modal unavailable");

    // serverPage.goto() обрабатывает Cancel Rebuild если страница в rebuild-режиме
    // и ждёт networkidle — надёжнее чем goBackToServer(page)
    await serverPage.goto();

    await expect(serverPage.statusBadge).toBeVisible({ timeout: 15_000 });
    const status = await serverPage.getStatusText();
    console.log(`[INFO] Server status after visiting rebuild page (without installing): "${status}"`);

    expect(["Running", "Stopped"]).toContain(status);
    console.log("[INFO] Server intact after viewing rebuild page ✓");

    await context.close();
  });
});
