/**
 * bannerHandlers.ts
 * ──────────────────
 * Регистрирует `page.addLocatorHandler()` для всех баннеров и оверлеев.
 *
 * ── ЧТО ДЕЛАЕТ addLocatorHandler ────────────────────────────────────────────
 *
 * Playwright наблюдает за указанным локатором в фоне.
 * Как только элемент появляется на странице (даже посреди теста, посреди клика),
 * Playwright:
 *   1. Останавливает текущее действие
 *   2. Запускает обработчик (handler)
 *   3. Повторяет остановленное действие
 *
 * Это означает: тест НЕ падает из-за баннера, баннер закрывается автоматически,
 * действие выполняется как будто баннера не было.
 *
 * ── КАК ИСПОЛЬЗОВАТЬ ────────────────────────────────────────────────────────
 *
 * Вызови один раз после создания страницы (`context.newPage()`):
 *
 *   const page = await context.newPage();
 *   await setupBannerHandlers(page);         // ← добавь эту строку
 *   // ... дальше работа с page как обычно
 *
 * Для VPS-панели: вызов уже встроен в `VpsPanelServerPage.goto()`.
 * Для других тестов: вызывай вручную там, где создаётся page.
 *
 * ── КАК ДОБАВИТЬ НОВЫЙ БАННЕР АКЦИИ ─────────────────────────────────────────
 *
 * 1. Открой браузер, дождись появления баннера
 * 2. F12 → Elements → найди корневой элемент баннера
 * 3. Правая кнопка → Copy → Copy selector
 * 4. Добавь его в PROMO_BANNER_SELECTORS в CookieBanner.ts
 * 5. Найди кнопку закрытия → добавь в PROMO_CLOSE_SELECTORS в CookieBanner.ts
 * 6. Готово — `setupBannerHandlers` подберёт новый селектор автоматически
 *
 * ── ВАЖНО ────────────────────────────────────────────────────────────────────
 *
 * addLocatorHandler срабатывает только когда элемент ВИДЕН (visible).
 * Поэтому селектор в PROMO_BANNER_SELECTORS должен совпадать с видимым
 * корневым элементом баннера, а не с каким-то скрытым контейнером.
 */
import type { Page } from "@playwright/test";
import { CookieBanner } from "../components/CookieBanner";

/**
 * Регистрирует автоматические обработчики для всех известных баннеров.
 *
 * Вызывай один раз после `context.newPage()`.
 * Работает на любом сайте: godlike.host и vf-panel.godlike.host.
 */
export async function setupBannerHandlers(page: Page): Promise<void> {
  const banner = new CookieBanner(page);

  // ── Flash-sale modal (.flash-sale-modal) ──────────────────────────────────
  //
  // ПРАВИЛО: addLocatorHandler регистрируем ТОЛЬКО для точных подтверждённых
  // селекторов с известной кнопкой закрытия.
  //
  // ЗАПРЕЩЕНО в addLocatorHandler:
  //   - button:has-text("Accept") — слишком широко, матчит любую кнопку "Accept"
  //     на странице, перехватывает клики по ссылкам и вызывает навигацию
  //   - [class*="sale-banner"] — матчит постоянные элементы DOM (div.flash-sale-banner),
  //     создаёт бесконечный цикл перехвата
  //   - acceptCookieButton() — содержит button:has-text("Accept"), см. выше
  //
  // Куки-баннеры обрабатываются через dismissAll() в BasePage.goto().
  // Для тестов с прямым page.goto() — вызывай banner.dismissAll() после goto().
  await page
    .addLocatorHandler(page.locator(".flash-sale-modal").first(), async () => {
      await banner.dismissPromo();
    })
    .catch(() => undefined);
}

/**
 * Вспомогательная функция: создаёт страницу с уже настроенными обработчиками.
 *
 * Используй вместо `context.newPage()` если хочешь одной строкой получить
 * страницу, готовую к работе без баннеров.
 *
 * Пример:
 *   const page = await newPageWithHandlers(context);
 */
export async function newPageWithHandlers(
  context: Awaited<ReturnType<import("@playwright/test").Browser["newContext"]>>,
): Promise<import("@playwright/test").Page> {
  const page = await context.newPage();
  await setupBannerHandlers(page);
  return page;
}
