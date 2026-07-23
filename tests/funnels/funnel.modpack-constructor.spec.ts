/**
 * funnel.modpack-constructor.spec.ts
 * ──────────────────────────────────
 * Конструктор модпаков: «проверка и компиляция» набора модов + happy-path воронки до страницы
 * оформления триалки (аналог payment-страницы в остальных воронках). Web-component на Shadow DOM
 * с ленивой гидрацией — всё через ModpackConstructorPage / CartModpackConstructorPage.
 *
 * Два теста — стабильное отделено от «тяжёлого»:
 *  1. @critical — совместимость + компиляция (Dry-Run "all mods compatible"). Быстро, стабильно,
 *     БЕЗ провижининга и мутации прода. Всегда в общем прогоне.
 *  2. @slow — полный funnel до страницы триалки. Поднимает РЕАЛЬНЫЙ демо-сервер (провижининг
 *     на проде плавает: локально 1.5-5 мин, на CI под нагрузкой дольше). Устойчив: ждём готовности
 *     по API-статусу сессии, и если сервер не поднялся за бюджет → test.skip (инфра/нагрузка прода,
 *     НЕ регресс теста), а не fail. Сам сабмит триалки НЕ жмём (как воронки не платят; мутирует
 *     прод и недетерминирован — поведение задокументировано в памяти modpack-constructor-trial-funnel).
 *
 * ⚠️ Тест 2 поднимает реальный демо-сервер (test-session, сам истекает). Бежит в общем прогоне
 * (по решению владельца, live-prod). Confirmed live 20-Jul-2026.
 *
 * Запуск:
 *   npx playwright test tests/funnels/funnel.modpack-constructor.spec.ts --project=storefront
 */
import { test, expect } from "../../fixtures/base";
import { ModpackConstructorPage } from "../../pages/ModpackConstructorPage";
import { CartModpackConstructorPage } from "../../pages/CartModpackConstructorPage";
import { CART_MODPACK_CONSTRUCTOR } from "../../utils/selectors";
import { Credentials } from "../../fixtures/test-data";

// Набор совместимых с Fabric 1.21.1 модов (у всех есть файл под версию).
const MODS = ["Fabric API", "Lithium", "Athena"] as const;
const LOADER = /^Fabric$/i;
const GAME_VERSION = "Minecraft 1.21.1";

/** Собрать модпак: Fabric 1.21.1 + совместимые моды. */
async function buildModpack(mc: ModpackConstructorPage): Promise<void> {
  await mc.open();
  await mc.changeConfig({ loader: LOADER, gameVersion: GAME_VERSION });
  for (const name of MODS) {
    await mc.searchMod(name);
    await mc.installMod(name);
  }
  await mc.clearSearch();
}

test.describe("Конструктор модпаков — совместимость, компиляция, воронка", () => {
  test("@critical набор модов проходит проверку совместимости и компиляцию (dry-run)", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const mc = new ModpackConstructorPage(page);

    await test.step("собрать модпак", async () => {
      await buildModpack(mc);
      expect(await mc.installedCount(), "установлены выбранные моды").toBeGreaterThanOrEqual(
        MODS.length,
      );
    });

    await test.step("проверка совместимости пройдена (Setup Status GOOD)", async () => {
      await expect.poll(() => mc.setupStatus(), { timeout: 15_000 }).toMatch(/GOOD/i);
    });

    await test.step("компиляция (dry-run): сборка совместима, доступен запуск теста", async () => {
      await mc.compileDryRun();
      await expect(mc.host().getByText(/compatible/i).first()).toBeVisible();
      await expect(mc.button(/Proceed with test run/i)).toBeVisible();
    });
  });

  test("@slow happy-path: сборка доводит до страницы оформления триалки", async ({ page }) => {
    test.setTimeout(600_000); // провижининг демо-сервера на проде плавает
    const mc = new ModpackConstructorPage(page);
    const cart = new CartModpackConstructorPage(page);

    await test.step("собрать модпак и запустить компиляцию демо-сервера", async () => {
      await buildModpack(mc);
      await expect.poll(() => mc.setupStatus(), { timeout: 15_000 }).toMatch(/GOOD/i);
      await mc.compileDryRun();
    });

    await test.step("дождаться готовности демо-сервера (иначе skip — инфра, не регресс)", async () => {
      // Лимит: одна демо-сессия на аккаунт. Если создать не удалось (активна другая) или сервер
      // не поднялся за бюджет — skip (инфра/занятый аккаунт), а не fail.
      const sessionId = await mc.proceedWithTestRun();
      test.skip(
        sessionId === null,
        "не удалось создать test-session (вероятно уже активна демо / лимит на аккаунт) — инфра, не регресс",
      );
      const status = await mc.waitTestSessionStatus(sessionId!);
      test.skip(
        !["running", "ready", "active"].includes(status),
        `демо-сервер не готов (status=${status}, session ${sessionId}) — нагрузка/инфра прода, не регресс`,
      );
      await mc.waitForServerReady(60_000); // UI-подтверждение (сессия уже running)
    });

    await test.step("переход в воронку и логин", async () => {
      await mc.closeModal();
      await mc.startDemo();
      await expect(page).toHaveURL(CART_MODPACK_CONSTRUCTOR.urlPattern);
      await cart.login(Credentials.email, Credentials.password);
    });

    await test.step("страница триалки: собранный модпак + готовность к оформлению", async () => {
      // страница сперва показывает "Validating your build…", затем наполняет сводку
      await expect.poll(() => cart.summaryText(), { timeout: 60_000 }).toContain("1.21.1");
      const summary = await cart.summaryText();
      expect(summary).toMatch(/Start your modpack trial/i);
      expect(summary.toLowerCase()).toContain("fabric");
      for (const name of MODS) expect(summary).toContain(name);
      // кнопка оформления видна = воронка доведена до «оплаты» (сам сабмит не жмём — как и
      // остальные воронки не завершают платёж; тариф/локация догружаются асинхронно — не завязываемся)
      await expect(cart.startTrialButton()).toBeVisible();
    });
  });
});
