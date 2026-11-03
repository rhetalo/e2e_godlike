/**
 * Game panel — бэкап ищется только в рамках сервера из роута (DEV-580, panel!1723).
 *
 * До фикса v2 искал бэкап по uuid во всей таблице: с роута своего сервера A по uuid бэкапа
 * сервера B можно было скачать, развернуть, удалить или переименовать чужой бэкап.
 * Теперь чужой uuid отвечает так же, как несуществующий: 400 «No query results for model [...]».
 *
 * Метод (только GET, read-only): берём живой бэкап одного сервера и запрашиваем ссылку на
 * скачивание (a) через его собственный роут → 200 signed_url; (b) через роут другого сервера
 * того же владельца → 400, тело байт в байт как у выдуманного uuid, ссылки нет.
 * Два направления: бэкап базы (DEV-484-db) и бэкап сервера (test_e2e).
 *
 * ⚠️ LIVE-PROD: download только выдаёт подписанную ссылку, сам файл не качаем. PUT/restore/delete
 * здесь не шлём: при регрессе они бы мутировали чужой бэкап. Их матрица - ручной QA DEV-580.
 *
 * TC-GP-BKP-SCOPE-003 (DEV-638, panel!1757): старая панель подписывала ссылку на бэкап новой
 * панели на владельца сервера, а не на того, кто качает. Invitee (участник test_e2e, не владелец)
 * берёт ссылку через v1 → в JWT из `?token=` его `user_id`, не владельца. Тоже только GET.
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
import { getClientV1, getServerV2, readPanelToken } from "../../../utils/panelApi";

// Валидный uuid4, которого нет ни в одной таблице бэкапов - эталон ответа «не найдено».
const FAKE_BACKUP_UUID = "5a0c0de0-dead-4bee-8f00-000000000580";
// type из GET /backups → сегмент роута v2
const ROUTE_BY_TYPE: Record<string, string> = { database: "databases", folder: "folders", instance: "instances" };

type BackupRow = { uuid: string; type: string; status: string };

const DIRECTIONS = [
  { label: "бэкап базы (DEV-484-db) через роут test_e2e", owner: GAME_SERVER_FULL_SLOTS_UUID, other: GAME_SERVER_UUID, type: "database" },
  { label: "бэкап сервера (test_e2e) через роут DEV-484-db", owner: GAME_SERVER_UUID, other: GAME_SERVER_FULL_SLOTS_UUID, type: "instance" },
];

test.describe("@regression @critical [game-panel] v2 backups: поиск по uuid в рамках сервера", () => {
  let api: APIRequestContext;
  let token: string;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser); // свежий storageState.game.json (+ access_token)
    token = readPanelToken(GAME_STORAGE_STATE_PATH);
    api = await apiRequest.newContext();
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  for (const [i, d] of DIRECTIONS.entries()) {
    test(
      `TC-GP-BKP-SCOPE-00${i + 1} | ${d.label}: чужой uuid = несуществующий`,
      { annotation: { type: "issue", description: "DEV-580" } },
      async () => {
        const list = (await (await getServerV2(api, token, d.owner, "backups")).json()) as { data: BackupRow[] };
        const backup = list.data.find((b) => b.type === d.type && b.status === "COMPLETED");
        test.skip(!backup, `на сервере ${d.owner.slice(0, 8)} нет COMPLETED-бэкапа типа ${d.type}`);
        const route = ROUTE_BY_TYPE[d.type];

        await test.step("свой роут: ссылка на скачивание выдаётся (контроль)", async () => {
          const res = await getServerV2(api, token, d.owner, `backups/${route}/${backup!.uuid}/download`);
          expect(res.status()).toBe(200);
          expect(((await res.json()) as { object?: string }).object).toBe("signed_url");
        });

        await test.step("роут другого сервера: 400, тело как у выдуманного uuid, ссылки нет", async () => {
          const foreign = await getServerV2(api, token, d.other, `backups/${route}/${backup!.uuid}/download`);
          const fake = await getServerV2(api, token, d.other, `backups/${route}/${FAKE_BACKUP_UUID}/download`);
          const foreignBody = await foreign.text();
          expect(fake.status(), "эталон «не найдено» в v2").toBe(400);
          expect(foreign.status()).toBe(400);
          expect(foreignBody).toBe(await fake.text());
          expect(foreignBody).toMatch(/No query results for model/);
          expect(foreignBody).not.toContain("signed_url");
        });
      },
    );
  }
});

/** Claims JWT ссылки на скачивание (подпись не проверяем: ключа ноды у теста нет). */
function downloadTokenClaims(url: string): { user_id?: number; user_uuid?: string; backup_uuid?: string } {
  const token = new URL(url).searchParams.get("token") ?? "";
  return JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"));
}

test.describe("@regression @critical [game-panel] v1 backups: ссылка подписана на того, кто качает", () => {
  let api: APIRequestContext;
  let ownerToken: string;
  let inviteeToken: string;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    await loginInviteeAndSaveSession(browser); // invitee - участник test_e2e, не владелец
    ownerToken = readPanelToken(GAME_STORAGE_STATE_PATH);
    inviteeToken = readPanelToken(GAME_INVITEE_STORAGE_STATE_PATH);
    api = await apiRequest.newContext();
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test(
    "TC-GP-BKP-SCOPE-003 | бэкап новой панели через v1: JWT на участника, а не на владельца",
    { annotation: { type: "issue", description: "DEV-638" } },
    async () => {
      const list = (await (await getServerV2(api, ownerToken, GAME_SERVER_UUID, "backups")).json()) as { data: BackupRow[] };
      const backup = list.data.find((b) => b.type === "instance" && b.status === "COMPLETED");
      test.skip(!backup, `на сервере ${GAME_SERVER_UUID.slice(0, 8)} нет COMPLETED-бэкапа типа instance`);

      const accountId = async (token: string) =>
        ((await (await getClientV1(api, token, "account")).json()) as { attributes: { id: number } }).attributes.id;
      const ownerId = await accountId(ownerToken);
      const inviteeId = await accountId(inviteeToken);

      await test.step("invitee и владелец - разные пользователи (контроль)", async () => {
        expect(inviteeId).toBeGreaterThan(0);
        expect(inviteeId).not.toBe(ownerId);
      });

      await test.step("v1 download от invitee: в JWT его user_id и uuid бэкапа", async () => {
        const res = await getClientV1(api, inviteeToken, `servers/${GAME_SERVER_UUID}/backups/${backup!.uuid}/download`);
        expect(res.status()).toBe(200);
        const url = ((await res.json()) as { attributes?: { url?: string } }).attributes?.url ?? "";
        expect(url).toMatch(/[?&]token=/);
        const claims = downloadTokenClaims(url);
        expect(claims.backup_uuid).toBe(backup!.uuid);
        expect(claims.user_id, "до DEV-638 здесь был id владельца").toBe(inviteeId);
      });
    },
  );
});
