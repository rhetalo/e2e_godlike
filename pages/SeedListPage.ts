/**
 * SeedListPage — страница списка сидов /minecraft-seeds/.
 *
 * Содержит Seed finder (SeedFinder) — фильтр сидов по версии/редакции/тегам.
 * ⚠️ recon 02-Oct-2026: калькулятор тарифа с CTA → /cart-seed отсюда удалён; воронка
 * осталась на одиночной seed-странице (SeedPage).
 */
import { BasePage } from "./BasePage";
import { SeedFinder } from "../components/SeedFinder";

export class SeedListPage extends BasePage {
  readonly finder = new SeedFinder(this.page);

  async open(): Promise<void> {
    await this.goto("/minecraft-seeds/");
    await this.finder.waitReady();
  }
}
