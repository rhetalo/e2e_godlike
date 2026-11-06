/**
 * Новый конфигуратор хостинга `#hosting-funnel` (вариант B A/B `hostingFunnelVariant`, с ~05-Nov-2026)
 * на главной и на /modded-minecraft-server-hosting/.
 *
 * Вариант пиннится cookie B поверх дефолтного A (fixtures/base → pinAmplitudeExperiments).
 * Read-only: доходим до HOST NOW → встроенная форма Register/Login, НИЧЕГО не отправляем
 * (аккаунты/заказы на проде не создаём). Контент модпаков и цены маркетинговые - ассерты
 * структурные (порядок цен, смена рекомендации), без хардкода сумм и имён паков.
 */
import { test, expect } from "../../fixtures/base";
import { HostingFunnelPage } from "../../pages/HostingFunnelPage";
import { Urls } from "../../fixtures/test-data";
import { pinHostingFunnelVariant } from "../../utils/amplitude";

const STEP_TITLES = ["What should we install?", "Who's playing?", "Server size", "Server location", "Billing period"];

test.describe("Hosting funnel (вариант B) — главная", () => {
  let funnel: HostingFunnelPage;

  test.beforeEach(async ({ page, context }) => {
    await pinHostingFunnelVariant(context, "B");
    funnel = new HostingFunnelPage(page);
    await funnel.open(Urls.home);
  });

  test("@smoke TC-HF-001 | стартовое состояние: 5 шагов, 4 таба, без модпака дальше не пройти", async () => {
    await test.step("компонент главной (data-entry-page=home)", async () => {
      expect(await funnel.entryPage()).toBe("home");
    });

    await test.step("степпер из 5 шагов, текущий - первый, остальные недоступны", async () => {
      await expect(funnel.steps).toHaveCount(5);
      for (const [i, title] of STEP_TITLES.entries()) {
        await expect(funnel.steps.nth(i)).toContainText(title);
      }
      await expect(funnel.currentStep).toContainText(STEP_TITLES[0]);
      await expect(funnel.steps.nth(1)).toBeDisabled();
    });

    await test.step("4 таба выбора, активен «Minecraft Modpack»", async () => {
      await expect(funnel.tabs).toHaveText(["Minecraft Modpack", "Minecraft", "Custom Modpack", "Other Games"]);
      await expect(funnel.tab("Minecraft Modpack")).toHaveAttribute("aria-selected", "true");
    });

    await test.step("без выбранного модпака Continue и CTA заблокированы", async () => {
      await expect(funnel.popularPacks.first()).toBeVisible();
      await expect(funnel.advanceButton).toBeDisabled();
      await expect(funnel.cta).toBeDisabled();
      await expect(funnel.cta).toContainText(/FINISH STEP 1/i);
    });
  });

  test("@regression TC-HF-002 | табы Minecraft и Other Games показывают свои поля", async () => {
    await test.step("Minecraft: редакция Java/Bedrock, лоадер и версия", async () => {
      await funnel.tab("Minecraft").click();
      await expect(funnel.tab("Minecraft")).toHaveAttribute("aria-selected", "true");
      await expect(funnel.pane).toContainText("Java");
      await expect(funnel.pane).toContainText("Bedrock");
      await expect(funnel.pane).toContainText(/Minecraft Version/i);
    });

    await test.step("Other Games: поиск игры, Continue заблокирован до выбора", async () => {
      await funnel.tab("Other Games").click();
      await expect(funnel.pane).toContainText(/What game are you looking for/i);
      await expect(funnel.advanceButton).toBeDisabled();
    });
  });

  test("@critical TC-HF-003 | полный путь 5 шагов → сводка «All set» → HOST NOW активен", async () => {
    const pack = await funnel.pickFirstPopularPack();

    await test.step("выбор модпака: шаг 1 показывает выбор, карточка справа - тариф и цену", async () => {
      await expect(funnel.steps.first()).toContainText(/MC \d/);
      await expect(funnel.aside).toContainText(pack);
      expect(await funnel.readAsidePrice()).toBeGreaterThan(0);
    });

    await funnel.runToSummary({ period: "Quarterly" });

    await test.step("сводка: все шаги заполнены, выбранные значения видны", async () => {
      await expect(funnel.pane).toContainText(/All set/i);
      await expect(funnel.pane).toContainText(/players/i);
      await expect(funnel.pane).toContainText("Quarterly");
      await expect(funnel.aside).toContainText(/Billing period/i);
      await expect(funnel.aside).toContainText(/Location/i);
    });

    await test.step("CTA стал HOST NOW и активен", async () => {
      await expect(funnel.cta).toHaveText(/HOST NOW/i);
      await expect(funnel.cta).toBeEnabled();
    });
  });

  test("@regression TC-HF-004 | больше игроков → рекомендованный тариф крупнее, меньшие помечены «Below recommended»", async () => {
    await funnel.pickFirstPopularPack();
    await funnel.advance(); // → Who's playing?
    await funnel.advance(); // → Server size (игроки по умолчанию)
    const defaultPlan = await funnel.activePlan.innerText();

    await test.step("рекомендация по умолчанию выбрана, ниже неё - «Below recommended»", async () => {
      await expect(funnel.activePlanTag).toHaveText(/Recommended/i);
      expect(await funnel.belowRecommendedPlans.count()).toBeGreaterThan(0);
    });

    await test.step("вернуться на «Who's playing?», выбрать 21-50 игроков → рекомендация выросла", async () => {
      await funnel.steps.nth(1).click();
      await funnel.playersMark("21-50").click();
      await funnel.advance(); // → Server size
      await expect(funnel.activePlanTag).toHaveText(/Recommended/i);
      await expect(funnel.activePlan).not.toHaveText(defaultPlan);
    });
  });

  test("@regression TC-HF-005 | период оплаты: длиннее период → ниже цена за месяц", async () => {
    await funnel.pickFirstPopularPack();
    for (let i = 0; i < 4; i++) await funnel.advance(); // → Billing period

    await test.step("4 периода, по умолчанию Monthly", async () => {
      await expect(funnel.periods).toHaveCount(4);
      await expect(funnel.period("Monthly")).toHaveClass(/is-active/);
    });

    const monthly = await funnel.readAsidePrice();
    await funnel.period("Yearly").click();

    await test.step("Yearly выбран, цена в карточке за месяц меньше Monthly", async () => {
      await expect(funnel.period("Yearly")).toHaveClass(/is-active/);
      await expect.poll(() => funnel.readAsidePrice()).toBeLessThan(monthly);
    });
  });

  test("@critical TC-HF-006 | HOST NOW (гость) → форма Register/Login в компоненте; «Back to configuration» возвращает", async () => {
    await funnel.runToSummary();
    await funnel.hostNow();

    await test.step("встроенная регистрация: email / username / password, URL не сменился", async () => {
      await expect(funnel.authEmail).toBeVisible();
      await expect(funnel.authUsername).toBeVisible();
      await expect(funnel.authPassword).toBeVisible();
      expect(new URL(funnel.url()).pathname).toBe(Urls.home);
    });

    await funnel.backToConfiguration();

    await test.step("вернулись к сводке, HOST NOW снова активен (ничего не отправлено)", async () => {
      await expect(funnel.pane).toContainText(/All set/i);
      await expect(funnel.cta).toBeEnabled();
      await expect(funnel.authEmail).toBeHidden();
    });
  });

  test("@regression TC-HF-007 | прогресс переживает перезагрузку (sessionStorage)", async ({ page }) => {
    await funnel.runToSummary();

    await test.step("прогресс сохранён в sessionStorage", async () => {
      expect(await funnel.hasStoredProgress()).toBe(true);
    });

    await page.reload({ waitUntil: "domcontentloaded" });

    await test.step("после reload - снова сводка и активный HOST NOW", async () => {
      await expect(funnel.pane).toContainText(/All set/i, { timeout: 30_000 });
      await expect(funnel.cta).toBeEnabled();
    });
  });
});

