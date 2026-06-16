/**
 * GameSliderPage — кастомайзер тарифа «Customize server» на storefront game-страницах.
 *
 * Раньше этот page-object жил инлайн-классом `SliderPageHelper` внутри game-slider.spec.ts
 * (дублирование архитектуры в спеке, см. CLAUDE.md). Вынесен сюда; селекторы — `GAME_SLIDER`
 * из selectors.ts. Часть методов работает через `page.evaluate` — это сознательно: нативный
 * клик Playwright не всегда триггерит Vue-обработчик кастомайзера в headless, а чтение
 * блоков удобнее одним проходом по DOM. Assert'ов нет (ожидания — waitFor / expect.poll-wait).
 */
import { type Page, expect } from "@playwright/test";
import { GAME_SLIDER } from "../utils/selectors";

/** Данные блока-слайдера, прочитанные из живого DOM. */
export interface SliderBlock {
  /** напр. «Slots», «GB Ram», «Days runtime» */
  title: string;
  /** текущее отображаемое значение */
  currentValue: string;
  /** все доступные опции по порядку */
  options: string[];
}

export class GameSliderPage {
  constructor(private page: Page) {}

  /** Навигация + ожидание, пока Vue отрисует секцию тарифов. */
  async navigate(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await this.page
      .locator(GAME_SLIDER.tariffAny)
      .first()
      .waitFor({ state: "visible", timeout: 15_000 })
      .catch(() => null);
  }

  /** Есть ли на странице кнопка «Customize server». */
  async hasCustomizeButton(): Promise<boolean> {
    return this.page.evaluate(
      (sel) => !!document.querySelector(sel),
      GAME_SLIDER.customizeButton,
    );
  }

  /**
   * Клик «Customize server» через JS (нативный клик не триггерит Vue-обработчик в headless).
   * Ждёт появления первого блока-кастомайзера.
   */
  async openCustomizer(): Promise<void> {
    await this.page.evaluate((sel) => {
      const btn = document.querySelector<HTMLButtonElement>(sel);
      if (!btn) throw new Error('"Customize server" button not found in DOM');
      btn.click();
    }, GAME_SLIDER.customizeButton);
    await this.page
      .locator(GAME_SLIDER.block)
      .first()
      .waitFor({ state: "visible", timeout: 10_000 });
  }

  /** Прочитать данные всех блоков-слайдеров из текущего DOM. */
  async getSliderBlocks(): Promise<SliderBlock[]> {
    return this.page.evaluate((s) => {
      return Array.from(document.querySelectorAll(s.block)).map((block) => ({
        title:
          block.querySelector(s.blockTitle)?.textContent?.trim().replace(/\s+/g, " ") ?? "",
        currentValue: block.querySelector(s.blockValue)?.textContent?.trim() ?? "",
        options: Array.from(block.querySelectorAll(s.option)).map(
          (o) => (o as HTMLElement).dataset.value ?? "",
        ),
      }));
    }, GAME_SLIDER);
  }

  /** Клик по опции в N-ом блоке (JS-клик ради Vue-обработчика). */
  async clickOption(blockIndex: number, value: string): Promise<void> {
    await this.page.evaluate(
      ({ idx, val, s }) => {
        const block = document.querySelectorAll(s.block)[idx];
        if (!block) throw new Error(`Block ${idx} not found`);
        const opt = block.querySelector<HTMLElement>(`${s.option}[data-value="${val}"]`);
        if (!opt) throw new Error(`Option data-value="${val}" not found in block ${idx}`);
        opt.click();
      },
      { idx: blockIndex, val: value, s: GAME_SLIDER },
    );
    // Дожидаемся ре-рендера значения Vue (wait, не assert теста).
    await expect
      .poll(
        () =>
          this.page
            .locator(GAME_SLIDER.block)
            .nth(blockIndex)
            .locator(GAME_SLIDER.blockValue)
            .innerText(),
        { timeout: 3_000 },
      )
      .not.toBe("");
  }

  /** Отображаемое значение N-ого блока. */
  async getCurrentValue(blockIndex: number): Promise<string> {
    return this.page.evaluate(
      ({ idx, s }) => {
        const block = document.querySelectorAll(s.block)[idx];
        return block?.querySelector(s.blockValue)?.textContent?.trim() ?? "";
      },
      { idx: blockIndex, s: GAME_SLIDER },
    );
  }

  /**
   * Цена текущего сконфигурированного кастом-тарифа. После открытия кастомайзера сайт
   * рендерит карточку с классами `storefront__tariff-custom` И `storefront__tariff-choice`
   * — её цена обновляется в реальном времени при смене опций (вторую custom-карточку
   * без `tariff-choice`, со статичным «Custom», пропускаем).
   */
  async getCustomizedPrice(): Promise<string> {
    return this.page.evaluate((s) => {
      const choiceCard = document.querySelector(s.customChoiceCard);
      return choiceCard?.querySelector(s.customPrice)?.textContent?.trim() ?? "";
    }, GAME_SLIDER);
  }

  /** Число ползунков `.range_slider__selector` на странице (инвариант = 3). */
  async countSliderHandles(): Promise<number> {
    return this.page.evaluate((sel) => document.querySelectorAll(sel).length, GAME_SLIDER.handle);
  }

  /** Число бейджей скидки в блоке Days Runtime (90/180/360). */
  async countDaysDiscountBadges(): Promise<number> {
    return this.page.evaluate((s) => {
      const daysBlock = document.querySelectorAll(s.block)[2];
      return daysBlock?.querySelectorAll(s.daysDiscountBadge).length ?? 0;
    }, GAME_SLIDER);
  }
}
