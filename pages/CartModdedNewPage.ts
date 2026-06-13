/**
 * CartModdedNewPage — НОВЫЙ UI воронки /cart-modded-new.
 *
 * ⚠️ НЕ классический Vue-cart (CartPage с auth-block/order__button-order). Это конфигуратор
 * с тремя custom-select дропдаунами + кнопка "Order Now". Дропдауны видны ТОЛЬКО залогиненным
 * (аноним → auth-стена), поэтому тесты входят залогиненным контекстом. Опции рендерятся внутри
 * .custom-select по клику на .custom-select__toggle и меняют выбор/цену реактивно.
 *
 * Идентификация дропдаунов по содержимому (порядок не хардкодим):
 *   - План/RAM  → содержит "Slots"
 *   - Биллинг   → содержит "Month"
 *   - Локация   → единственный БЕЗ "Slots"/"Month" (.location-group появляется лишь при открытии)
 *
 * Методы — действия/ридеры; assert'ы в спеке. Confirmed via MCP/scratch recon 13-Jun-2026.
 */
import type { Locator } from "@playwright/test";
import { BasePage } from "./BasePage";
import { CART_MODDED_NEW as SEL } from "../utils/selectors";

export class CartModdedNewPage extends BasePage {
  // ── Дропдауны (по различимому содержимому) ──────────────────────
  planSelect(): Locator {
    return this.page.locator(SEL.customSelect).filter({ hasText: /Slots/ }).first();
  }
  billingSelect(): Locator {
    return this.page.locator(SEL.customSelect).filter({ hasText: /Month/ }).first();
  }
  locationSelect(): Locator {
    // локация = единственный custom-select без "Slots" (план) и без "Month" (биллинг)
    return this.page.locator(SEL.customSelect).filter({ hasNotText: /Slots|Month/ }).first();
  }

  toggle(select: Locator): Locator {
    return select.locator(SEL.toggle);
  }
  orderButton(): Locator {
    return this.page.locator(SEL.orderButton).filter({ hasText: /order now/i }).first();
  }
  currentPrice(): Locator {
    return this.page.locator(SEL.priceCurrent).first();
  }

  /** Дождаться, пока конфигуратор смонтирован (виден тоггл плана). */
  async waitReady(timeoutMs = 30_000): Promise<void> {
    await this.toggle(this.planSelect()).waitFor({ state: "visible", timeout: timeoutMs });
  }

  async toggleText(select: Locator): Promise<string> {
    return ((await this.toggle(select).textContent()) ?? "").replace(/\s+/g, " ").trim();
  }

  async priceText(): Promise<string> {
    return ((await this.currentPrice().textContent()) ?? "").trim();
  }

  /** Открыть дропдаун и вернуть тексты опций (затем закрыть). */
  async optionTexts(select: Locator): Promise<string[]> {
    await this.toggle(select).click();
    const opts = select.locator(SEL.option);
    await opts.first().waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});
    const texts = (await opts.allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim()).filter(Boolean);
    await this.toggle(select).click().catch(() => {}); // закрыть
    return texts;
  }

  /** Открыть дропдаун и выбрать опцию по тексту (regex). Дропдаун закрывается сам. */
  async selectOption(select: Locator, match: RegExp): Promise<void> {
    await this.toggle(select).click();
    await select.locator(SEL.option).filter({ hasText: match }).first().click();
  }

  /**
   * Выбрать любую опцию, отличную от текущего выбора (для локации, где дефолт плавает).
   * Возвращает выбранный текст.
   */
  async selectDifferentOption(select: Locator): Promise<string> {
    const current = await this.toggleText(select);
    await this.toggle(select).click();
    const opts = select.locator(SEL.option);
    await opts.first().waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});
    const count = await opts.count();
    for (let i = 0; i < count; i++) {
      const txt = ((await opts.nth(i).textContent()) ?? "").replace(/\s+/g, " ").trim();
      if (txt && !current.includes(txt) && !txt.includes(current)) {
        await opts.nth(i).click();
        return txt;
      }
    }
    await this.toggle(select).click().catch(() => {}); // ничего не нашли — закрыть
    return current;
  }
}
