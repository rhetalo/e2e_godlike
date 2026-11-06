/**
 * Старый конфигуратор главной `#server-configurator` (вариант A A/B `hostingFunnelVariant`).
 * Вариант B (новый пошаговый `#hosting-funnel`) - hosting-funnel.spec.ts.
 *
 * Вариант A пиннится и так (fixtures/base → pinAmplitudeExperiments), здесь - явно, чтобы спек
 * не зависел от env HOSTING_FUNNEL_VARIANT. Read-only: Host now только открывает /cart-main/,
 * заказ не оформляем. Тарифы и цены маркетинговые - ассерты структурные (смена тарифа, скидка,
 * параметры корзины), без хардкода сумм и имён тарифов.
 */
import { test, expect } from "../../fixtures/base";
import { ServerConfiguratorPage } from "../../pages/ServerConfiguratorPage";
import { QuickPickModpacks, Urls } from "../../fixtures/test-data";
import { pinHostingFunnelVariant } from "../../utils/amplitude";

test.describe("Конфигуратор главной (вариант A) — #server-configurator", () => {
  let cfg: ServerConfiguratorPage;

  test.beforeEach(async ({ page, context }) => {
    await pinHostingFunnelVariant(context, "A");
    cfg = new ServerConfiguratorPage(page);
    await cfg.open(Urls.home);
  });

  test("@smoke TC-SC-001 | структура: игры, Minecraft по умолчанию, модпаки, слайдер, рекомендованный тариф, Host now", async () => {
    await test.step("сетка игр (20+), выбрана Minecraft", async () => {
      expect(await cfg.gameCards.count()).toBeGreaterThanOrEqual(20);
      await expect(cfg.selectedGame).toHaveAttribute("aria-label", "Minecraft");
    });

    await test.step("модпак не выбран, quick-pick модпаки видны", async () => {
      await expect(cfg.modpackSelect).toContainText(/No modpack/i);
      for (const name of QuickPickModpacks) {
        await expect(cfg.quickPick(name), `quick-pick "${name}"`).toBeVisible();
      }
    });

    await test.step("слайдер игроков и карточка тарифа с ценой, Host now", async () => {
      await expect(cfg.playersSlider).toBeVisible();
      expect((await cfg.readSlider()).max).toBeGreaterThan(0);
      await expect(cfg.recommendedHeading).toBeVisible();
      await expect(cfg.planCard).toContainText(/GB Ram/i);
      await expect(cfg.hostNowButton).toBeEnabled();
    });
  });

  test("@regression TC-SC-002 | слайдер игроков: максимум → тариф крупнее, минимум → обратно", async () => {
    const startPlan = await cfg.planName.innerText();

    await cfg.pressSlider("End");

    await test.step("End: слайдер на максимуме, тариф сменился", async () => {
      const s = await cfg.readSlider();
      expect(s.value).toBe(s.max);
      await expect(cfg.planName).not.toHaveText(startPlan);
    });

    await cfg.pressSlider("Home");

    await test.step("Home: слайдер на минимуме, тариф вернулся к стартовому", async () => {
      expect((await cfg.readSlider()).value).toBe(0);
      await expect(cfg.planName).toHaveText(startPlan);
    });
  });

  test("@regression TC-SC-003 | цена со скидкой: новая цена меньше зачёркнутой", async () => {
    const { now, was } = await cfg.readPrices();
    expect(now).toBeGreaterThan(0);
    expect(now).toBeLessThan(was);
  });

  test("@critical TC-SC-004 | quick-pick модпака → Host now → /cart-main/ с productId + modpackId", async () => {
    const vanillaPlan = await cfg.planName.innerText();

    await cfg.pickModpack(QuickPickModpacks[0]);

    await test.step("селект модпака показывает выбор, тариф пересчитан под модпак", async () => {
      await expect(cfg.modpackSelect).not.toContainText(/No modpack/i);
      await expect(cfg.planName).not.toHaveText(vanillaPlan);
    });

    const cart = await cfg.hostNow();

    await test.step("корзина получила тариф, модпак CurseForge и цикл оплаты", async () => {
      expect(cart.productId).toMatch(/^\d+$/);
      expect(cart.modpackId).toMatch(/^curseforge:\d+:\d+$/);
      expect(cart.billingCycle).toBe("monthly");
    });
  });

  test("@regression TC-SC-005 | другая игра: модпаков нет, тариф и корзина без modpackId", async () => {
    const minecraftPlan = await cfg.planName.innerText();

    await cfg.selectGame("Terraria");

    await test.step("Terraria выбрана, поля модпака скрыты, тариф пересчитан", async () => {
      await expect(cfg.selectedGame).toHaveAttribute("aria-label", "Terraria");
      await expect(cfg.modpackSelect).toBeHidden();
      await expect(cfg.planName).not.toHaveText(minecraftPlan);
    });

    const cart = await cfg.hostNow();

    await test.step("корзина: productId есть, modpackId нет", async () => {
      expect(cart.productId).toMatch(/^\d+$/);
      expect(cart.modpackId).toBeNull();
      expect(cart.billingCycle).toBe("monthly");
    });
  });
});
