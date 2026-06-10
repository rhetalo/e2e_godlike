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

  test("TC-GP-NET-003 | Add Additional Port диалог: поле Name + Add Port (без добавления)", async () => {
    await net.openAddPortDialog();
    await test.step("диалог с полем имени и кнопкой Add Port виден", async () => {
      await expect(net.activeDialog).toBeVisible();
      await expect(net.addPortNameInput).toBeVisible();
      await expect(net.addPortConfirm).toBeVisible();
    });
    await test.step("закрываем без добавления порта", async () => {
      await net.closeDialog();
      await expect(net.activeDialog).toBeHidden();
    });
  });

  test("TC-GP-NET-004 | кнопки Copy subdomain и Copy Port & IP присутствуют", async () => {
    await net.goto(); // вернуться на /network (NET-003 мог оставить состояние диалога)
    await test.step("обе clipboard-кнопки видны (read-only, не жмём)", async () => {
      await expect(net.copySubdomainButton).toBeVisible();
      await expect(net.copyPortIpButton).toBeVisible();
    });
  });
});
