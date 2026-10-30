/**
 * Game panel + биллинг — квиз апгрейда работает только с токеном владельца (DEV-593,
 * billing!762/!764, panel!1729/!1731, new-panel!588).
 *
 * До фикса JSON API квиза в биллинге (аддон upsell_quiz) не проверял, кто спрашивает: зная чужой
 * service_id, можно было пройти квиз за чужого клиента и принять апгрейд (списание с его карты).
 * Теперь панель выдаёт владельцу сервера подписанный токен на 1 час, биллинг без него отвечает 401,
 * а на ресурс другой услуги - 403.
 *
 * Метод (только GET, read-only): токен владельца для test_e2e → список офферов своей услуги 200;
 * без токена 401; тот же токен на услугу DEV-484-db (тот же владелец, другая услуга) 403;
 * токен с подменённой услугой 401; сабюзер (invitee) токен не получает - 403 not_owner.
 *
 * ⚠️ LIVE-PROD: квиз не проходим и офферы не создаём - submission/offer/upgrade (POST) здесь не шлём,
 * их матрица (включая попытку принять чужой оффер) - ручной QA DEV-593. Каждый отказ пишет строку
 * в Module Log биллинга (upsell_quiz / auth) - 3 строки на прогон.
 */
import { test, expect, request as apiRequest, type APIRequestContext } from "@playwright/test";
import {
  loginAndSaveGameSession,
  loginInviteeAndSaveSession,
  GAME_STORAGE_STATE_PATH,
  GAME_INVITEE_STORAGE_STATE_PATH,
  GAME_SERVER_UUID,
  GAME_SERVER_FULL_SLOTS_UUID,
} from "../../../utils/gameAuth";
import { getServerV2, readPanelToken } from "../../../utils/panelApi";
import { QuizTokenResponse, QuizBillingDenial, schemaIssues } from "../../../utils/schemas";
import { BASE_URL, Urls, UPSELL_QUIZ_MC_VANILLA_ID } from "../../../fixtures/test-data";

const QUIZ_API = `${BASE_URL}${Urls.upsellQuizApi}`;

/** service_id из токена `v1.<service_id>.<client_id>.<exp>.<hmac>`. */
const serviceIdOf = (quizToken: string): string => quizToken.split(".")[1];

test.describe.configure({ mode: "serial" });

test.describe("@regression @critical [game-panel] квиз апгрейда: токен владельца в биллинге", () => {
  let api: APIRequestContext;
  let ownerToken: string;
  let inviteeToken: string;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    await loginInviteeAndSaveSession(browser); // invitee - сабюзер на GAME_SERVER_UUID
    ownerToken = readPanelToken(GAME_STORAGE_STATE_PATH);
    inviteeToken = readPanelToken(GAME_INVITEE_STORAGE_STATE_PATH);
    api = await apiRequest.newContext();
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  /** Токен квиза владельца для сервера (с проверкой контракта). */
  async function ownerQuizToken(serverUuid: string): Promise<string> {
    const res = await getServerV2(api, ownerToken, serverUuid, "upgrade-quiz/token");
    expect(res.status(), `токен квиза для ${serverUuid.slice(0, 8)}`).toBe(200);
    const json = await res.json();
    expect(schemaIssues(QuizTokenResponse, json)).toEqual([]);
    return (json as { token: string }).token;
  }

  const listOffers = (serviceId: string, quizToken?: string) =>
    api.get(QUIZ_API, {
      params: { resource: "offer", action: "index", quiz_id: UPSELL_QUIZ_MC_VANILLA_ID, service_id: serviceId },
      headers: quizToken ? { Authorization: `Bearer ${quizToken}` } : {},
    });

  test(
    "TC-GP-QUIZ-TOKEN-001 | владелец: с токеном 200, без токена 401",
    { annotation: { type: "issue", description: "DEV-593" } },
    async () => {
      let quizToken = "";

      await test.step("панель выдаёт владельцу токен на 1 час", async () => {
        quizToken = await ownerQuizToken(GAME_SERVER_UUID);
        const expiresAt = Number(quizToken.split(".")[3]);
        const ttl = expiresAt - Math.floor(Date.now() / 1000);
        expect(ttl, "срок токена, сек").toBeGreaterThan(3000);
        expect(ttl, "срок токена, сек").toBeLessThanOrEqual(3700);
      });

      await test.step("биллинг: офферы своей услуги с токеном - 200", async () => {
        const res = await listOffers(serviceIdOf(quizToken), quizToken);
        expect(res.status()).toBe(200);
      });

      await test.step("биллинг: тот же запрос без токена - 401 token_missing", async () => {
        const res = await listOffers(serviceIdOf(quizToken));
        expect(res.status()).toBe(401);
        const json = await res.json();
        expect(schemaIssues(QuizBillingDenial, json)).toEqual([]);
        expect((json as { code: string }).code).toBe("token_missing");
      });
    },
  );

  test(
    "TC-GP-QUIZ-TOKEN-002 | токен одной услуги не открывает другую, подделка не проходит",
    { annotation: { type: "issue", description: "DEV-593" } },
    async () => {
      const tokenA = await ownerQuizToken(GAME_SERVER_UUID);
      const tokenB = await ownerQuizToken(GAME_SERVER_FULL_SLOTS_UUID);
      const serviceA = serviceIdOf(tokenA);
      const serviceB = serviceIdOf(tokenB);
      test.skip(serviceA === serviceB, "у test_e2e и DEV-484-db одна услуга - сравнивать нечего");

      await test.step("токен услуги A на услугу B - 403 forbidden", async () => {
        const res = await listOffers(serviceB, tokenA);
        expect(res.status()).toBe(403);
        const json = await res.json();
        expect(schemaIssues(QuizBillingDenial, json)).toEqual([]);
        expect((json as { code: string }).code).toBe("forbidden");
      });

      await test.step("в токене A услуга подменена на B, подпись старая - 401 token_invalid", async () => {
        const forged = tokenA.replace(`v1.${serviceA}.`, `v1.${serviceB}.`);
        const res = await listOffers(serviceB, forged);
        expect(res.status()).toBe(401);
        expect(((await res.json()) as { code: string }).code).toBe("token_invalid");
      });
    },
  );

  test(
    "TC-GP-QUIZ-TOKEN-003 | сабюзер не получает токен - 403 not_owner",
    { annotation: { type: "issue", description: "DEV-593" } },
    async () => {
      await test.step("invitee на test_e2e: токен квиза не выдаётся", async () => {
        const res = await getServerV2(api, inviteeToken, GAME_SERVER_UUID, "upgrade-quiz/token");
        expect(res.status()).toBe(403);
        expect(((await res.json()) as { code: string }).code).toBe("not_owner");
      });
    },
  );
});
