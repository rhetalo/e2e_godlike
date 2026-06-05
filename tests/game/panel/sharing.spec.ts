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
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_UUID,
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
