/**
 * PlanCalculator — слайдер тарифа, ОБЩИЙ для двух РАЗНЫХ бандлов:
 *   - /modded-minecraft-server-hosting/ (#plan-calculator) — ⚠️ с 23-Jul-2026 это НОВЫЙ
 *     веб-компонент `<plan-calculator-widget>` (Inc 6, открытый Shadow DOM, без Vuetify).
 *     Слайдер — НАТИВНЫЙ `input[type=range].ui-slider__input`, диапазон 0..N ДИСКРЕТНЫЙ
 *     (наблюдалось 0..8, step=1 — по числу тарифных ступеней), значение = input.value.
 *   - /minecraft-seeds/<slug>/ (#seed-calculator) — ВСЁ ЕЩЁ старый Vuetify v-slider:
 *     ARIA-thumb (aria-valuemin=0 / aria-valuemax=100), значение = aria-valuenow.
 *
 * Playwright пробивает открытый Shadow DOM обычными CSS-локаторами, поэтому
 * `#plan-calculator input.ui-slider__input` находит слайдер внутри веб-компонента.
 * sliderThumb()/readSlider() поддерживают ОБА варианта (native range ИЛИ aria).
 * Клавиши (Arrow/Home/End) работают и для нативного range, и для Vuetify-thumb.
 *
 * ⚠️ Число ступеней задаётся страницей и МЕНЯЕТСЯ (0..100 у seed, 0..8 у modded) — НЕ
 * хардкодим ни max, ни размер шага (вычисляем из DOM: readSlider().max, stepSize()).
 *
 * Модпак-специфичные контролы нового виджета (autocomplete/version/quick-pick) живут на
 * ModdedHostingPage (там же обновлены под новые классы .ui-*).
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
    // Новый modded-виджет: нативный range .ui-slider__input; старый seed-Vuetify: [role=slider].
    return this.root().locator('[role="slider"], input[type="range"].ui-slider__input').first();
  }

  /** Hidden input that backs the slider (different ID per bundle). */
  hiddenPlayerInput(): Locator {
    // modded: #planCalculatorFieldPlayersCount, seed: #fieldPlayersCount
    return this.root()
      .locator("#planCalculatorFieldPlayersCount, #fieldPlayersCount")
      .first();
  }

  async readSlider(): Promise<SliderState> {
    // Нативный range (modded) → value/min/max самого input; Vuetify-thumb (seed) → aria-*.
    return this.sliderThumb().evaluate((el) => {
      const inp = el as HTMLInputElement;
      if (inp.tagName === "INPUT" && inp.type === "range") {
        return {
          value: Number(inp.value || 0),
          min: Number(inp.min || 0),
          max: Number(inp.max || 100),
        };
      }
      const num = (a: string, d: number) => {
        const v = el.getAttribute(a);
        return v === null ? d : Number(v);
      };
      return { value: num("aria-valuenow", 0), min: num("aria-valuemin", 0), max: num("aria-valuemax", 100) };
    });
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
