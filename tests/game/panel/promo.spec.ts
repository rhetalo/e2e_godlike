/**
 * Game panel — Промо: Boost/Upgrade + Free Premium, структурный, read-only.
 *
 * UPG-001: "Boost my server" (overview) → /upgrade с карточками планов и ценами.
 * PREM-001: окно Free Premium - сравнение текущего плана и Premium (списки фич) + CTA.
 *
 * ⚠️ ОБА — монетизация: план НЕ выбираем, checkout НЕ проходим, CTA "Get Premium" НЕ жмём.
 * Подтверждено MCP-recon 06-Jun-2026.
 */
import type { BrowserContext } from "@playwright/test";
import { test, expect } from "../../../fixtures/diagnostics";
import { GamePanelUpgradePage } from "../../../pages/game/GamePanelUpgradePage";
import { FreePremiumDialog } from "../../../components/game/FreePremiumDialog";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_UUID,
} from "../../../utils/gameAuth";

test.describe.configure({ mode: "serial" });

test.describe("@regression [game-panel] Промо: Boost/Upgrade + Free Premium", () => {
  let context: BrowserContext;
  let upgrade: GamePanelUpgradePage;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    upgrade = new GamePanelUpgradePage(await context.newPage(), GAME_SERVER_UUID);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("TC-GP-UPG-001 | Boost ведёт на Upgrade: карточки планов и цены (без checkout)", async () => {
    await upgrade.gotoViaBoost();

    await test.step("страница апгрейда и карточка текущего плана видны", async () => {
      await expect(upgrade.root).toBeVisible();
      await expect(upgrade.currentPlanCard).toBeVisible();
    });

    await test.step("есть карточки планов на выбор и отрендерены цены", async () => {
      expect(await upgrade.planCards().count()).toBeGreaterThan(0);
      await expect(upgrade.root).toContainText(upgrade.priceText);
    });
  });

  test(
    "TC-GP-PREM-001 | Free Premium: окно сравнивает текущий план и Premium, CTA есть (без покупки)",
    { tag: "@regression" },
    async () => {
      const premium = new FreePremiumDialog(upgrade.page);
      await premium.open();

      await test.step("окно открыто, CTA Get Premium на месте (не жмём)", async () => {
        await expect(premium.dialog).toBeVisible();
        await expect(premium.cta).toBeVisible();
      });

      await test.step("блок текущего плана: заголовок и непустой список фич", async () => {
        await expect(premium.currentPlanTitle).toHaveText(/\S/);
        await expect(premium.currentPlanItems().first()).toBeVisible();
        expect(await premium.itemTexts(premium.currentPlanItems())).not.toContain("");
      });

      await test.step("блок Premium: заголовок и список фич не короче текущего плана", async () => {
        await expect(premium.premiumPlanTitle).toHaveText(/\S/);
        await expect(premium.premiumPlanItems().first()).toBeVisible();
        const current = await premium.currentPlanItems().count();
        expect(await premium.premiumPlanItems().count()).toBeGreaterThanOrEqual(current);
        expect(await premium.itemTexts(premium.premiumPlanItems())).not.toContain("");
      });

      await premium.close();
    },
  );
});
