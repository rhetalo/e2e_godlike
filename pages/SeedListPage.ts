/**
 * SeedListPage — страница списка сидов /minecraft-seeds/.
 *
 * Содержит новый кастомный калькулятор (NewSeedCalculator) — НЕ путать с одиночной
 * seed-страницей (SeedPage, Vuetify #seed-calculator). Здесь калькулятор подбирает
 * тариф по версии игры + слайдеру и ведёт в воронку /cart-seed.
 *
 * Confirmed via MCP recon 13-Jun-2026.
 */
import { BasePage } from "./BasePage";
import { NewSeedCalculator } from "../components/NewSeedCalculator";

export class SeedListPage extends BasePage {
  readonly calculator = new NewSeedCalculator(this.page);

  async open(): Promise<void> {
    await this.goto("/minecraft-seeds/");
    await this.calculator.waitReady();
  }
}