test.describe("Hosting funnel (вариант B) — modded", () => {
  let funnel: HostingFunnelPage;

  test.beforeEach(async ({ page, context }) => {
    await pinHostingFunnelVariant(context, "B");
    funnel = new HostingFunnelPage(page);
    await funnel.open(Urls.moddedHosting);
  });

  test("@smoke TC-HF-101 | modded: 2 таба, модпак предвыбран, можно сразу продолжить; старого калькулятора нет", async () => {
    await test.step("компонент modded (data-entry-page=modded)", async () => {
      expect(await funnel.entryPage()).toBe("modded");
    });

    await test.step("табы только Minecraft Modpack и Custom Modpack", async () => {
      await expect(funnel.tabs).toHaveText(["Minecraft Modpack", "Custom Modpack"]);
    });

    await test.step("модпак предвыбран: шаг 1 показывает выбор, Continue активен, есть цена", async () => {
      await expect(funnel.steps.first()).toContainText(/MC \d/);
      await expect(funnel.advanceButton).toBeEnabled();
      expect(await funnel.readAsidePrice()).toBeGreaterThan(0);
    });
  });

  test("@critical TC-HF-102 | modded: полный путь до сводки → HOST NOW → форма регистрации", async () => {
    await funnel.runToSummary({ players: "5-6" });

    await test.step("сводка с выбранным числом игроков", async () => {
      await expect(funnel.pane).toContainText(/All set/i);
      await expect(funnel.pane).toContainText(/5[–-]6 players/);
      await expect(funnel.cta).toHaveText(/HOST NOW/i);
    });

    await funnel.hostNow();

    await test.step("HOST NOW открывает регистрацию внутри компонента", async () => {
      await expect(funnel.authEmail).toBeVisible();
      await expect(funnel.authPassword).toBeVisible();
    });
  });
});
