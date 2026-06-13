/**
 * seed-list.calculator.spec.ts
 * ────────────────────────────
 * Новый кастомный калькулятор на странице СПИСКА сидов /minecraft-seeds/
 * (НЕ Vuetify-калькулятор одиночной seed-страницы — см. slider.seed.spec.ts).
 *
 * Покрываем работоспособность калькулятора (без перехода в воронку — переход в воронку
 * через CTA проверяет funnel.seed.spec.ts):
 *   - выбор версии игры заполняет тариф (план/цена) — до выбора план пуст ("—");
 *   - слайдер меняет предлагаемый тариф (план + цена + игроки);
 *   - CTA «Create server» присутствует и активен.
 *
 * ⚠️ Калькулятор гидрируется лениво (инлайн-конфиг window.GodlikeNewSeedCalculator) —
 * SeedListPage.open() ждёт готовности (опции версий). Confirmed via MCP recon 13-Jun-2026.
 *
 * Запуск:
 *   npx playwright test tests/modded/seed-list.calculator.spec.ts --project=chromium
 */
import { test, expect } from "../../fixtures/base";
import { SeedListPage } from "../../pages/SeedListPage";

test.describe("Новый seed-калькулятор (/minecraft-seeds/)", () => {
  let seedList: SeedListPage;

  test.beforeEach(async ({ page }) => {
    seedList = new SeedListPage(page);
    await seedList.open();
  });

  test("@regression калькулятор предлагает валидный тариф (план + RAM + цена)", async () => {
    // После гидрации (mouse-нудж в waitReady) калькулятор уже подобрал дефолтный тариф.
    // Выбираем версию явно и проверяем, что панель плана заполнена осмысленными значениями.
    await seedList.calculator.selectGameVersion(0);

    const plan = await seedList.calculator.readPlan();
    const price = await seedList.calculator.readPrice();
    const players = await seedList.calculator.readPlayers();
    console.log(
      `[INFO] plan=${plan.name} ram=${plan.ram} slots=${plan.slots} price=${price.current} players=${players}`,
    );
    expect(plan.name).not.toBe("—");
    expect(plan.name.length).toBeGreaterThan(0);
    expect(plan.ram).toMatch(/\d+\s*GB/i);
    expect(plan.slots).toMatch(/\d/);
    expect(price.current).toMatch(/[€$]\s?\d/);
    expect(players).toMatch(/\d/);
  });

  test("@critical слайдер меняет предлагаемый тариф (план + цена + игроки)", async () => {
    await seedList.calculator.selectGameVersion(0);
    await expect
      .poll(() => seedList.calculator.readPlan().then((p) => p.name), { timeout: 10_000 })
      .not.toBe("—");

    await seedList.calculator.sliderToMin();
    const lo = await seedList.calculator.readPlan();
    const loPrice = (await seedList.calculator.readPrice()).current;
    const loPlayers = await seedList.calculator.readPlayers();

    await seedList.calculator.sliderToMax();
    // план меняется реактивно — дождёмся, что имя отличается от минимума
    await expect
      .poll(() => seedList.calculator.readPlan().then((p) => p.name), { timeout: 10_000 })
      .not.toBe(lo.name);

    const hi = await seedList.calculator.readPlan();
    const hiPrice = (await seedList.calculator.readPrice()).current;
    const hiPlayers = await seedList.calculator.readPlayers();
    console.log(
      `[INFO] min: ${lo.name}/${loPrice}/${loPlayers}  →  max: ${hi.name}/${hiPrice}/${hiPlayers}`,
    );

    expect(hi.name).not.toBe(lo.name);
    expect(hiPrice).not.toBe(loPrice);
    expect(hiPlayers).not.toBe(loPlayers);
  });

  test("@regression CTA «Create server» виден и активен", async () => {
    await seedList.calculator.selectGameVersion(0);
    const cta = seedList.calculator.cta();
    await expect(cta).toBeVisible();
    await expect(cta).toHaveText(/create server/i);
  });
});
