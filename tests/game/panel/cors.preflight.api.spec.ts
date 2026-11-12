/**
 * Game panel API — браузер кэширует CORS preflight (DEV-673, panel!1773).
 *
 * ultra.panel и API панели живут на разных origin, поэтому перед запросом с `Authorization`
 * браузер шлёт preflight `OPTIONS`. До фикса панель отвечала `Access-Control-Max-Age: 0`
 * (кэш запрещён): OPTIONS шёл перед каждым запросом, около 48% трафика панели через PHP-FPM.
 * Теперь ответ несёт `Access-Control-Max-Age` (env APP_CORS_MAX_AGE, по умолчанию 7200),
 * и повторные запросы к тому же URL идут без preflight (по nginx: 47.5% → 9.4%).
 *
 * Почему через APIRequestContext, а не через страницу: Playwright не показывает CORS preflight
 * ни в `page.on('request')`, ни в HAR (виден только через CDP). А сам контракт - это заголовки
 * ответа на OPTIONS, их проверяем напрямую.
 *
 * Read-only: OPTIONS без авторизации, сервер не трогаем. Значение max-age не пиним (его меняют
 * через env), проверяем, что оно ровно одно и > 0: при дубле (nginx/Cloudflare) браузер
 * игнорирует оба и кэш снова выключен.
 */
import { request as apiRequest, type APIRequestContext, type APIResponse } from "@playwright/test";
import { test, expect } from "../../../fixtures/diagnostics";
import { GAME_PANEL_URL, GAME_SERVER_UUID } from "../../../utils/gameAuth";
import { PANEL_API_V2_BASE, PANEL_API_CLIENT_BASE } from "../../../utils/panelApi";
import { CORS_FOREIGN_ORIGIN } from "../../../fixtures/test-data";

/** Эндпоинты, которые ultra.panel реально опрашивает (оба префикса из `cors.paths`). */
const PREFLIGHT_TARGETS = [
  { name: "/api/v2/servers/{uuid}", url: `${PANEL_API_V2_BASE}/servers/${GAME_SERVER_UUID}` },
  { name: "/api/client/servers/{id}", url: `${PANEL_API_CLIENT_BASE}/servers/${GAME_SERVER_UUID.slice(0, 8)}` },
];

/** Все значения заголовка (headers() склеивает дубли, headersArray() - нет). */
const headerValues = (res: APIResponse, name: string): string[] =>
  res.headersArray().filter((h) => h.name.toLowerCase() === name).map((h) => h.value);

test.describe("@regression [game-panel] CORS preflight кэшируется браузером", () => {
  let api: APIRequestContext;

  test.beforeAll(async () => {
    api = await apiRequest.newContext();
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  const preflight = (url: string, origin: string) =>
    api.fetch(url, {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization",
      },
    });

  for (const target of PREFLIGHT_TARGETS) {
    test(
      `preflight ${target.name} от ultra.panel отдаёт один Access-Control-Max-Age > 0`,
      { tag: "@critical", annotation: { type: "issue", description: "DEV-673" } },
      async () => {
        const res = await preflight(target.url, GAME_PANEL_URL);

        await test.step("preflight принят: 204 и origin ultra.panel разрешён", async () => {
          expect(res.status()).toBe(204);
          expect(headerValues(res, "access-control-allow-origin")).toEqual([GAME_PANEL_URL]);
        });

        await test.step("Access-Control-Max-Age ровно один и больше нуля", async () => {
          const maxAge = headerValues(res, "access-control-max-age");
          expect(maxAge, "дубль заголовка выключает кэш в браузере").toHaveLength(1);
          expect(Number(maxAge[0]), `max-age = ${maxAge[0]}`).toBeGreaterThan(0);
        });
      },
    );
  }

  test(
    "preflight с чужого origin не получает ни Allow-Origin, ни Max-Age",
    { annotation: { type: "issue", description: "DEV-673" } },
    async () => {
      const res = await preflight(PREFLIGHT_TARGETS[0].url, CORS_FOREIGN_ORIGIN);

      await test.step("CORS-заголовков для чужого origin нет", async () => {
        expect.soft(headerValues(res, "access-control-allow-origin")).toEqual([]);
        expect.soft(headerValues(res, "access-control-max-age")).toEqual([]);
      });
    },
  );
});
