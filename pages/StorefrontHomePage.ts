/**
 * StorefrontHomePage — главная godlike.host как вход в воронку покупки.
 *
 * Инкапсулирует навигацию «главная → лендинг тарифов → Add to Cart», которая раньше
 * инлайнилась raw-локаторами в registration-flow и funnel-спеках. Переиспользуется
 * этими тестами вместо дублирования storefront-навигации.
 */
import type { Locator } from "@playwright/test";
import { BasePage } from "./BasePage";
import { STOREFRONT } from "../utils/selectors";
import { Urls } from "../fixtures/test-data";

export class StorefrontHomePage extends BasePage {
  async open(): Promise<void> {
    await this.goto(Urls.home);
  }

  firstAddToCartButton(): Locator {
    return this.page.locator(STOREFRONT.tariffAddToCart).first();
  }

  /**
   * Перейти к списку тарифов и добавить первый в корзину (вход в воронку).
   *
   * Лендинг открываем прямым URL, а не кликом «View all plans» с главной. Такой кнопки
   * на главной больше нет — осталась только ссылка в выпадашке хедера, которая
   * раскрывается по ховеру. Playwright считал её видимой (размер есть) и пытался
   * кликнуть, а клик перехватывала плашка .main-header__intro-stripe. Проходило через
   * раз: click сначала скроллит и наводится на элемент, и если ховер успевал раскрыть
   * меню — тест зелёный, если нет — таймаут 15с. Отсюда пять «стабильных падений» в
   * ночном прогоне при зелёных одиночных запусках.
   */
  async addFirstTariffToCart(): Promise<void> {
    await this.goto(Urls.minecraftJava);
    const add = this.firstAddToCartButton();
    await add.waitFor({ state: "visible", timeout: 20_000 });
    await add.click();
  }
}
