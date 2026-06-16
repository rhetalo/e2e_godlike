/**
 * E2E-тесты панели «Customize server» (slider-кастомайзер) на game-страницах godlike.host.
 *
 * Архитектура:
 *  - GAME_CONFIGS — список всех игр. Никакие значения слайдеров не хардкодятся: всё
 *    вычитывается из живой страницы в рантайме.
 *  - GameSliderPage (pages/) — page-object всех DOM-взаимодействий кастомайзера.
 *  - Универсальные поведенческие тесты выполняются одинаково для каждой игры.
 *  - Инварианты, общие для всех игр: опции Days Runtime (30/90/180/360) и 3 блока-слайдера.
 */
import { test, expect } from "../../fixtures/base";
import { GameSliderPage } from "../../pages/GameSliderPage";

// ─────────────────────────────────────────────────────────────────────────────
// Game registry
// ─────────────────────────────────────────────────────────────────────────────

interface GameConfig {
  /** Человекочитаемая метка для имени теста */
  name: string;
  /** Полный URL страницы хостинга игры */
  url: string;
  /** false для страниц, у которых заведомо НЕТ кнопки «Customize server». */
  hasCustomizer?: boolean;
}

const GAME_CONFIGS: GameConfig[] = [
  {
    name: "Minecraft Java",
    url: "https://godlike.host/minecraft-java-servers-hosting/",
  },
  {
    name: "Modded Minecraft",
    url: "https://godlike.host/modded-minecraft-server-hosting/",
    hasCustomizer: false,
  },
  { name: "Rust", url: "https://godlike.host/rust-server-hosting/" },
  {
    name: "ARK Survival Evolved",
    url: "https://godlike.host/ark-survival-evolved-server-hosting/",
  },
  { name: "FiveM", url: "https://godlike.host/fivem-server-hosting/" },
  {
    name: "Counter-Strike 2",
    url: "https://godlike.host/best-cs2-server-hosting/",
  },
  { name: "Unturned", url: "https://godlike.host/unturned-server-hosting/" },
  { name: "Terraria", url: "https://godlike.host/terraria-server-hosting/" },
  { name: "Mindustry", url: "https://godlike.host/mindustry-server-hosting/" },
  { name: "Factorio", url: "https://godlike.host/factorio-server-hosting/" },
  {
    name: "Conan Exiles",
    url: "https://godlike.host/conan-exiles-server-hosting/",
  },
  {
    name: "7 Days to Die",
    url: "https://godlike.host/7-days-to-die-server-hosting/",
  },
  { name: "ARMA 3", url: "https://godlike.host/arma-3-server-hosting/" },
  {
    name: "Don't Starve Together",
    url: "https://godlike.host/dont-starve-together-server-hosting/",
  },
  {
    name: "Vintage Story",
    url: "https://godlike.host/vintage-story-server-hosting/",
  },
  {
    name: "The Forest",
    url: "https://godlike.host/the-forest-server-hosting/",
  },
  { name: "Team Fortress 2", url: "https://godlike.host/tf2-server-hosting/" },
  {
    name: "Space Engineers",
    url: "https://godlike.host/space-engineers-server-hosting/",
  },
  {
    name: "Quake Live",
    url: "https://godlike.host/quake-live-server-hosting/",
  },
  { name: "Valheim", url: "https://godlike.host/valheim-server-hosting/" },
  { name: "Garry's Mod", url: "https://godlike.host/gmod-server-hosting/" },
  { name: "Palworld", url: "https://godlike.host/palworld-server-hosting/" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Test suites — one per game
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Универсальные инварианты для КАЖДОЙ игры с кастомайзером:
 *  СТРУКТУРА: 3 блока; заголовки Slots/Ram/Days; Days-опции [30,90,180,360]; парность Slots↔RAM; 3 ползунка.
 *  СТАРТ: начальное значение = первая опция; Days стартует с «30».
 *  SLOTS: клик по опции обновляет значение; Slots↔RAM синхронизация по индексу.
 *  RAM: прямой клик меняет значение; смена RAM меняет цену.
 *  DAYS: клик по 90/180/360/30 обновляет значение.
 *  ЦЕНА/БИЛЛИНГ: 30→360 меняет цену; Slots first→last меняет цену; бейджи скидок видны.
 *  ПОЛНЫЙ ФЛОУ: последние Slots/RAM + Days=360 → все три значения обновляются.
 */
function registerGameTests(game: GameConfig): void {
  test.describe(game.name, () => {
    // ── smoke: no customizer ──────────────────────────────────────────────────
    if (game.hasCustomizer === false) {
      test('@regression страница грузится и НЕ имеет кнопки "Customize server" (ожидаемо)', async ({
        page,
      }) => {
        const helper = new GameSliderPage(page);
        await helper.navigate(game.url);
        expect(await helper.hasCustomizeButton()).toBe(false);
      });

      return;
    }

    // ── shared setup ─────────────────────────────────────────────────────────
    let helper: GameSliderPage;

    // smoke-тест для игр без кастомайзера живёт ВЫШЕ в ветке `if(!hasCustomizer){…return}`;
    // поднять хук над ним нельзя — его navigate+openCustomizer упадёт для таких игр.
    // eslint-disable-next-line playwright/prefer-hooks-on-top
    test.beforeEach(async ({ page }) => {
      helper = new GameSliderPage(page);
      await helper.navigate(game.url);
      await helper.openCustomizer();
    });

    // ── structure ────────────────────────────────────────────────────────────

    test("@regression структура кастомайзера", async () => {
      const blocks = await helper.getSliderBlocks();

      await test.step("показывает ровно 3 блока-слайдера", async () => {
        expect(blocks).toHaveLength(3);
      });

      await test.step('заголовок блока 0 содержит "Slots"', async () => {
        expect(blocks[0].title.toLowerCase()).toContain("slot");
      });

      await test.step('заголовок блока 1 содержит "Ram"', async () => {
        expect(blocks[1].title.toLowerCase()).toContain("ram");
      });

      await test.step('заголовок блока 2 содержит "Days"', async () => {
        expect(blocks[2].title.toLowerCase()).toContain("day");
      });

      await test.step("блок Days Runtime имеет опции [30, 90, 180, 360]", async () => {
        expect(blocks[2].options).toEqual(["30", "90", "180", "360"]);
      });

      await test.step("у каждого блока минимум 1 опция", async () => {
        for (const block of blocks) {
          expect(block.options.length).toBeGreaterThanOrEqual(1);
        }
      });

      await test.step("блоки Slots и RAM имеют одинаковое число опций (парные)", async () => {
        expect(blocks[0].options).toHaveLength(blocks[1].options.length);
      });

      await test.step("присутствуют все 3 ползунка", async () => {
        expect(await helper.countSliderHandles()).toBe(3);
      });
    });

    // ── initial values ───────────────────────────────────────────────────────

    test("@regression стартовые значения слайдеров", async () => {
      const blocks = await helper.getSliderBlocks();

      await test.step("Slots = первая опция Slots", async () => {
        expect(blocks[0].currentValue).toBe(blocks[0].options[0]);
      });

      await test.step("RAM = первая опция RAM", async () => {
        expect(blocks[1].currentValue).toBe(blocks[1].options[0]);
      });

      await test.step('Days = "30"', async () => {
        expect(blocks[2].currentValue).toBe("30");
      });
    });

    // ── Slots slider interactions ─────────────────────────────────────────────

    test("@regression клик по последней опции Slots обновляет отображаемое значение Slots", async () => {
      const blocks = await helper.getSliderBlocks();
      const lastSlotOption = blocks[0].options[blocks[0].options.length - 1];
      await helper.clickOption(0, lastSlotOption);
      expect(await helper.getCurrentValue(0)).toBe(lastSlotOption);
    });

    test("@regression клик по средней опции Slots обновляет отображаемое значение Slots", async () => {
      const blocks = await helper.getSliderBlocks();
      test.skip(blocks[0].options.length < 2, "у Slots одна опция — менять нечего");
      const midIdx = Math.floor(blocks[0].options.length / 2);
      const midOption = blocks[0].options[midIdx];
      await helper.clickOption(0, midOption);
      expect(await helper.getCurrentValue(0)).toBe(midOption);
    });

    // ── Slots ↔ RAM synchronisation ──────────────────────────────────────────

    test("@regression выбор последней опции Slots двигает и RAM на последнюю (синхронизация)", async () => {
      const blocks = await helper.getSliderBlocks();
      // Skip, когда все опции Slots одинаковы (напр. Valheim ["10","10","10"]) — index-based
      // проверка невозможна (clickOption всегда резолвится в index 0 по DOM-запросу).
      test.skip(
        blocks[0].options.every((opt) => opt === blocks[0].options[0]),
        "все опции Slots одинаковы (напр. Valheim) — index-based проверка невозможна",
      );
      const lastIdx = blocks[0].options.length - 1;
      const lastSlotOption = blocks[0].options[lastIdx];
      const expectedRam = blocks[1].options[lastIdx];

      await helper.clickOption(0, lastSlotOption);

      expect(await helper.getCurrentValue(0)).toBe(lastSlotOption);
      expect(await helper.getCurrentValue(1)).toBe(expectedRam);
    });

    test("@regression выбор средней опции Slots двигает RAM на парную среднюю опцию", async () => {
      const blocks = await helper.getSliderBlocks();
      test.skip(blocks[0].options.length < 3, "нет средней опции (опций < 3)");
      test.skip(
        blocks[0].options.every((opt) => opt === blocks[0].options[0]),
        "все опции Slots одинаковы — средняя совпадает с краями",
      );
      const midIdx = Math.floor(blocks[0].options.length / 2);
      await helper.clickOption(0, blocks[0].options[midIdx]);
      expect(await helper.getCurrentValue(0)).toBe(blocks[0].options[midIdx]);
      expect(await helper.getCurrentValue(1)).toBe(blocks[1].options[midIdx]);
    });

    test("@regression выбор первой опции Slots оставляет RAM на первой опции (синхронизация)", async () => {
      const blocks = await helper.getSliderBlocks();
      // Сначала уходим на последнюю, потом возвращаемся на первую. Когда все опции одинаковы
      // (Valheim), «последний» клик — no-op, но финальная проверка всё равно держится.
      const lastSlotOption = blocks[0].options[blocks[0].options.length - 1];
      await helper.clickOption(0, lastSlotOption);
      await helper.clickOption(0, blocks[0].options[0]);
      expect(await helper.getCurrentValue(0)).toBe(blocks[0].options[0]);
      expect(await helper.getCurrentValue(1)).toBe(blocks[1].options[0]);
    });

    // ── RAM slider direct interactions ───────────────────────────────────────
    // Прямой клик по RAM (блок 1), без Slots. Важно для Valheim, где все Slot-опции имеют
    // одно значение («10»), а реальная дифференциация — по RAM-тиру.

    test("@regression прямой клик по последней опции RAM обновляет отображаемое значение RAM", async () => {
      const blocks = await helper.getSliderBlocks();
      const lastRamOption = blocks[1].options[blocks[1].options.length - 1];
      await helper.clickOption(1, lastRamOption);
      expect(await helper.getCurrentValue(1)).toBe(lastRamOption);
    });

    test("@regression клик по первой опции RAM после последней возвращает RAM к первому значению", async () => {
      const blocks = await helper.getSliderBlocks();
      const firstRam = blocks[1].options[0];
      const lastRam = blocks[1].options[blocks[1].options.length - 1];
      await helper.clickOption(1, lastRam);
      await helper.clickOption(1, firstRam);
      expect(await helper.getCurrentValue(1)).toBe(firstRam);
    });

    test("@critical смена RAM напрямую с первой на последнюю опцию меняет цену тарифа", async () => {
      const blocks = await helper.getSliderBlocks();
      const firstRam = blocks[1].options[0];
      const lastRam = blocks[1].options[blocks[1].options.length - 1];
      test.skip(firstRam === lastRam, "RAM-тиры с одинаковой ценой — цена не изменится");
      const priceAtFirst = await helper.getCustomizedPrice();
      await helper.clickOption(1, lastRam);
      const priceAtLast = await helper.getCustomizedPrice();
      expect(priceAtLast).not.toBe(priceAtFirst);
    });

    // ── Days Runtime slider interactions ────────────────────────────────────

    test('@regression клик по Days=90 обновляет отображаемое значение Days до "90"', async () => {
      await helper.clickOption(2, "90");
      expect(await helper.getCurrentValue(2)).toBe("90");
    });

    test('@regression клик по Days=180 обновляет отображаемое значение Days до "180"', async () => {
      await helper.clickOption(2, "180");
      expect(await helper.getCurrentValue(2)).toBe("180");
    });

    test('@regression клик по Days=360 обновляет отображаемое значение Days до "360"', async () => {
      await helper.clickOption(2, "360");
      expect(await helper.getCurrentValue(2)).toBe("360");
    });

    test('@regression слайдер Days возвращается к "30" при повторном выборе первой опции', async () => {
      await helper.clickOption(2, "360");
      await helper.clickOption(2, "30");
      expect(await helper.getCurrentValue(2)).toBe("30");
    });

    // ── Price / billing changes ───────────────────────────────────────────────

    test("@critical смена периода оплаты с 30 на 360 дней меняет цену тарифа", async () => {
      const priceAt30 = await helper.getCustomizedPrice();
      await helper.clickOption(2, "360");
      const priceAt360 = await helper.getCustomizedPrice();
      expect(priceAt360).not.toBe(priceAt30);
    });

    test("@critical смена Slots с первой на последнюю опцию меняет цену тарифа", async () => {
      const blocks = await helper.getSliderBlocks();
      const firstOption = blocks[0].options[0];
      const lastOption = blocks[0].options[blocks[0].options.length - 1];
      // Skip при одной опции или одинаковых (Valheim: slots всегда 10 — отличается только RAM-тир).
      test.skip(
        blocks[0].options.length < 2 || firstOption === lastOption,
        "у Slots одна опция или все одинаковы — цена не изменится",
      );
      const priceAtFirst = await helper.getCustomizedPrice();
      await helper.clickOption(0, lastOption);
      const priceAtLast = await helper.getCustomizedPrice();
      expect(priceAtLast).not.toBe(priceAtFirst);
    });

    // ── Discount badges ──────────────────────────────────────────────────────

    test("@regression блок Days Runtime показывает бейджи скидок на длинных периодах", async () => {
      // 90/180/360 дней должны нести минимум 1 бейдж скидки.
      expect(await helper.countDaysDiscountBadges()).toBeGreaterThanOrEqual(1);
    });

    // ── Full flow ─────────────────────────────────────────────────────────────

    test("@regression полный флоу: выбрать последние Slots/RAM + Days=360 → все три значения обновляются", async () => {
      const blocks = await helper.getSliderBlocks();
      const lastIdx = blocks[0].options.length - 1;
      const allSlotsSame = blocks[0].options.every((opt) => opt === blocks[0].options[0]);

      let expectedSlot: string;
      let expectedRam: string;

      if (allSlotsSame) {
        // Valheim-подобные: все Slot-опции одинаковы → меняем план через RAM напрямую.
        expectedSlot = blocks[0].options[0];
        expectedRam = blocks[1].options[lastIdx];
        await helper.clickOption(1, expectedRam);
      } else {
        // Обычный случай: клик по последней Slots; RAM следует через синхронизацию.
        expectedSlot = blocks[0].options[lastIdx];
        expectedRam = blocks[1].options[lastIdx];
        await helper.clickOption(0, expectedSlot);
      }
      await helper.clickOption(2, "360");

      expect(await helper.getCurrentValue(0)).toBe(expectedSlot);
      expect(await helper.getCurrentValue(1)).toBe(expectedRam);
      expect(await helper.getCurrentValue(2)).toBe("360");
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Register test suites for all games
// ─────────────────────────────────────────────────────────────────────────────

for (const game of GAME_CONFIGS) {
  registerGameTests(game);
}
