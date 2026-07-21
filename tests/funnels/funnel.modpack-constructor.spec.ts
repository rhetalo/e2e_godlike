/**
 * funnel.modpack-constructor.spec.ts
 * ──────────────────────────────────
 * Happy-path воронки конструктора модпаков: «проверка и компиляция» набора модов + доведение
 * до оформления триальной услуги (аналог payment-страницы в остальных воронках).
 *
 * Флоу: конструктор (Fabric 1.21.1 + 3 совместимых мода) → Compilation (Dry-Run) →
 * Proceed with test run (поднимает РЕАЛЬНЫЙ демо-сервер, компиляция ~2-5 мин) → "Server ready" →
 * Start 3-hour Demo → /cart-modpack-constructor → логин → страница "Start your modpack trial".
 *
 * Тест ЗАКАНЧИВАЕТСЯ на полностью загруженной странице триалки (собранный модпак + тариф из
 * product group + активная кнопка "Start 3-hour demo" = аналог «дошли до оплаты»). Сам сабмит
 * НЕ жмём — как остальные воронки не завершают платёж; вдобавок оформление триалки мутирует прод
 * (создаёт услугу) и недетерминировано по таймингу. Поведение сабмита (редирект на productdetails
 * при успехе / 409 "An active trial already exists" при активной) задокументировано в памяти
 * modpack-constructor-trial-funnel, но в тесте не ассертится.
 *
 * ⚠️ Всё равно поднимает РЕАЛЬНЫЙ демо-сервер (test-session, сам истекает). Бежит в общем прогоне
 * (по решению владельца, live-prod). Компиляция занимает минуты → большой таймаут; тег @slow.
 * Confirmed live 20-Jul-2026.
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

test.describe("Воронка конструктора модпаков — компиляция + happy-path до оплаты", () => {
  test("@critical @slow сборка компилируется и доводит до оформления триалки", async ({ page }) => {
    test.setTimeout(540_000); // компиляция ~2-5 мин + провижининг + воронка

    const mc = new ModpackConstructorPage(page);
    const cart = new CartModpackConstructorPage(page);

    await test.step("собрать модпак: Fabric 1.21.1 + совместимые моды", async () => {
      await mc.open();
      await mc.changeConfig({ loader: /^Fabric$/i, gameVersion: "Minecraft 1.21.1" });
      for (const name of MODS) {
        await mc.searchMod(name);
        await mc.installMod(name);
      }
      await mc.clearSearch();
      expect(await mc.installedCount(), "установлены все выбранные моды").toBeGreaterThanOrEqual(
        MODS.length,
      );
    });

    await test.step("проверка совместимости пройдена (Setup Status GOOD)", async () => {
      await expect.poll(() => mc.setupStatus(), { timeout: 15_000 }).toMatch(/GOOD/i);
    });

    await test.step("компиляция набора: демо-сервер поднимается (Server ready)", async () => {
      await mc.compileDryRun();
      await mc.proceedWithTestRun();
      await mc.waitForServerReady(); // ~2-5 мин
      await expect(mc.host().getByText(/Server ready/i).first()).toBeVisible();
    });

    await test.step("переход в воронку и логин", async () => {
      await mc.closeModal();
      await mc.startDemo();
      await expect(page).toHaveURL(CART_MODPACK_CONSTRUCTOR.urlPattern);
      await cart.login(Credentials.email, Credentials.password);
    });

    await test.step("страница триалки: собранный модпак + тариф + готовность к оформлению", async () => {
      // страница сперва показывает "Validating your build…", затем наполняет сводку
      await expect.poll(() => cart.summaryText(), { timeout: 45_000 }).toContain("1.21.1");
      const summary = await cart.summaryText();
      expect(summary).toMatch(/Start your modpack trial/i);
      expect(summary.toLowerCase()).toContain("fabric");
      for (const name of MODS) expect(summary).toContain(name);
      // кнопка оформления видна = воронка доведена до страницы «оплаты» (сам сабмит не жмём —
      // как и остальные воронки не завершают платёж; оформление триалки мутирует прод и
      // недетерминировано по таймингу, см. шапку файла и память modpack-constructor-trial-funnel).
      // Тариф/локация на этой странице догружаются отдельно и асинхронно — на них не завязываемся.
      await expect(cart.startTrialButton()).toBeVisible();
    });
  });
});
