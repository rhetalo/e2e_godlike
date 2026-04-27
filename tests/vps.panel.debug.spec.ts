/**
 * vps.panel.debug.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * ЗАПУСТИТЬ ПЕРВЫМ — перед основными тестами
 *
 * Цель: собрать реальные CSS-классы, атрибуты и структуру DOM
 *       из живой VirtFusion панели, чтобы уточнить селекторы
 *       в pages/ и utils/selectors.ts.
 *
 * Запуск:
 *   cd tests/VPS
 *   npx playwright test tests/vps.panel.debug.spec.ts --project=chromium --headed
 *
 * После запуска:
 *   1. Изучи консольный вывод — найди реальные классы
 *   2. Обнови pages/LoginPage.ts, pages/ServersListPage.ts и т.д.
 *   3. Обнови utils/selectors.ts VPS-раздел
 *   4. Запусти основные тесты
 */

import { test, expect, type Page, type Browser } from "@playwright/test";
import { loginAndSaveSession, PANEL_URL, EMAIL, PASSWORD, STORAGE_STATE_PATH } from "../utils/auth";

test.use({
  viewport: { width: 1440, height: 900 },
});

// ── Helper: dump elements matching partial class ───────────────────────────

async function dumpElements(page: Page | import("@playwright/test").Locator, selector: string, label: string) {
  const els = await page.locator(selector).all();
  console.log(`\n[DUMP: ${label}] found ${els.length} element(s) via "${selector}"`);
  for (const el of els.slice(0, 20)) {
    const cls = await el.getAttribute("class").catch(() => "");
    const tag = await el.evaluate((e) => e.tagName.toLowerCase());
    const txt = (await el.innerText().catch(() => "")).trim().slice(0, 80);
    const id = await el.getAttribute("id").catch(() => "");
    const href = await el.getAttribute("href").catch(() => "");
    const dataAttrs = await el.evaluate((e) => {
      const attrs: Record<string, string> = {};
      for (const attr of e.attributes) {
        if (attr.name.startsWith("data-")) attrs[attr.name] = attr.value;
      }
      return JSON.stringify(attrs);
    });
    const vis = await el.isVisible().catch(() => false);
    if (vis) {
      console.log(
        `  <${tag}> id="${id}" class="${cls}" href="${href}" data=${dataAttrs} | "${txt}"`
      );
    }
  }
}

async function dumpAllLinks(page: Page, keyword: string) {
  const links = await page.locator("a, button").all();
  console.log(`\n[DUMP: links/buttons matching "${keyword}"]`);
  for (const el of links) {
    const txt = (await el.innerText().catch(() => "")).trim();
    if (!new RegExp(keyword, "i").test(txt)) continue;
    const href = await el.getAttribute("href").catch(() => "");
    const cls = await el.getAttribute("class").catch(() => "");
    const vis = await el.isVisible().catch(() => false);
    if (vis) console.log(`  text="${txt}" href="${href}" class="${cls}"`);
  }
}

// ─── Setup: login once ────────────────────────────────────────────────────

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginAndSaveSession(browser);
});

// ─── 1. Login page structure ──────────────────────────────────────────────

