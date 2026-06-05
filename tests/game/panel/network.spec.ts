/**
 * Game panel — Port & Domains (Phase 4, структурный, read-only).
 *
 * Раздел /network: Subdomain-блок (домен + Update Subdomain) и Network Ports
 * (карточки портов + Add Additional Port). Работает offline. НЕ мутируем
 * (Update Subdomain / Add Port меняют сетевые настройки) — проверяем рендер.
 *
 * Подтверждено recon 05-Jun-2026 (BEM .server__subdomain-block / .server__network-ports).
 */
import { test, expect, type BrowserContext } from "@playwright/test";
import { GamePanelNetworkPage } from "../../../pages/game/GamePanelNetworkPage";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_UUID,
} from "../../../utils/gameAuth";

test.describe.configure({ mode: "serial" });

test.describe("@regression [game-panel] Port & Domains", () => {
  let context: BrowserContext;
  let net: GamePanelNetworkPage;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    net = new GamePanelNetworkPage(await context.newPage(), GAME_SERVER_UUID);
    await net.goto();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("TC-GP-NET-001 | Subdomain-блок виден с кнопкой Update Subdomain", async () => {
    await expect(net.subdomainBlock).toBeVisible();
    await expect(net.updateSubdomainButton).toBeVisible();
  });

  test("TC-GP-NET-002 | Network Ports: ≥1 карточка порта + кнопка Add Additional Port", async () => {
    await test.step("секция портов и хотя бы один порт видны", async () => {
      await expect(net.portsSection).toBeVisible();
      expect(await net.portCards().count()).toBeGreaterThan(0);
    });
    await test.step("кнопка Add Additional Port видна", async () => {
      await expect(net.addPortButton).toBeVisible();
    });
  });
});
