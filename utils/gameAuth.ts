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
  process.env.GAME_PANEL_SERVER_NAME ?? "test_e2e";

/**
 * Изоляция мутаций по выделенным серверам (один аккаунт, разные серверы) — чтобы тесты не
 * конфликтовали по состоянию на shared-сервере (напр. rename клоббер имени). По концернам:
 *   power → test_e2e_power · backups → test_e2e_backup · files → test_e2e_file · console → test_e2e_console.
 * Дефолтный GAME_SERVER_UUID (test_e2e) остаётся под read-only + edit/rename. UUID — из env с фолбэком.
 */
export const GAME_SERVER_POWER_UUID =
  process.env.GAME_PANEL_SERVER_POWER_UUID ?? "f9793ddc-d9c9-4e9a-8d8c-911ebc462dc3";
export const GAME_SERVER_POWER_NAME =
  process.env.GAME_PANEL_SERVER_POWER_NAME ?? "test_e2e_power";

export const GAME_SERVER_BACKUP_UUID =
  process.env.GAME_PANEL_SERVER_BACKUP_UUID ?? "00915cdc-37f5-41bb-8cae-74bb5e9f5d24";
export const GAME_SERVER_BACKUP_NAME =
  process.env.GAME_PANEL_SERVER_BACKUP_NAME ?? "test_e2e_backup";

export const GAME_SERVER_FILE_UUID =
  process.env.GAME_PANEL_SERVER_FILE_UUID ?? "ec78834c-2e09-430b-8428-d042cfc9605c";
export const GAME_SERVER_FILE_NAME =
  process.env.GAME_PANEL_SERVER_FILE_NAME ?? "test_e2e_file";

export const GAME_SERVER_CONSOLE_UUID =
  process.env.GAME_PANEL_SERVER_CONSOLE_UUID ?? "55ab39de-c80f-47c6-842c-aafd1a23dd90";
export const GAME_SERVER_CONSOLE_NAME =
  process.env.GAME_PANEL_SERVER_CONSOLE_NAME ?? "test_e2e_console";

// Выделенный сервер ТОЛЬКО под rename-тест (edit.server): даже если откат имени упадёт в CI
// (racy setServerName), пострадает лишь он — основной test_e2e больше не клоббрится.
export const GAME_SERVER_RENAME_UUID =
  process.env.GAME_PANEL_SERVER_RENAME_UUID ?? "e9440b5d-d77e-4dc6-b258-705e067ee5d2";
export const GAME_SERVER_RENAME_NAME =
  process.env.GAME_PANEL_SERVER_RENAME_NAME ?? "test_e2e_rename";

/**
 * Steam-сервер (ARK) для проверки connection-info: query_port + ip/ip_alias.
 * Short-UUID (как в /api/v2/servers/{short}). Под тем же аккаунтом, что GAME_EMAIL.
 */
export const GAME_STEAM_SERVER_UUID =
  process.env.GAME_PANEL_STEAM_SERVER_UUID ?? "cc25cea1";

/** Второй аккаунт для тестов шеринга/ролей (Фаза 4). Приглашён на GAME_SERVER_UUID. */
export const GAME_INVITEE_EMAIL =
  process.env.GAME_PANEL_INVITEE_EMAIL ?? "dan.ica.althe.i.aa@gmail.com";
export const GAME_INVITEE_PASSWORD =
  process.env.GAME_PANEL_INVITEE_PASSWORD ?? "dan.ica.althe.i.aa@gmail.com";
export const GAME_INVITEE_STORAGE_STATE_PATH = path.join(__dirname, "..", "storageState.game.invitee.json");

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
async function loginGameUser(
  browser: Browser,
  email: string,
  password: string,
  statePath: string,
): Promise<void> {
  const page = await browser.newPage();
  try {
    await page.goto(`${GAME_PANEL_URL}/login`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});

    const emailInput = page.locator('input[type="email"]').first();
    if (!(await emailInput.isVisible({ timeout: 3_000 }).catch(() => false))) {
      await page
        .locator('button:has-text("Through Login/Password")')
        .first()
        .click()
        .catch(() => {});
    }
    await emailInput.waitFor({ state: "visible", timeout: 15_000 });
    await emailInput.fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page
      .locator('button[type="submit"]:has-text("Login"), button:has-text("Login")')
      .first()
      .click();

    await page.waitForURL((u) => !u.toString().includes("/login"), {
      timeout: 60_000, // сквозной логин 1×/прогон → можно щедро; 30с в CI был тесен (флоки backups/«1-я попытка»)
      waitUntil: "domcontentloaded",
    });

    await page.context().storageState({ path: statePath });
    console.log(`[INFO] Game panel login OK (${email}) → ${statePath}`);
  } finally {
    await page.close();
  }
}

// Сквозной логин: реальный UI-логин выполняется ОДИН раз за прогон (workers:1 = один процесс),
// остальные вызовы — no-op (берём готовый storageState). Убирает контеншн ~27 логинов в один
// аккаунт за прогон и флоки «waitForURL после Login». Сбрасывается resetGameSession() (logout-тест).
let gameSessionReady = false;
let gameInviteeSessionReady = false;

/** Логин основного аккаунта → storageState.game.json (реально логинится один раз за прогон). */
export async function loginAndSaveGameSession(browser: Browser): Promise<void> {
  if (gameSessionReady) return;
  await loginGameUser(browser, GAME_EMAIL, GAME_PASSWORD, GAME_STORAGE_STATE_PATH);
  gameSessionReady = true;
}

/** Логин 2-го аккаунта (invitee — шеринг/роли) → storageState.game.invitee.json (один раз за прогон). */
export async function loginInviteeAndSaveSession(browser: Browser): Promise<void> {
  if (gameInviteeSessionReady) return;
  await loginGameUser(browser, GAME_INVITEE_EMAIL, GAME_INVITEE_PASSWORD, GAME_INVITEE_STORAGE_STATE_PATH);
  gameInviteeSessionReady = true;
}

/**
 * Сбросить кэш сквозного логина основного аккаунта — следующий loginAndSaveGameSession снова
 * сделает реальный UI-логин. Нужен после logout-теста (он убивает сессию аккаунта).
 */
export function resetGameSession(): void {
  gameSessionReady = false;
}