test("DEBUG: login page DOM structure", async ({ browser }) => {
  const page = await browser.newPage();

  await page.goto(`${PANEL_URL}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });

  console.log(`\n[INFO] Login page URL: ${page.url()}`);

  // Dump all inputs
  const inputs = await page.locator("input").all();
  console.log(`\n[DUMP: inputs] ${inputs.length} input(s)`);
  for (const inp of inputs) {
    const type = await inp.getAttribute("type");
    const name = await inp.getAttribute("name");
    const id = await inp.getAttribute("id");
    const placeholder = await inp.getAttribute("placeholder");
    const cls = await inp.getAttribute("class");
    console.log(
      `  type="${type}" name="${name}" id="${id}" placeholder="${placeholder}" class="${cls}"`
    );
  }

  // Dump buttons
  await dumpElements(page, "button", "buttons");

  // Dump headings
  const headings = await page.locator("h1, h2, h3, h4").allInnerTexts();
  console.log(`\n[DUMP: headings]`, headings);

  await page.screenshot({ path: "debug-panel-login.png", fullPage: true });
  console.log("[INFO] Screenshot: debug-panel-login.png");

  await page.close();
});

// ─── 2. Servers list page ─────────────────────────────────────────────────

test("DEBUG: servers list page DOM structure", async ({ browser }) => {
  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();

  await page.goto(`${PANEL_URL}/servers`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await page.waitForLoadState("networkidle").catch(() => null);

  console.log(`\n[INFO] Servers page URL: ${page.url()}`);
  console.log("[INFO] Page title:", await page.title());

  // Dump main content
  await dumpElements(page, '[class*="server"]', "server* elements");
  await dumpElements(page, '[class*="vm"]', "vm* elements");
  await dumpElements(page, '[class*="card"]', "card elements");
  await dumpElements(page, '[class*="list"]', "list elements");
  await dumpElements(page, '[data-server-id]', "data-server-id elements");

  // Navigation
  await dumpElements(page, 'nav a, [class*="sidebar"] a, [class*="menu"] a', "nav links");

  // Headings
  const headings = await page.locator("h1, h2, h3, h4").allInnerTexts();
  console.log(`\n[DUMP: headings]`, headings);

  // All links
  await dumpAllLinks(page, "manage|server|vps");

  await page.screenshot({ path: "debug-panel-servers.png", fullPage: true });
  console.log("[INFO] Screenshot: debug-panel-servers.png");

  await context.close();
});

// ─── 3. Server detail page tabs ───────────────────────────────────────────

test("DEBUG: server detail page DOM - tabs and controls", async ({ browser }) => {
  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();

  await page.goto(`${PANEL_URL}/servers`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await page.waitForLoadState("networkidle").catch(() => null);

  // Try to open first server
  const serverLinks = page.locator(
    'a[href*="server"], a:has-text("Manage"), [class*="manage"]'
  );
  const count = await serverLinks.count();

  if (count === 0) {
    console.log("[WARN] No servers found — logging current page HTML summary:");
    const bodyText = await page.locator("body").innerText().catch(() => "");
    console.log(bodyText.slice(0, 2000));
    await page.screenshot({ path: "debug-panel-empty.png", fullPage: true });
    await context.close();
    return;
  }

  await serverLinks.first().click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle").catch(() => null);

  console.log(`\n[INFO] Server detail URL: ${page.url()}`);

  // Tabs
  await dumpElements(page, '[class*="tab"], [role="tab"], [class*="nav-link"]', "tabs");

  // Power buttons
  await dumpElements(
    page,
    'button[data-action], [class*="power"], [class*="action-btn"]',
    "power/action buttons"
  );

  // Status
  await dumpElements(page, '[class*="status"], [class*="badge"], [class*="state"]', "status");

  // All buttons
  const buttons = await page.locator("button").all();
  console.log(`\n[DUMP: all buttons] ${buttons.length} button(s)`);
  for (const btn of buttons) {
    const txt = (await btn.innerText().catch(() => "")).trim().slice(0, 50);
    const cls = await btn.getAttribute("class").catch(() => "");
    const dataAction = await btn.getAttribute("data-action").catch(() => "");
    const vis = await btn.isVisible().catch(() => false);
    if (vis && txt) {
      console.log(`  text="${txt}" class="${cls}" data-action="${dataAction}"`);
    }
  }

  await page.screenshot({ path: "debug-panel-server-detail.png", fullPage: true });
  console.log("[INFO] Screenshot: debug-panel-server-detail.png");

  await context.close();
});

// ─── 4. Media/Build tab DOM ───────────────────────────────────────────────

test("DEBUG: server media/build tab DOM structure", async ({ browser }) => {
  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();

  await page.goto(`${PANEL_URL}/servers`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await page.waitForLoadState("networkidle").catch(() => null);

  const serverLinks = page.locator('a[href*="server"], a:has-text("Manage")');
  const count = await serverLinks.count();

  if (count === 0) {
    console.log("[WARN] No servers to debug media tab");
    await context.close();
    return;
  }

  await serverLinks.first().click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle").catch(() => null);

  // Try to click Media tab
  const mediaTab = page.locator(
    '[class*="nav-link"]:has-text("Media"), a:has-text("Media"), button:has-text("Media"), [class*="tab"]:has-text("Media")'
  ).first();

  const mediaVisible = await mediaTab.isVisible().catch(() => false);
  if (mediaVisible) {
    await mediaTab.click();
    await page.waitForTimeout(1500);
    console.log("[INFO] Clicked Media tab");
  } else {
    console.log("[WARN] Media tab not visible — dumping all tabs:");
    const tabs = await page.locator('[class*="tab"], [class*="nav-link"], [role="tab"]').all();
    for (const t of tabs) {
      const txt = await t.innerText().catch(() => "");
      const vis = await t.isVisible().catch(() => false);
      if (vis) console.log(`  tab: "${txt}"`);
    }
  }

  // Templates / OS options
  await dumpElements(page, '[class*="template"]', "template elements");
  await dumpElements(page, '[class*="os"]', "OS elements");
  await dumpElements(page, '[class*="media"]', "media elements");
  await dumpElements(page, '[class*="image"]', "image elements");
  await dumpElements(page, '[data-template-id]', "data-template-id");
  await dumpElements(page, 'select', "select dropdowns");

  // Inputs
  const inputs = await page.locator("input").all();
  console.log(`\n[DUMP: inputs on media tab] ${inputs.length}`);
  for (const inp of inputs) {
    const type = await inp.getAttribute("type");
    const name = await inp.getAttribute("name");
    const id = await inp.getAttribute("id");
    const placeholder = await inp.getAttribute("placeholder");
    console.log(`  type="${type}" name="${name}" id="${id}" placeholder="${placeholder}"`);
  }

  await page.screenshot({ path: "debug-panel-media-tab.png", fullPage: true });
  console.log("[INFO] Screenshot: debug-panel-media-tab.png");

  await context.close();
});

// ─── 5. Servers list — Delete button and modal DOM ───────────────────────

test("DEBUG: servers list delete button and modal DOM", async ({ browser }) => {
  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();

  await page.goto(`${PANEL_URL}/servers`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await page.waitForLoadState("networkidle").catch(() => null);

  console.log(`\n[INFO] Servers list URL: ${page.url()}`);

  // Dump all "Delete" buttons on the list
  await dumpElements(
    page,
    'button:has-text("Delete"), a:has-text("Delete")',
    '"Delete" buttons on servers list'
  );

  // Click first Delete button to open modal
  const deleteBtn = page.locator('button:has-text("Delete"), a:has-text("Delete")').first();
  const deleteBtnVisible = await deleteBtn.isVisible().catch(() => false);

  if (!deleteBtnVisible) {
    console.log("[WARN] No Delete button found on servers list");
    await context.close();
    return;
  }

  await deleteBtn.click();
  console.log("[INFO] Clicked Delete button");

  // Wait for modal
  const modal = page.locator('[class*="modal"], [role="dialog"]').first();
  const modalVisible = await modal.waitFor({ state: "visible", timeout: 8_000 }).then(() => true).catch(() => false);

  if (modalVisible) {
    const modalText = await modal.innerText().catch(() => "");
    console.log(`\n[DUMP: Delete modal text]\n${modalText}`);

    // Dump modal buttons
    await dumpElements(modal, "button", "modal buttons");

    // Dump modal inputs
    const inputs = await modal.locator("input").all();
    console.log(`\n[DUMP: modal inputs] ${inputs.length}`);
    for (const inp of inputs) {
      const type = await inp.getAttribute("type");
      const name = await inp.getAttribute("name");
      const placeholder = await inp.getAttribute("placeholder");
      console.log(`  type="${type}" name="${name}" placeholder="${placeholder}"`);
    }

    await page.screenshot({ path: "debug-delete-modal.png", fullPage: true });
    console.log("[INFO] Screenshot: debug-delete-modal.png");

    // Cancel
    const cancelBtn = modal.locator('button:has-text("Cancel")').first();
    if (await cancelBtn.isVisible().catch(() => false)) {
      await cancelBtn.click();
      console.log("[INFO] Cancelled delete modal ✓");
    }
  } else {
    console.log("[WARN] No modal appeared after clicking Delete");
    await page.screenshot({ path: "debug-delete-no-modal.png", fullPage: true });
  }

  await context.close();
});

// ─── 6. Options/Delete tab DOM ────────────────────────────────────────────

test("DEBUG: server options/delete tab DOM structure", async ({ browser }) => {
  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();

  await page.goto(`${PANEL_URL}/servers`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await page.waitForLoadState("networkidle").catch(() => null);

  const serverLinks = page.locator('a[href*="server"], a:has-text("Manage")');
  const count = await serverLinks.count();

  if (count === 0) {
    console.log("[WARN] No servers to debug options tab");
    await context.close();
    return;
  }

  await serverLinks.first().click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle").catch(() => null);

  // Try Options tab
  const optionsSelectors = [
    '[class*="nav-link"]:has-text("Options")',
    'a:has-text("Options")',
    'button:has-text("Options")',
    '[class*="nav-link"]:has-text("Settings")',
    'a:has-text("Settings")',
  ];

  let tabClicked = false;
  for (const sel of optionsSelectors) {
    const tab = page.locator(sel).first();
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
      await page.waitForTimeout(1000);
      console.log(`[INFO] Clicked tab via: ${sel}`);
      tabClicked = true;
      break;
    }
  }

  if (!tabClicked) {
    console.log("[WARN] No Options/Settings tab found");
  }

  await dumpElements(page, '[class*="danger"]', "danger zone elements");
  await dumpElements(page, '[class*="delete"]', "delete elements");
  await dumpElements(page, '[class*="terminate"]', "terminate elements");
  await dumpElements(page, '[class*="destroy"]', "destroy elements");

  // All dangerous buttons
  const buttons = await page.locator("button").all();
  console.log(`\n[DUMP: all visible buttons]`);
  for (const btn of buttons) {
    const txt = (await btn.innerText().catch(() => "")).trim();
    const cls = await btn.getAttribute("class").catch(() => "");
    const vis = await btn.isVisible().catch(() => false);
    if (vis && txt) console.log(`  text="${txt}" class="${cls}"`);
  }

  await page.screenshot({ path: "debug-panel-options-tab.png", fullPage: true });
  console.log("[INFO] Screenshot: debug-panel-options-tab.png");

  await context.close();
});
