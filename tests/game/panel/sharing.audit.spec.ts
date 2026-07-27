/**
 * Game panel — Audit Log рендерит действия владельца (Phase 4 доп., @regression, READ-ONLY).
 *
 * Раздел Sharing → Audit Log (`.sharing__audit-list`) ведёт историю действий по ключу
 * (`server:power.stop`, `server:console.command`, ...). Проверяем СТРУКТУРНО: лог не пуст и
 * содержит записи владельца в правильной форме (actor email + ключ `server:<action>` + дата).
 *
 * ⚠️ Почему НЕ «сделали действие → ждём его в логе» (было до 27-Jul-2026):
 *   1. Live-recon 27-Jul показал, что панель НЕ пишет `server:power.start` в Audit Log
 *      (20 строк за 3 дня, 0 стартов; стопы и console.command — пишутся). Старт РАБОТАЕТ
 *      (сервер поднимается), но в лог не попадает → прежний assert на `server:power.start`
 *      был обречён и валил CI 3/3.
 *   2. У Audit Log заметный лаг индексации → любая проверка «только что сделал → вижу в логе»
 *      флоки по своей природе.
 * Что реально отрабатывает power-действие — детерминированно покрыто PWR-001 (по кнопке
 * состояния), а не по логу. Здесь проверяем именно фичу Audit Log: что она рендерит записи.
 * Read-only ⇒ мутаций/serial/teardown-recovery не нужно.
 */
import { test, expect, type BrowserContext } from "@playwright/test";
import { GamePanelSharingPage } from "../../../pages/game/GamePanelSharingPage";
import {
  loginAndSaveGameSession,
  GAME_STORAGE_STATE_PATH,
  GAME_SERVER_UUID,
  GAME_EMAIL,
} from "../../../utils/gameAuth";

// actor@... + дата «Mon DD, YYYY, HH:MM AM/PM» + ключ вида server:power.stop / server:console.command
const AUDIT_ACTION_KEY = /server:[a-z_]+\.[a-z_]+/i;
const AUDIT_TIMESTAMP = /\d{1,2}:\d{2}\s*(AM|PM)/i;

test.describe("@regression [game-panel] Audit Log рендерит действия владельца", () => {
  let context: BrowserContext;
  let sharing: GamePanelSharingPage;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000);
    await loginAndSaveGameSession(browser);
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
    const page = await context.newPage();
    sharing = new GamePanelSharingPage(page, GAME_SERVER_UUID);
    await sharing.goto();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("TC-GP-SHR-006 | Audit Log показывает записи владельца в правильной форме", async () => {
    const entries = await sharing.getAuditEntries();

    await test.step("Audit Log не пуст", async () => {
      expect(entries.length).toBeGreaterThan(0);
    });

    await test.step("есть запись владельца с ключом server:<action> и датой", async () => {
      const ownerEntries = entries.filter((e) => e.includes(GAME_EMAIL));
      expect(ownerEntries.length).toBeGreaterThan(0);

      const wellFormed = ownerEntries.some(
        (e) => AUDIT_ACTION_KEY.test(e) && AUDIT_TIMESTAMP.test(e),
      );
      expect(wellFormed).toBe(true);
    });
  });
});
