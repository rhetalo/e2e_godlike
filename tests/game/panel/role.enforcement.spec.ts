/**
 * Game panel — Role enforcement (Phase 4, multi-actor, мутация роли, self-cleaning).
 *
 * User story: владелец понижает участника до Member — и тот теряет привилегированные
 * действия (Restart/Kill/консоль; управление бэкапами), которые есть у Co-owner. Это
 * проверка авторизации: привилегированные контролы ПРИСУТСТВУЮТ у Co-owner и ОТСУТСТВУЮТ
 * у Member (Vue SPA убирает их из DOM по роли).
 *
 * Два актёра: owner меняет роль (storageState.game.json), invitee наблюдает доступ
 * (storageState.game.invitee.json). ⚠️ Мутация роли на проде — роль invitee ВСЕГДА
 * возвращается в Co-owner (в каждом тесте и в afterAll). Сервер Online не нужен.
 *
 * Матрица прав (recon 06-Jun) — KNOWLEDGE_BASE.md §5i. Опции ролей: Co-owner/Moderator/Member.
 */
import { test, expect, type BrowserContext } from "@playwright/test";
import { GamePanelSharingPage } from "../../../pages/game/GamePanelSharingPage";
import { GamePanelServerPage } from "../../../pages/game/GamePanelServerPage";
import { GamePanelBackupsPage } from "../../../pages/game/GamePanelBackupsPage";
import {
  loginAndSaveGameSession,
  loginInviteeAndSaveSession,
  GAME_STORAGE_STATE_PATH,
  GAME_INVITEE_STORAGE_STATE_PATH,
  GAME_SERVER_UUID,
  GAME_SERVER_NAME,
} from "../../../utils/gameAuth";

test.describe.configure({ mode: "serial" });

test.describe("[game-panel] Role enforcement — Member vs Co-owner", () => {
  let ownerCtx: BrowserContext;
  let inviteeCtx: BrowserContext;
  let ownerSharing: GamePanelSharingPage;
  let srv: GamePanelServerPage;
  let backups: GamePanelBackupsPage;

  /** Owner-side: выставить роль участнику с подтверждением персиста (in-place текст лагает → reload). */
  async function setInviteeRole(role: string): Promise<void> {
    await ownerSharing.goto();
    if ((await ownerSharing.getMemberRole()) === role) return;
    await ownerSharing.setMemberRole(role);
    await ownerSharing.goto();
    await expect
      .poll(() => ownerSharing.getMemberRole(), { timeout: 15_000, intervals: [1_000, 2_000, 3_000] })
      .toBe(role);
  }

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000);
    await loginAndSaveGameSession(browser);
    await loginInviteeAndSaveSession(browser);
    ownerCtx = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    inviteeCtx = await browser.newContext({ storageState: GAME_INVITEE_STORAGE_STATE_PATH });
    ownerSharing = new GamePanelSharingPage(await ownerCtx.newPage(), GAME_SERVER_UUID);
    const inviteePage = await inviteeCtx.newPage();
    srv = new GamePanelServerPage(inviteePage, GAME_SERVER_UUID);
    backups = new GamePanelBackupsPage(inviteePage, GAME_SERVER_UUID, GAME_SERVER_NAME);
  });

  test.afterAll(async () => {
    try {
      await ownerSharing.goto();
      if ((await ownerSharing.getMemberRole()) !== "Co-owner") {
        await ownerSharing.setMemberRole("Co-owner");
        await ownerSharing.goto();
      }
    } catch {
      /* best-effort restore */
    }
    await ownerCtx.close();
    await inviteeCtx.close();
  });

  test("@critical TC-GP-ROLE-001 | Member лишён Restart/Kill/консоли, у Co-owner они есть", async () => {
    test.setTimeout(150_000);

    await test.step("baseline: invitee-Co-owner видит Restart, Kill и поле консоли", async () => {
      await setInviteeRole("Co-owner");
      await srv.goto();
      await expect(srv.restartButton).toBeVisible();
      await expect(srv.killButton).toBeVisible();
      await expect(srv.consoleCommandInput).toBeVisible();
    });

    await test.step("owner понижает до Member → invitee теряет Restart/Kill/поле консоли", async () => {
      await setInviteeRole("Member");
      await srv.goto();
      await expect(srv.restartButton).toBeHidden({ timeout: 10_000 });
      await expect(srv.killButton).toBeHidden();
      await expect(srv.consoleCommandInput).toBeHidden();
    });

    await test.step("откат в Co-owner → контролы снова доступны", async () => {
      await setInviteeRole("Co-owner");
      await srv.goto();
      await expect(srv.restartButton).toBeVisible({ timeout: 10_000 });
    });
  });

  test("@critical TC-GP-ROLE-002 | Member не управляет бэкапами (меню «...» скрыто), Co-owner — да", async () => {
    test.setTimeout(150_000);

    await test.step("baseline: invitee-Co-owner видит меню управления бэкапом «...»", async () => {
      await setInviteeRole("Co-owner");
      await backups.goto();
      expect(await backups.rows().count()).toBeGreaterThan(0); // в списке есть бэкап (фикстура)
      await expect(backups.anyManageMenuButton).toBeVisible();
    });

    await test.step("owner понижает до Member → управление бэкапами недоступно (меню «...» скрыто)", async () => {
      await setInviteeRole("Member");
      await backups.goto();
      // Member вообще не получает доступа к управлению: меню «...» отсутствует
      // (recon: Member не видит и сами строки бэкапов — список пуст).
      await expect(backups.anyManageMenuButton).toBeHidden({ timeout: 10_000 });
    });

    await test.step("откат в Co-owner → меню снова доступно", async () => {
      await setInviteeRole("Co-owner");
      await backups.goto();
      await expect(backups.anyManageMenuButton).toBeVisible({ timeout: 10_000 });
    });
  });

  test("@critical TC-GP-ROLE-003 | Moderator — посередине: без Restart/Kill, но с консолью и управлением бэкапами", async () => {
    test.setTimeout(150_000);

    await test.step("owner ставит роль Moderator", async () => {
      await setInviteeRole("Moderator");
    });

    await test.step("сервер: Restart/Kill скрыты (как Member), но поле консоли есть (как Co-owner)", async () => {
      await srv.goto();
      await expect(srv.restartButton).toBeHidden({ timeout: 10_000 });
      await expect(srv.killButton).toBeHidden();
      await expect(srv.consoleCommandInput).toBeVisible();
    });

    await test.step("бэкапы: управление доступно (меню «...» видно) — в отличие от Member", async () => {
      await backups.goto();
      await expect(backups.anyManageMenuButton).toBeVisible({ timeout: 10_000 });
    });

    await test.step("откат в Co-owner", async () => {
      await setInviteeRole("Co-owner");
    });
  });
});
