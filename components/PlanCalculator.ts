/**
 * PlanCalculator — Vuetify v-slider widget shared by:
 *   - /modded-minecraft-server-hosting/ (#plan-calculator)
 *   - /minecraft-seeds/<slug>/         (#seed-calculator)
 *
 * Both bundles render a Vuetify v-slider whose ARIA-compliant thumb has
 * aria-valuemin=0 / aria-valuemax=100 and steps in uniform ticks. Pressing
 * ArrowRight on the thumb increments aria-valuenow by exactly one tick.
 *
 * ⚠️ Число делений (тиров) задаётся страницей и МЕНЯЕТСЯ: наблюдалось 8 шагов
 * (шаг 12.5), затем 6 шагов (шаг 16.667 = 100/6). Поэтому размер шага НЕ
 * хардкодим — вычисляем из DOM через stepSize().
 *
 * The modded calculator additionally exposes a Vuetify v-autocomplete for the
 * modpack and modpack version, plus a row of quick-pick "rounded-pill" buttons
 * (ATM 10, BMC 4, Prominence II, RLCraft, ATMons). Those modpack-specific
 * controls live on ModdedHostingPage so the seed calculator stays minimal.
 */
import type { Locator, Page } from "@playwright/test";

export type CalculatorRoot = "#plan-calculator" | "#seed-calculator";

export interface SliderState {
  /** aria-valuenow as a number (0..100). */
  value: number;
  /** aria-valuemin. */
  min: number;
  /** aria-valuemax. */
  max: number;
}

export class PlanCalculator {
  constructor(
    readonly page: Page,
    readonly rootSel: CalculatorRoot,
  ) {}

  root(): Locator {
    return this.page.locator(this.rootSel);
  }

  /** Wait until the Vue bundle has hydrated the calculator with content. */
  async waitMounted(timeoutMs = 30_000): Promise<void> {
    await this.root().waitFor({ state: "attached", timeout: timeoutMs });
    await this.page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel);
        return !!el && el.children.length > 0;
      },
      this.rootSel,
      { timeout: timeoutMs },
    );
    // The slider thumb is the most reliable "calculator is interactive" marker.
    await this.sliderThumb().waitFor({ state: "visible", timeout: timeoutMs });
  }

  // ─── slider ────────────────────────────────────────────────────────────────

  sliderThumb(): Locator {
    return this.root().locator('[role="slider"]').first();
  }

  /** Hidden input that backs the slider (different ID per bundle). */
  hiddenPlayerInput(): Locator {
    // modded: #planCalculatorFieldPlayersCount, seed: #fieldPlayersCount
    return this.root()
      .locator("#planCalculatorFieldPlayersCount, #fieldPlayersCount")
      .first();
  }

  async readSlider(): Promise<SliderState> {
    const thumb = this.sliderThumb();
    const [now, min, max] = await Promise.all([
      thumb.getAttribute("aria-valuenow"),
      thumb.getAttribute("aria-valuemin"),
      thumb.getAttribute("aria-valuemax"),
    ]);
    return {
      value: Number(now ?? 0),
      min: Number(min ?? 0),
      max: Number(max ?? 100),
    };
  }

  /** Press ArrowRight on the thumb `steps` times. */
  async stepRight(steps = 1): Promise<void> {
    const thumb = this.sliderThumb();
    await thumb.focus();
    for (let i = 0; i < steps; i++) {
      await this.page.keyboard.press("ArrowRight");
    }
  }

  async stepLeft(steps = 1): Promise<void> {
    const thumb = this.sliderThumb();
    await thumb.focus();
    for (let i = 0; i < steps; i++) {
      await this.page.keyboard.press("ArrowLeft");
    }
  }

  /** Move slider to its leftmost position. */
  async toMin(): Promise<void> {
    await this.sliderThumb().focus();
    await this.page.keyboard.press("Home");
    if ((await this.readSlider()).value !== 0) {
      await this.stepLeft(20);
    }
  }

  /**
   * Размер одного шага слайдера (один ArrowRight), вычисленный из DOM —
   * без хардкода, т.к. число тарифных делений на странице меняется.
   * Побочный эффект: оставляет слайдер на (min + 1 шаг).
   */
  async stepSize(): Promise<number> {
    await this.toMin();
    const a = (await this.readSlider()).value;
    await this.stepRight(1);
    const b = (await this.readSlider()).value;
    return b - a;
  }

  /** Move slider to its rightmost position. */
  async toMax(): Promise<void> {
    await this.sliderThumb().focus();
    await this.page.keyboard.press("End");
    const s = await this.readSlider();
    if (s.value !== s.max) {
      await this.stepRight(20);
    }
  }

  /**
   * Move the slider to the given fraction (0..1) of its range using keyboard
   * stepping (more reliable than mouse drag on Vuetify).
   */
  async setSliderFraction(fraction: number): Promise<void> {
    if (fraction < 0 || fraction > 1) {
      throw new Error(`fraction must be in [0,1], got ${fraction}`);
    }
    const step = await this.stepSize(); // вычисляем из DOM, не хардкодим
    await this.toMin();
    const { max } = await this.readSlider();
    const target = max * fraction;
    const stepsNeeded = step > 0 ? Math.round(target / step) : 0;
    if (stepsNeeded > 0) await this.stepRight(stepsNeeded);
  }
}
