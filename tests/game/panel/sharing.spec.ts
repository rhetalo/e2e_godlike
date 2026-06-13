/**
 * Game panel — Sharing section (Phase 4, owner-side, БЕЗ мутаций).
 *
 * Проверяем структуру шеринга и что уже приглашённый аккаунт имеет доступ. НЕ
 * отправляем инвайты (Send Invite шлёт реальный email). Сервер Online не нужен.
 *
 * Мульти-актёрная проверка (invitee логинится и видит расшаренный сервер) — отдельно,
 * когда подтверждён пароль 2-го аккаунта (GAME_PANEL_INVITEE_PASSWORD).
 *
 * Подтверждено recon 05-Jun-2026: invitee (GAME_INVITEE_EMAIL) числится Co-owner в Members.
 */
import { test, expect, type BrowserContext } from "@playwright/test";
import { GamePanelSharingPage } from "../../../pages/game/GamePanelSharingPage";
import { GamePanelDashboardPage } from "../../../pages/game/GamePanelDashboardPage";
import { GamePanelServerPage } from "../../../pages/game/GamePanelServerPage";
import {
  loginAndSaveGameSession,
  loginInviteeAndSaveSession,
  GAME_STORAGE_STATE_PATH,
  GAME_INVITEE_STORAGE_STATE_PATH,
  GAME_SERVER_UUID,
  GAME_SERVER_NAME,
  GAME_EMAIL,
  GAME_INVITEE_EMAIL,
} from "../../../utils/gameAuth";

test.describe.configure({ mode: "serial" });

test.describe("[game-panel] Sharing — доступ к серверу", () => {
  let context: BrowserContext;
  let sharing: GamePanelSharingPage;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    sharing = new GamePanelSharingPage(await context.newPage(), GAME_SERVER_UUID);
    await sharing.goto();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("@regression TC-GP-SHR-001 | Sharing рендерит форму инвайта и участников", async () => {
    await test.step("форма инвайта: кнопка Send Invite + поле email видимы", async () => {
      await expect(sharing.sendInviteButton).toBeVisible();
      await expect(sharing.inviteEmail).toBeVisible();
    });

    await test.step("владелец числится среди участников Sharing", async () => {
      expect(await sharing.hasUser(GAME_EMAIL)).toBe(true);
    });
  });

  test("@critical TC-GP-SHR-002 | приглашённый аккаунт имеет доступ (виден в Sharing)", async () => {
    // шеринг реально предоставил доступ: 2-й аккаунт числится участником (Co-owner)
    expect(await sharing.hasUser(GAME_INVITEE_EMAIL)).toBe(true);
  });
});

// Мульти-актёр: вход 2-м аккаунтом (invitee) — отдельная сессия (storageState.game.invitee.json).
// Read-only: проверяем, что шеринг даёт invitee реальный доступ. login==password==email (подтв. владельцем).
test.describe("@critical [game-panel] Sharing — invitee видит расшаренный сервер", () => {
  let context: BrowserContext;
  let dash: GamePanelDashboardPage;

  test.beforeAll(async ({ browser }) => {
    await loginInviteeAndSaveSession(browser);
    context = await browser.newContext({ storageState: GAME_INVITEE_STORAGE_STATE_PATH });
    dash = new GamePanelDashboardPage(await context.newPage());
    await dash.goto();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("TC-GP-SHR-003 | invitee видит расшаренный сервер в своём дашборде", async () => {
    expect(await dash.hasServer(GAME_SERVER_NAME)).toBe(true);
  });

  test("TC-GP-SHR-004 | invitee открывает страницу расшаренного сервера (доступ есть)", async () => {
    const srv = new GamePanelServerPage(dash.page, GAME_SERVER_UUID);
    await srv.goto();

    await test.step("URL — страница сервера", async () => {
      expect(srv.page.url()).toContain(GAME_SERVER_UUID);
    });

    await test.step("имя сервера видно (доступ предоставлен)", async () => {
      await expect(dash.page.getByText(GAME_SERVER_NAME).first()).toBeVisible();
    });
  });
});

// Мутация: владелец меняет роль участника. Автосейв; in-place текст лагает → проверяем через reload.
// self-cleaning: роль invitee всегда возвращается в Co-owner (в тесте и в afterAll).
test.describe("@critical [game-panel] Sharing — смена роли участника", () => {
  let context: BrowserContext;
  let sharing: GamePanelSharingPage;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    sharing = new GamePanelSharingPage(await context.newPage(), GAME_SERVER_UUID);
    await sharing.goto();
  });

  test.afterAll(async () => {
    try {
      await sharing.goto();
      if ((await sharing.getMemberRole()) !== "Co-owner") {
        await sharing.setMemberRole("Co-owner");
      }
    } catch {
      /* best-effort restore */
    }
    await context.close();
  });

  test("TC-GP-SHR-005 | смена роли участника: Co-owner → Moderator → откат", async () => {
    test.setTimeout(120_000);

    await test.step("исходная роль — Co-owner", async () => {
      await expect.poll(() => sharing.getMemberRole(), { timeout: 10_000 }).toBe("Co-owner");
    });

    await test.step("сменить на Moderator → reload → персист подтверждён", async () => {
      await sharing.setMemberRole("Moderator");
      await sharing.goto();
      await expect.poll(() => sharing.getMemberRole(), { timeout: 10_000 }).toBe("Moderator");
    });

    await test.step("вернуть Co-owner → reload → откат подтверждён", async () => {
      await sharing.setMemberRole("Co-owner");
      await sharing.goto();
      await expect.poll(() => sharing.getMemberRole(), { timeout: 10_000 }).toBe("Co-owner");
    });
  });
});
