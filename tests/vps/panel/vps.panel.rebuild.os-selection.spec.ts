/**
 * vps.panel.rebuild.os-selection.spec.ts
 * ───────────────────────────────────────
 * Rebuild (выбор ОС), часть 1: загрузка страницы выбора ОС, карточки шаблонов,
 * аккордеон групп. Безопасно — финальный Install НЕ нажимается.
 */
import { test, expect, type Browser } from "@playwright/test";
import { loginAndSaveSession } from "../../../utils/auth";
import { openRebuildPage, goBackToServer } from "./vps.panel.rebuild.helpers";

test.use({ viewport: { width: 1440, height: 900 } });

const SKIP_REASON = "Страница Rebuild недоступна — сервер остановлен или модал не открылся";

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginAndSaveSession(browser);
});

test.describe("@regression VPS-панель — Rebuild: страница выбора ОС", () => {
  test("страница загружается: 15+ карточек ОС с названиями, по умолчанию ничего не выбрано", async ({
    browser,
  }) => {
    const { context, rebuildPage, navigated } = await openRebuildPage(browser);
    test.skip(!navigated, SKIP_REASON);

    try {
      await test.step("на странице 15+ карточек ОС (подтверждено 18)", async () => {
        expect(await rebuildPage.getTotalOsCount()).toBeGreaterThanOrEqual(15);
      });

      await test.step("у карточек есть осмысленные названия (h5.mb-1)", async () => {
        expect(await rebuildPage.osCardNames.count()).toBeGreaterThanOrEqual(15);
        expect((await rebuildPage.osCardNames.first().innerText()).trim().length).toBeGreaterThan(3);
      });

      await test.step("по умолчанию выбранных карточек нет, невыбранных 15+", async () => {
        await expect(rebuildPage.selectedOsCard).toHaveCount(0);
        expect(await rebuildPage.unselectedOsCards.count()).toBeGreaterThanOrEqual(15);
      });
    } finally {
      await context.close();
    }
  });

  test("аккордеон групп ОС: 6 групп, свёрнуты по умолчанию, раскрытие показывает шаблоны", async ({
    browser,
  }) => {
    const { context, page, rebuildPage, navigated } = await openRebuildPage(browser);
    test.skip(!navigated, SKIP_REASON);

    try {
      await test.step("присутствуют 6 групп; CentOS/Debian/Fedora/Games/Ubuntu видны", async () => {
        expect(await rebuildPage.accordionItems.count()).toBeGreaterThanOrEqual(6);
        for (const family of ["CentOS", "Debian", "Fedora", "Games", "Ubuntu"]) {
          await expect(rebuildPage.accordionButtonByName(family)).toBeVisible({ timeout: 10_000 });
        }
      });

      await test.step("по умолчанию все группы свёрнуты (ни одной открытой панели)", async () => {
        await expect(rebuildPage.openAccordionPanels).toHaveCount(0);
      });

      await test.step("раскрытие Debian: кнопка теряет .collapsed, видны Debian 11 и 12", async () => {
        const debianBtn = rebuildPage.accordionButtonByName("Debian");
        await rebuildPage.expandAccordion("Debian");
        await expect(debianBtn).not.toHaveClass(/collapsed/, { timeout: 5_000 });
        await expect(rebuildPage.openAccordionPanels).not.toHaveCount(0);
        for (const tpl of ["Debian 11", "Debian 12"]) {
          await expect(rebuildPage.osCardByName(tpl)).toBeVisible({ timeout: 8_000 });
        }
      });

      await test.step("раскрытие Games: видны все 5 игровых шаблонов", async () => {
        await rebuildPage.expandAccordion("Games");
        for (const name of ["Valheim", "ARK: Survival Evolved", "Palworld", "Satisfactory", "Minecraft"]) {
          await expect(rebuildPage.osCardByName(name)).toBeVisible({ timeout: 8_000 });
        }
      });

      await goBackToServer(page);
    } finally {
      await context.close();
    }
  });
});
