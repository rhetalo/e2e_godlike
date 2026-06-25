/**
 * Connection-info (Server IP) — адрес подключения на Overview Steam-сервера.
 *
 * Проверяет: панель показывает РЕАЛЬНЫЙ allocation.ip (а не allocation.ip_alias — FQDN ноды).
 * Источник правды — GET /api/v2/servers/{uuid} (поля allocation.ip / allocation.ip_alias).
 *
 * История: до ~25-Jun-2026 панель рендерила ip_alias (FQDN ноды) вместо ip — баг был под
 * test.fail() (@known-bug, «ожидаемо падал»). Прод-фикс выкатили (host стал = ip, напр.
 * 185.156.53.133:26079) → test.fail() снят, тест стал обычным @regression. Детали: KNOWLEDGE_BASE.md §9f.
 *
 * Read-only: только заход на Overview + перехват ответа панели, ничего не мутируем.
 */
import { test, expect, type BrowserContext } from "@playwright/test";
import { GamePanelServerPage } from "../../../pages/game/GamePanelServerPage";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_STEAM_SERVER_UUID,
} from "../../../utils/gameAuth";

test.describe.configure({ mode: "serial" });

test.describe("@regression [game-panel] Connection-info — Server IP", () => {
  let context: BrowserContext;
  let srv: GamePanelServerPage;
  let allocIp: string | undefined;
  let allocAlias: string | undefined;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    const page = await context.newPage();
    srv = new GamePanelServerPage(page, GAME_STEAM_SERVER_UUID);

    // Перехватываем server-info запрос самой панели (его аутентифицирует SPA) —
    // это источник правды по allocation.ip / allocation.ip_alias.
    const infoResp = page.waitForResponse(
      (r) => r.url().includes(`/api/v2/servers/${GAME_STEAM_SERVER_UUID}?`),
      { timeout: 30_000 },
    );
    await srv.goto();
    const json = await (await infoResp).json();
    const alloc = json?.data?.allocation ?? {};
    allocIp = alloc.ip;
    allocAlias = alloc.ip_alias;
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("TC-GP-NET-010 | Server IP = реальный IP аллокации, а не FQDN ноды (ip_alias)", async () => {
    test.skip(
      !allocIp || !allocAlias || allocIp === allocAlias,
      "У сервера нет различимого ip_alias — проверять нечего",
    );
    const shownHost = await srv.getConnectionHost();

    await test.step("отображаемый host = allocation.ip", async () => {
      expect(shownHost).toBe(allocIp);
    });
    await test.step("отображаемый host ≠ ip_alias (FQDN ноды клиенту не показываем)", async () => {
      expect(shownHost).not.toBe(allocAlias);
    });
  });
});
