/**
 * gameAuth.ts — авторизация в game-панели (ultra.panel.godlike.host) и
 * персист сессии в storageState.game.json.
 *
 * Паттерн повторяет utils/auth.ts (vf-panel): «сырой» логин без Page Object,
 * чтобы не создавать циклический импорт pages ↔ utils.
 *
 * ⚠️ Серверы НЕ вечные — покупаются/удаляются под разные игры. UUID тестового
 * сервера берётся из env (GAME_PANEL_SERVER_UUID); меняешь сервер — меняешь env.
 */
import { type Browser } from "@playwright/test";
import * as path from "path";

export const GAME_PANEL_URL = "https://ultra.panel.godlike.host";

export const GAME_EMAIL = process.env.GAME_PANEL_EMAIL ?? "test@testmail.com";
export const GAME_PASSWORD = process.env.GAME_PANEL_PASSWORD ?? "test@testmail.com";
export const GAME_STORAGE_STATE_PATH = path.join(__dirname, "..", "storageState.game.json");

/** Текущий тестовый сервер (Minecraft, Paper). Переопределяется через env. */
export const GAME_SERVER_UUID =
  process.env.GAME_PANEL_SERVER_UUID ?? "ebb03adc-48bf-46f1-95dd-a45d07f0d23d";
export const GAME_SERVER_NAME =
  process.env.GAME_PANEL_SERVER_NAME ?? "Fcz3VN5n_439772";

/** Второй аккаунт для тестов шеринга/ролей (Фаза 4). Приглашён на GAME_SERVER_UUID. */
export const GAME_INVITEE_EMAIL =
  process.env.GAME_PANEL_INVITEE_EMAIL ?? "dan.ica.althe.i.aa@gmail.com";
export const GAME_INVITEE_PASSWORD =
  process.env.GAME_PANEL_INVITEE_PASSWORD ?? "dan.ica.althe.i.aa@gmail.com";

/**
 * Логин в game-панель и сохранение сессии в storageState.game.json.
 *
 * Подтверждено live-recon:
 *  - /login показывает чузер «Through Login/Password» → раскрывает форму
 *  - email: input[type="email"] (placeholder "Username or Email")
 *  - password: input[type="password"]
 *  - submit: кнопка "Login"
 *  - после успеха SPA уводит с /login на /?page=1 (Dashboard)
 */
export async function loginAndSaveGameSession(browser: Browser): Promise<void> {
  const page = await browser.newPage();
  try {
    await page.goto(`${GAME_PANEL_URL}/login`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});

    const email = page.locator('input[type="email"]').first();
    if (!(await email.isVisible({ timeout: 3_000 }).catch(() => false))) {
      await page
        .locator('button:has-text("Through Login/Password")')
        .first()
        .click()
        .catch(() => {});
    }
    await email.waitFor({ state: "visible", timeout: 15_000 });
    await email.fill(GAME_EMAIL);
    await page.locator('input[type="password"]').first().fill(GAME_PASSWORD);
    await page
      .locator('button[type="submit"]:has-text("Login"), button:has-text("Login")')
      .first()
      .click();

    await page.waitForURL((u) => !u.toString().includes("/login"), {
      timeout: 30_000,
      waitUntil: "domcontentloaded",
    });

    await page.context().storageState({ path: GAME_STORAGE_STATE_PATH });
    console.log("[INFO] Game panel login OK → storageState.game.json saved");
  } finally {
    await page.close();
  }
}
