/**
 * E2E tests for the "Customize server" slider panel on Godlike.host game pages.
 *
 * Architecture:
 *  - GAME_CONFIGS — master list of all games. No slider values are hardcoded here;
 *    everything is discovered dynamically from the live page at runtime.
 *  - SliderPageHelper — thin page-object that wraps all DOM interactions.
 *  - Universal behavioral tests run identically for every game via test.describe().
 *  - Days-Runtime options (30/90/180/360) and slider count (3) are the only
 *    invariants asserted across all games, because they never change per-game.
 */

import { test, expect, Page } from "@playwright/test";
import { CookieBanner } from "../../components/CookieBanner";

// ─────────────────────────────────────────────────────────────────────────────
// Game registry
// ─────────────────────────────────────────────────────────────────────────────

interface GameConfig {
  /** Human-readable label used in test titles */
  name: string;
  /** Full URL of the game hosting page */
  url: string;
  /**
   * Set to false for pages that are known NOT to have a "Customize server"
   * button (e.g. Modded Minecraft redirects straight to a preset plan).
   */
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
// Page-object helper
// ─────────────────────────────────────────────────────────────────────────────

/** Discovered slider block data read from the live DOM */
interface SliderBlock {
  /** e.g. "Slots", "GB Ram", "Days runtime" */
  title: string;
  /** Currently displayed value (text inside .value element) */
  currentValue: string;
  /** All available option values in order */
  options: string[];
}

class SliderPageHelper {
  constructor(private page: Page) {}

  /** Navigate and wait for Vue to fully boot. */
  async navigate(url: string): Promise<void> {
    await this.page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await new CookieBanner(this.page).dismissAll();
    // Wait for Vue to render the tariff section instead of a fixed 3-second delay
    await this.page.waitForSelector('[class*="storefront__tariff"]', {
      state: 'visible',
      timeout: 15_000,
    }).catch(() => null);
  }

  /** Returns true if a "Customize server" button exists on the page. */
  async hasCustomizeButton(): Promise<boolean> {
    return this.page.evaluate(() => {
      return !!document.querySelector("button.storefront__tariff-action__cart");
    });
  }

  /**
   * Click "Customize server" via JS (Playwright's native click doesn't fire
   * the Vue event handler in headless mode on this site).
   * Waits until at least one `.storefront__tariffs-customizer-block` appears.
   */
  async openCustomizer(): Promise<void> {
    await this.page.evaluate(() => {
      const btn = document.querySelector<HTMLButtonElement>(
        "button.storefront__tariff-action__cart",
      );
      if (!btn) throw new Error('"Customize server" button not found in DOM');
      btn.click();
    });
    await this.page.waitForSelector(".storefront__tariffs-customizer-block", {
      timeout: 10000,
    });
  }

  /** Read all slider block data from the current DOM state. */
  async getSliderBlocks(): Promise<SliderBlock[]> {
    return this.page.evaluate(() => {
      return Array.from(
        document.querySelectorAll(".storefront__tariffs-customizer-block"),
      ).map((block) => ({
        title:
          block
            .querySelector(".storefront__tariffs-customizer-block__title")
            ?.textContent?.trim()
            .replace(/\s+/g, " ") ?? "",
        currentValue:
          block
            .querySelector(".storefront__tariffs-customizer-block__value")
            ?.textContent?.trim() ?? "",
        options: Array.from(
          block.querySelectorAll(".range_slider__option"),
        ).map((o) => (o as HTMLElement).dataset.value ?? ""),
      }));
    });
  }

  /**
   * Click a specific option inside the Nth block (0-indexed).
   * Uses JS click to reliably trigger Vue handlers.
   */
  async clickOption(blockIndex: number, value: string): Promise<void> {
    await this.page.evaluate(
      ({ idx, val }) => {
        const block = document.querySelectorAll(
          ".storefront__tariffs-customizer-block",
        )[idx];
        if (!block) throw new Error(`Block ${idx} not found`);
        const opt = block.querySelector<HTMLElement>(
          `.range_slider__option[data-value="${val}"]`,
        );
        if (!opt)
          throw new Error(
            `Option data-value="${val}" not found in block ${idx}`,
          );
        opt.click();
      },
      { idx: blockIndex, val: value },
    );
    // Poll until Vue re-renders the selected value
    await expect.poll(
      () => this.page.locator('.storefront__tariffs-customizer-block').nth(blockIndex)
        .locator('.storefront__tariffs-customizer-block__value').innerText(),
      { timeout: 3_000 }
    ).not.toBe("");
  }

