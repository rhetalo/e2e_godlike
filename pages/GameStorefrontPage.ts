/**
 * GameStorefrontPage — каталог игровых серверов (/game-servers-en/) и страница тарифов
 * конкретной игры.
 *
 * Инкапсулирует навигацию + прокликивание тарифов с чтением результата промокода —
 * раньше эти ~180 строк дублировались в games.valid.promo и games.invalid.promo.
 * Возвращает СЫРЫЕ результаты; вердикт (valid/invalid по логину) принимает спек.
 * Селекторы — из selectors.ts. Assert'ов нет (ожидания — через waitFor).
 */
import type { Locator } from "@playwright/test";
import { BasePage } from "./BasePage";
import { STOREFRONT, PROMO } from "../utils/selectors";
import { Urls } from "../fixtures/test-data";

export interface TariffPromoResult {
  title: string;
  /** показан success-label с текстом «Activated promocode» */
  activated: boolean;
  /** текст success/error-лейбла промокода */
  text: string;
}

export class GameStorefrontPage extends BasePage {
  async open(): Promise<void> {
    await this.goto(Urls.gameServers);
  }

  gameLink(name: string): Locator {
    return this.page
      .locator(STOREFRONT.gameTitle)
      .filter({ hasText: new RegExp(`^${name}$`) })
      .first();
  }

  /**
   * Открыть страницу игры, прокликать каждый тариф с «Add to Cart» и прочитать
   * результат промокода. Между тарифами возвращается на страницу игры.
   * Вердикт (должен/не должен активироваться) — на стороне спека.
   */
  async collectTariffPromoResults(gameName: string): Promise<TariffPromoResult[]> {
    await this.open();

    const link = this.gameLink(gameName);
    await link.waitFor({ state: "visible", timeout: 60_000 });
    await link.scrollIntoViewIfNeeded();
    const gamePageUrl = (await link.getAttribute("href")) ?? Urls.gameServers;
    await link.click();
    await this.page.waitForLoadState("domcontentloaded", { timeout: 60_000 });

    const cards = this.page.locator(STOREFRONT.tariffCard);
    await cards.first().waitFor({ state: "visible", timeout: 60_000 });

    // Собираем тарифы с кнопкой Add to Cart (+ заголовок для отчёта)
    const all = await cards.all();
    const targets: { btn: Locator; title: string }[] = [];
    for (let i = 0; i < all.length; i++) {
      const addBtn = all[i].locator(`${STOREFRONT.tariffAddToCart}:has-text("Add to Cart")`);
      if ((await addBtn.count()) > 0) {
        const titleText = (
          await all[i].locator(STOREFRONT.tariffTitle).textContent().catch(() => null)
        )?.trim();
        targets.push({ btn: addBtn.first(), title: titleText || `#${i + 1}` });
      }
    }

    const results: TariffPromoResult[] = [];
    for (const { btn, title } of targets) {
      await btn.scrollIntoViewIfNeeded();
      await btn.click();

      const success = this.page.locator(PROMO.successLabel);
      const error = this.page.locator(PROMO.errorLabel);
      await Promise.race([
        success.waitFor({ state: "visible", timeout: 60_000 }),
        error.waitFor({ state: "visible", timeout: 60_000 }),
      ]);

      if (await success.isVisible()) {
        const text = (await success.textContent())?.trim() ?? "";
        results.push({ title, activated: text.includes("Activated promocode"), text });
      } else {
        const text = (await error.textContent())?.trim() ?? "";
        results.push({ title, activated: false, text });
      }

      await this.page.goto(gamePageUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    }

    return results;
  }
}
