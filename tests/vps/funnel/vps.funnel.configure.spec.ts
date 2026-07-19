/**
 * vps.funnel.configure.spec.ts
 * ────────────────────────────
 * SUITE 3 VPS-воронки: шаг Configure Your Server (step=3) в /cart-vps/.
 * Локации (USA / Europe) и выбор ОС/версии, отражение в order summary.
 * Read-only.
 *
 * Сценарии идут СЕРИЙНО по одной странице: логин, контекст и проход
 * Deploy→Billing→Configure (goToConfigureStep) делаются один раз в beforeAll
 * (раньше каждый из 5 тестов проходил воронку заново). Configure — общее
 * изменяемое состояние; единственная «свежая» проверка — дефолтный тип ОС
 * (Games) — валидна только пока тесты локаций ОС не трогают, поэтому
 * declaration-order (локации → дефолт ОС → смена ОС) важен.
 */
import { test, expect, type BrowserContext } from "@playwright/test";
import { VpsConfigPage } from "../../../pages/VpsConfigPage";
import { loginVpsSession, newPinnedContext, goToConfigureStep } from "./vps.funnel.helpers";

test.describe.configure({ mode: "serial" });

test.describe("@regression VPS-воронка — Configure", () => {
  let context: BrowserContext;
  let config: VpsConfigPage;

  // Логин + контекст + проход до шага Configure — один раз; сценарии серийно по одной странице.
  test.beforeAll(async ({ browser }) => {
    await loginVpsSession(browser);
    context = await newPinnedContext(browser);
    config = await goToConfigureStep(await context.newPage());
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.describe("локации", () => {
    test("локации загружены, есть USA и Europe, одна активна; NEXT STEP активна", async () => {
      await test.step("локации загружены (>= 1) и среди них есть US и Europe", async () => {
        expect(await config.locationItems.count()).toBeGreaterThanOrEqual(1);
        const titles = (await config.locationItems.allInnerTexts()).map((t) => t.trim());
        // Прод разбил USA на регионы ("USA (west)"/"USA (east)") → проверяем НАЛИЧИЕ US и Europe
        // подстрокой, не точным равенством. (live 17-Jul-2026)
        expect(titles.some((t) => /USA/i.test(t)), `нет US-локации в ${JSON.stringify(titles)}`).toBeTruthy();
        expect(titles.some((t) => /Europe/i.test(t)), `нет Europe в ${JSON.stringify(titles)}`).toBeTruthy();
      });

      await test.step("одна локация активна по умолчанию", async () => {
        expect((await config.getActiveLocationName()).length).toBeGreaterThan(0);
      });

      await test.step("кнопка NEXT STEP видна и активна", async () => {
        await expect(config.nextStepButton).toBeVisible();
        await expect(config.nextStepButton).toBeEnabled();
      });
    });

    test("смена локации меняет активную и обновляет Location в summary", async () => {
      // Имя US-локации берём из реального списка (регионы: "USA (west)"/"USA (east)"), не хардкодим
      // «USA» — его точного больше нет. Ассерты — подстрокой (toContain), не toBe.
      const titles = (await config.locationItems.allInnerTexts()).map((t) => t.trim());
      const usName = titles.find((t) => /USA/i.test(t)) ?? "USA";

      await test.step(`${usName} → активна + summary Location = US`, async () => {
        await config.selectLocation(usName);
        expect(await config.getActiveLocationName()).toContain("USA");
        await expect(config.orderLocation).toContainText("USA");
      });

      await test.step("Europe → активна + summary Location = Europe", async () => {
        await config.selectLocation("Europe");
        expect(await config.getActiveLocationName()).toContain("Europe");
        await expect(config.orderLocation).toContainText("Europe");
      });
    });
  });

  test.describe("ОС", () => {
    // Этот сценарий проверяет дефолтный тип ОС (Games) — должен идти ДО тестов,
    // меняющих ОС (Ubuntu / Rocky / WordPress ниже). Тесты локаций ОС не трогают.
    test("типы ОС загружены, Games активна по умолчанию, Server type в summary", async () => {
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
    });

    test("Ubuntu: показывает дропдаун версий, выбор версии обновляет Server type", async () => {
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
    });

    test("смена типа (Rocky Linux) обновляет Server type; WordPress — без дропдауна", async () => {
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
    });
  });
});