  /** Get the displayed value for the Nth block. */
  async getCurrentValue(blockIndex: number): Promise<string> {
    return this.page.evaluate((idx) => {
      const block = document.querySelectorAll(
        ".storefront__tariffs-customizer-block",
      )[idx];
      return (
        block
          ?.querySelector(".storefront__tariffs-customizer-block__value")
          ?.textContent?.trim() ?? ""
      );
    }, blockIndex);
  }

  /**
   * Get the price of the currently configured/active custom tariff.
   *
   * After opening the customizer, the site renders a tariff card that has BOTH
   * the `storefront__tariff-custom` AND the `storefront__tariff-choice` CSS
   * classes. This is the "your plan" card whose price updates in real-time
   * as slider options change.
   *
   * (There is also a second `.storefront__tariff-custom` card without
   * `tariff-choice` that shows the static text "Custom" — we skip that one.)
   */
  async getCustomizedPrice(): Promise<string> {
    return this.page.evaluate(() => {
      const choiceCard = document.querySelector(
        ".storefront__tariff.storefront__tariff-custom.storefront__tariff-choice",
      );
      return (
        choiceCard
          ?.querySelector(".storefront__tariff-pricing__price")
          ?.textContent?.trim() ?? ""
      );
    });
  }

  /** Get CSS `left` position of the slider handle in the Nth block. */
  async getHandleLeft(blockIndex: number): Promise<string> {
    return this.page.evaluate((idx) => {
      const block = document.querySelectorAll(
        ".storefront__tariffs-customizer-block",
      )[idx];
      const handle = block?.querySelector<HTMLImageElement>(
        ".range_slider .range_slider__selector",
      );
      return handle?.style.left ?? "";
    }, blockIndex);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test suites — one per game
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Universal invariants that hold for EVERY game with a customizer (~30 tests each):
 *
 *  STRUCTURE
 *   1. Customizer opens → exactly 3 blocks appear
 *   2. Block 0 title contains "Slots", block 1 contains "Ram", block 2 contains "Days"
 *   3. Days Runtime block always has exactly these options: 30, 90, 180, 360
 *   4. Each block has at least 1 option; Slots and RAM have the same count (paired)
 *   5. All 3 slider handle elements are present in the DOM
 *
 *  INITIAL STATE
 *   6. Initial displayed value = first option in each block; Days starts at "30"
 *
 *  SLOTS INTERACTIONS
 *   7. Clicking last/middle Slots option updates displayed Slots value
 *
 *  SLOTS ↔ RAM SYNC  (skipped when all Slot values are identical, e.g. Valheim)
 *   8. Last/middle/first Slots → RAM moves to matching index
 *
 *  RAM DIRECT INTERACTIONS  (runs for ALL games including Valheim)
 *   9. Clicking last RAM option directly updates displayed RAM value
 *  10. Clicking first RAM after last returns RAM to first value
 *  11. Changing RAM from first to last option changes the tariff price
 *  12. RAM slider handle moves when clicked directly
 *
 *  DAYS RUNTIME
 *  13. Clicking Days=90/180/360/30 updates displayed Days value
 *
 *  PRICE / BILLING
 *  14. 30→360 days billing change → tariff price changes
 *  15. First→last Slots change → tariff price changes (skipped when all Slots equal)
 *  16. Discount badges visible for 90/180/360 options
 *
 *  HANDLE POSITIONS
 *  17. Slots handle moves when option clicked (skipped when all Slots equal)
 *  18. Days handle moves when option clicked
 *
 *  FULL FLOW
 *  19. Select last Slots (or last RAM for Valheim-like) + Days=360 → all 3 values update
 */
function registerGameTests(game: GameConfig): void {
  test.describe(game.name, () => {
    // ── smoke: no customizer ──────────────────────────────────────────────────
    if (game.hasCustomizer === false) {
      test('page loads and does NOT have "Customize server" button (expected)', async ({
        page,
      }) => {
        const helper = new SliderPageHelper(page);
        await helper.navigate(game.url);
        const hasBtn = await helper.hasCustomizeButton();
        expect(hasBtn).toBe(false);
      });
      return;
    }

    // ── shared setup ─────────────────────────────────────────────────────────
    let helper: SliderPageHelper;

    test.beforeEach(async ({ page }) => {
      helper = new SliderPageHelper(page);
      await helper.navigate(game.url);
      await helper.openCustomizer();
    });

    // ── structure ────────────────────────────────────────────────────────────

    test("customizer opens and shows exactly 3 slider blocks", async ({
      page,
    }) => {
      const blocks = await helper.getSliderBlocks();
      expect(blocks).toHaveLength(3);
    });

    test('block 0 title contains "Slots"', async ({ page }) => {
      const blocks = await helper.getSliderBlocks();
      expect(blocks[0].title.toLowerCase()).toContain("slot");
    });

    test('block 1 title contains "Ram"', async ({ page }) => {
      const blocks = await helper.getSliderBlocks();
      expect(blocks[1].title.toLowerCase()).toContain("ram");
    });

    test('block 2 title contains "Days"', async ({ page }) => {
      const blocks = await helper.getSliderBlocks();
      expect(blocks[2].title.toLowerCase()).toContain("day");
    });

    test("Days Runtime block always has options [30, 90, 180, 360]", async ({
      page,
    }) => {
      const blocks = await helper.getSliderBlocks();
      expect(blocks[2].options).toEqual(["30", "90", "180", "360"]);
    });

    test("each block has at least 1 option", async ({ page }) => {
      const blocks = await helper.getSliderBlocks();
      for (const block of blocks) {
        expect(block.options.length).toBeGreaterThanOrEqual(1);
      }
    });

    test("Slots and RAM blocks have the same number of options (they are paired)", async ({
      page,
    }) => {
      const blocks = await helper.getSliderBlocks();
      expect(blocks[0].options.length).toBe(blocks[1].options.length);
    });

    test("all 3 slider handle (.range_slider__selector) elements are present", async ({
      page,
    }) => {
      const count = await page.evaluate(
        () =>
          document.querySelectorAll(".range_slider .range_slider__selector")
            .length,
      );
      expect(count).toBe(3);
    });

    // ── initial values ───────────────────────────────────────────────────────

    test("initial Slots value equals first Slots option", async ({ page }) => {
      const blocks = await helper.getSliderBlocks();
      const firstOption = blocks[0].options[0];
      expect(blocks[0].currentValue).toBe(firstOption);
    });

    test("initial RAM value equals first RAM option", async ({ page }) => {
      const blocks = await helper.getSliderBlocks();
      const firstOption = blocks[1].options[0];
      expect(blocks[1].currentValue).toBe(firstOption);
    });

    test('initial Days value is "30"', async ({ page }) => {
      const blocks = await helper.getSliderBlocks();
      expect(blocks[2].currentValue).toBe("30");
    });

    // ── Slots slider interactions ─────────────────────────────────────────────

    test("clicking last Slots option updates the displayed Slots value", async ({
      page,
    }) => {
      const blocks = await helper.getSliderBlocks();
      const lastSlotOption = blocks[0].options[blocks[0].options.length - 1];
      await helper.clickOption(0, lastSlotOption);
      const updated = await helper.getCurrentValue(0);
      expect(updated).toBe(lastSlotOption);
    });

    test("clicking middle Slots option updates the displayed Slots value", async ({
      page,
    }) => {
      const blocks = await helper.getSliderBlocks();
      if (blocks[0].options.length < 2) return; // only 1 option — skip
      const midIdx = Math.floor(blocks[0].options.length / 2);
      const midOption = blocks[0].options[midIdx];
      await helper.clickOption(0, midOption);
      expect(await helper.getCurrentValue(0)).toBe(midOption);
    });

    // ── Slots ↔ RAM synchronisation ──────────────────────────────────────────

    test("selecting last Slots option also moves RAM to its last option (sync)", async ({
      page,
    }) => {
      const blocks = await helper.getSliderBlocks();
      // Skip when all slot options share the same value (e.g. Valheim: ["10","10","10"]).
      // In that case clickOption() always resolves to index 0 by DOM query, so we cannot
      // reliably test index-based sync.
      if (blocks[0].options.every((opt) => opt === blocks[0].options[0]))
        return;
      const lastIdx = blocks[0].options.length - 1;
      const lastSlotOption = blocks[0].options[lastIdx];
      const expectedRam = blocks[1].options[lastIdx];

      await helper.clickOption(0, lastSlotOption);

      expect(await helper.getCurrentValue(0)).toBe(lastSlotOption);
      expect(await helper.getCurrentValue(1)).toBe(expectedRam);
    });

    test("selecting middle Slots option also moves RAM to its paired middle option", async ({
      page,
    }) => {
      const blocks = await helper.getSliderBlocks();
      // Need at least 3 unique options to have a meaningful middle
      if (blocks[0].options.length < 3) return;
      if (blocks[0].options.every((opt) => opt === blocks[0].options[0]))
        return;
      const midIdx = Math.floor(blocks[0].options.length / 2);
      await helper.clickOption(0, blocks[0].options[midIdx]);
      expect(await helper.getCurrentValue(0)).toBe(blocks[0].options[midIdx]);
      expect(await helper.getCurrentValue(1)).toBe(blocks[1].options[midIdx]);
    });

    test("selecting first Slots option keeps RAM at first option (sync)", async ({
      page,
    }) => {
      const blocks = await helper.getSliderBlocks();
      // First click the last to move away from default, then go back to first.
      // When all options share the same value (Valheim), the "last" click is a no-op
      // but the final assertion still holds — RAM stays at first option.
      const lastSlotOption = blocks[0].options[blocks[0].options.length - 1];
      await helper.clickOption(0, lastSlotOption);
      await helper.clickOption(0, blocks[0].options[0]);
      expect(await helper.getCurrentValue(0)).toBe(blocks[0].options[0]);
      expect(await helper.getCurrentValue(1)).toBe(blocks[1].options[0]);
    });

    // ── RAM slider direct interactions ───────────────────────────────────────
    //
    // These tests click RAM options directly (block index 1) without going through
    // Slots. This is particularly important for Valheim, where all Slot options share
    // the same display value ("10") and the real product differentiation is done via
    // the RAM tier. For all other games these tests provide additional coverage of
    // the RAM slider behaving independently.

    test("clicking last RAM option directly updates the displayed RAM value", async ({
      page,
    }) => {
      const blocks = await helper.getSliderBlocks();
      const lastRamOption = blocks[1].options[blocks[1].options.length - 1];
      await helper.clickOption(1, lastRamOption);
      expect(await helper.getCurrentValue(1)).toBe(lastRamOption);
    });

    test("clicking first RAM option after last returns RAM to first value", async ({
      page,
    }) => {
      const blocks = await helper.getSliderBlocks();
      const firstRam = blocks[1].options[0];
      const lastRam = blocks[1].options[blocks[1].options.length - 1];
      await helper.clickOption(1, lastRam);
      await helper.clickOption(1, firstRam);
      expect(await helper.getCurrentValue(1)).toBe(firstRam);
    });

    test("changing RAM directly from first to last option changes the tariff price", async ({
      page,
    }) => {
      const blocks = await helper.getSliderBlocks();
      const firstRam = blocks[1].options[0];
      const lastRam = blocks[1].options[blocks[1].options.length - 1];
      // Only meaningful if the RAM tiers have different pricing
      if (firstRam === lastRam) return;
      const priceAtFirst = await helper.getCustomizedPrice();
      await helper.clickOption(1, lastRam);
      const priceAtLast = await helper.getCustomizedPrice();
      expect(priceAtLast).not.toBe(priceAtFirst);
    });

    test("RAM slider handle moves when an option is clicked directly", async ({
      page,
    }) => {
      const blocks = await helper.getSliderBlocks();
      const firstRam = blocks[1].options[0];
      const lastRam = blocks[1].options[blocks[1].options.length - 1];
      // Skip if all RAM options share the same value (handle won't shift)
      if (firstRam === lastRam) return;
      const initialLeft = await helper.getHandleLeft(1);
      await helper.clickOption(1, lastRam);
      const updatedLeft = await helper.getHandleLeft(1);
      expect(updatedLeft).not.toBe(initialLeft);
    });

    // ── Days Runtime slider interactions ────────────────────────────────────

    test('clicking Days=90 updates displayed Days value to "90"', async ({
      page,
    }) => {
      await helper.clickOption(2, "90");
      expect(await helper.getCurrentValue(2)).toBe("90");
    });

    test('clicking Days=180 updates displayed Days value to "180"', async ({
      page,
    }) => {
      await helper.clickOption(2, "180");
      expect(await helper.getCurrentValue(2)).toBe("180");
    });

    test('clicking Days=360 updates displayed Days value to "360"', async ({
      page,
    }) => {
      await helper.clickOption(2, "360");
      expect(await helper.getCurrentValue(2)).toBe("360");
    });

    test('Days slider returns to "30" when first option re-selected', async ({
      page,
    }) => {
      await helper.clickOption(2, "360");
      await helper.clickOption(2, "30");
      expect(await helper.getCurrentValue(2)).toBe("30");
    });

    // ── Price / billing changes ───────────────────────────────────────────────

    test("changing billing period from 30 to 360 days changes the tariff price", async ({
      page,
    }) => {
      const priceAt30 = await helper.getCustomizedPrice();
      await helper.clickOption(2, "360");
      const priceAt360 = await helper.getCustomizedPrice();
      // 360-day total billed upfront differs from 30-day price
      expect(priceAt360).not.toBe(priceAt30);
    });

    test("changing Slots from first to last option changes the tariff price", async ({
      page,
    }) => {
      const blocks = await helper.getSliderBlocks();
      const firstOption = blocks[0].options[0];
      const lastOption = blocks[0].options[blocks[0].options.length - 1];
      // Skip if there is only 1 option or all options have the same value
      // (e.g. Valheim where slots are always 10 — only RAM tier differs)
      if (blocks[0].options.length < 2 || firstOption === lastOption) return;
      const priceAtFirst = await helper.getCustomizedPrice();
      await helper.clickOption(0, lastOption);
      const priceAtLast = await helper.getCustomizedPrice();
      // Bigger server should have a different (higher) price
      expect(priceAtLast).not.toBe(priceAtFirst);
    });

    // ── Discount badges ──────────────────────────────────────────────────────

    test("Days Runtime block shows discount badges on longer period options", async ({
      page,
    }) => {
      const discountCount = await page.evaluate(() => {
        const daysBlock = document.querySelectorAll(
          ".storefront__tariffs-customizer-block",
        )[2];
        return (
          daysBlock?.querySelectorAll(".range_slider__option-discount")
            .length ?? 0
        );
      });
      // 90, 180, 360 days should all have at least 1 discount badge
      expect(discountCount).toBeGreaterThanOrEqual(1);
    });

    // ── Slider handle position ────────────────────────────────────────────────

    test("Slots slider handle moves when an option is clicked", async ({
      page,
    }) => {
      const blocks = await helper.getSliderBlocks();
      const firstOption = blocks[0].options[0];
      const lastOption = blocks[0].options[blocks[0].options.length - 1];
      // Skip if there is only 1 option or all options have the same value
      // (e.g. Valheim where all slot options equal "10" — handle won't visually shift)
      if (blocks[0].options.length < 2 || firstOption === lastOption) return;
      const initialLeft = await helper.getHandleLeft(0);
      await helper.clickOption(0, lastOption);
      const updatedLeft = await helper.getHandleLeft(0);
      expect(updatedLeft).not.toBe(initialLeft);
    });

    test("Days Runtime slider handle moves when an option is clicked", async ({
      page,
    }) => {
      const initialLeft = await helper.getHandleLeft(2);
      await helper.clickOption(2, "360");
      const updatedLeft = await helper.getHandleLeft(2);
      expect(updatedLeft).not.toBe(initialLeft);
    });

    // ── Full flow ─────────────────────────────────────────────────────────────

    test("full flow: select last Slots/RAM + Days=360 → all three values update", async ({
      page,
    }) => {
      const blocks = await helper.getSliderBlocks();
      const lastIdx = blocks[0].options.length - 1;
      const allSlotsSame = blocks[0].options.every(
        (opt) => opt === blocks[0].options[0],
      );

      let expectedSlot: string;
      let expectedRam: string;

      if (allSlotsSame) {
        // Games like Valheim where all Slot options share the same display value.
        // Drive the plan change via RAM directly instead of via Slots sync.
        expectedSlot = blocks[0].options[0]; // Slots stays at the only value
        expectedRam = blocks[1].options[lastIdx];
        await helper.clickOption(1, expectedRam);
      } else {
        // Normal case: click last Slots option; RAM follows via sync.
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
