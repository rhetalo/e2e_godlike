/**
 * Connection-info (Server IP) — адрес подключения на Overview Steam-сервера.
 *
 * KNOWN BUG (live-recon 19-Jun-2026): Ultra-панель рендерит allocation.ip_alias
 * (FQDN ноды, srvN.godlike.club) вместо allocation.ip (реальный IP). Старая панель
 * показывает ip. Источник правды — GET /api/v2/servers/{uuid} (поля allocation.ip /
 * allocation.ip_alias / query_port). Детали: agents.docs/game-panel/KNOWLEDGE_BASE.md.
 *
 * Тест помечен test.fail(): пока баг жив — он «ожидаемо падает», suite остаётся зелёным.
 * Когда разраб починит (host станет = ip), ассерт пройдёт → Playwright пометит тест как
 * unexpected pass (красный) = сигнал снять test.fail() и оставить обычный @regression.
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

test.describe("@regression @known-bug [game-panel] Connection-info — Server IP", () => {
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
    test.fail(); // KNOWN BUG: панель показывает ip_alias вместо ip (см. шапку файла)

    const shownHost = await srv.getConnectionHost();

    await test.step("отображаемый host = allocation.ip", async () => {
      expect(shownHost).toBe(allocIp);
    });
    await test.step("отображаемый host ≠ ip_alias (FQDN ноды клиенту не показываем)", async () => {
      expect(shownHost).not.toBe(allocAlias);
    });
  });
});
