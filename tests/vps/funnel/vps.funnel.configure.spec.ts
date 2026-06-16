/**
 * vps.funnel.configure.spec.ts
 * ────────────────────────────
 * SUITE 3 VPS-воронки: шаг Configure Your Server (step=3) в /cart-vps/.
 * Локации (USA / Europe) и выбор ОС/версии, отражение в order summary.
 * Read-only.
 */
import { test, expect, type Browser } from "@playwright/test";
import { loginVpsSession, newPinnedContext, goToConfigureStep } from "./vps.funnel.helpers";

test.use({ viewport: { width: 1800, height: 900 }, deviceScaleFactor: 1 });

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginVpsSession(browser);
});

test.describe("@regression VPS-воронка — Configure (локации)", () => {
  test("локации загружены, есть USA и Europe, одна активна; NEXT STEP активна", async ({
    browser,
  }) => {
    const context = await newPinnedContext(browser);
    const page = await context.newPage();

    try {
      const config = await goToConfigureStep(page);

      await test.step("локации загружены (>= 1) и среди них USA и Europe", async () => {
        expect(await config.locationItems.count()).toBeGreaterThanOrEqual(1);
        const titles = (await config.locationItems.allInnerTexts()).map((t) => t.trim());
        expect(titles).toContain("USA");
        expect(titles).toContain("Europe");
      });

      await test.step("одна локация активна по умолчанию", async () => {
        expect((await config.getActiveLocationName()).length).toBeGreaterThan(0);
      });

      await test.step("кнопка NEXT STEP видна и активна", async () => {
        await expect(config.nextStepButton).toBeVisible();
        await expect(config.nextStepButton).toBeEnabled();
      });
    } finally {
      await context.close();
    }
  });

  test("смена локации меняет активную и обновляет Location в summary", async ({ browser }) => {
    const context = await newPinnedContext(browser);
    const page = await context.newPage();

    try {
      const config = await goToConfigureStep(page);

      await test.step("USA → активна + summary Location = USA", async () => {
        await config.selectLocation("USA");
        expect(await config.getActiveLocationName()).toBe("USA");
        await expect(config.orderLocation).toContainText("USA");
      });

      await test.step("Europe → активна + summary Location = Europe", async () => {
        await config.selectLocation("Europe");
        expect(await config.getActiveLocationName()).toBe("Europe");
        await expect(config.orderLocation).toContainText("Europe");
      });
    } finally {
      await context.close();
    }
  });
});

test.describe("@regression VPS-воронка — Configure (ОС)", () => {
  test("типы ОС загружены, Games активна по умолчанию, Server type в summary", async ({
    browser,
  }) => {
    const context = await newPinnedContext(browser);
    const page = await context.newPage();

    try {
      const config = await goToConfigureStep(page);

      await test.step("контейнер типов ОС виден, в списке >= 1 типа", async () => {
        await expect(config.osTypesContainer).toBeVisible();
        expect(await config.osTypeItems.count()).toBeGreaterThanOrEqual(1);
      });

      await test.step("по умолчанию активна Games", async () => {
        expect(await config.getActiveOsTypeName()).toBe("Games");
      });

      await test.step("summary содержит непустой Server type", async () => {
        await expect(config.orderServerType).toBeVisible();
        expect((await config.orderServerType.innerText()).trim().length).toBeGreaterThan(0);
      });
    } finally {
      await context.close();
    }
  });

  test("Ubuntu: показывает дропдаун версий, выбор версии обновляет Server type", async ({
    browser,
  }) => {
    const context = await newPinnedContext(browser);
    const page = await context.newPage();

    try {
      const config = await goToConfigureStep(page);

      await test.step("выбрать Ubuntu → активна + дропдаун версий виден", async () => {
        await config.selectOsType("Ubuntu");
        expect(await config.getActiveOsTypeName()).toBe("Ubuntu");
        await expect(config.osDropdown).toBeVisible();
        expect((await config.getCurrentOsVersion()).length).toBeGreaterThan(0);
      });

      await test.step("выбрать последнюю версию → summary Server type отражает её", async () => {
        await config.openOsDropdown();
        const items = config.osDropdownItems;
        expect(await items.count()).toBeGreaterThanOrEqual(2);
        const lastVersion = (await items.last().innerText()).trim();
        await items.last().click();
        await expect(config.orderServerType).toContainText(lastVersion);
      });
    } finally {
      await context.close();
    }
  });

  test("смена типа (Rocky Linux) обновляет Server type; WordPress — без дропдауна", async ({
    browser,
  }) => {
    const context = await newPinnedContext(browser);
    const page = await context.newPage();

    try {
      const config = await goToConfigureStep(page);

      await test.step("Rocky Linux → активна + Server type непустой", async () => {
        await config.selectOsType("Rocky Linux");
        expect(await config.getActiveOsTypeName()).toBe("Rocky Linux");
        await expect(config.orderServerType).toBeVisible();
        expect((await config.orderServerType.innerText()).trim().length).toBeGreaterThan(0);
      });

      await test.step("WordPress → активна, дропдаун версий отсутствует", async () => {
        await config.selectOsType("WordPress");
        expect(await config.getActiveOsTypeName()).toContain("WordPress");
        await expect(config.osDropdown).toBeHidden();
      });
    } finally {
      await context.close();
    }
  });
});
