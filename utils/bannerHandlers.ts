/**
 * bannerHandlers.ts
 * ──────────────────
 * Утилиты для закрытия баннеров и оверлеев.
 *
 * ── АРХИТЕКТУРА ──────────────────────────────────────────────────────────────
 *
 * Баннеры закрываются через ОДНОРАЗОВЫЙ вызов dismissAll() после goto(),
 * а НЕ через addLocatorHandler.
 *
 * Почему не addLocatorHandler:
 *   Playwright's addLocatorHandler перехватывает ВСЕ клики (в том числе по
 *   навигационным ссылкам) как только указанный локатор становится видим.
 *   Широкие селекторы (button:has-text("Accept"), [class*="sale-banner"]) матчат
 *   постоянные элементы DOM → бесконечный цикл перехвата или случайный клик по
 *   чему-то, что вызывает навигацию обратно на главную.
 *
 * ── КАК ИСПОЛЬЗУЕТСЯ ─────────────────────────────────────────────────────────
 *
 * Page Object тесты (CartPage, ModdedHostingPage и др.):
 *   BasePage.goto() → dismissIfPresent() → автоматически ✅
 *
 * VPS-панель (VpsPanelServerPage):
 *   setupBannerHandlers(page) — вызывается в goto() (исторически, теперь no-op)
 *   new CookieBanner(page).dismissAll() — явный вызов после goto() ✅
 *
 * Тесты с прямым page.goto() (funnels, general, modded):
 *   fixtures/base.ts оборачивает page.goto() → dismissAll() автоматически ✅
 */
import type { Page } from "@playwright/test";

/**
 * Регистрирует автоматические обработчики баннеров.
 *
 * @deprecated Ранее использовал addLocatorHandler — теперь no-op.
 * Баннеры закрываются через page.goto()-обёртку в fixtures/base.ts
 * и явные dismissAll() в Page Object goto().
 * Функция оставлена для обратной совместимости (VpsPanelServerPage вызывает её).
 */
export async function setupBannerHandlers(_page: Page): Promise<void> {
  // Intentionally empty — see module-level docs above.
}

/**
 * Вспомогательная функция: создаёт страницу.
 * @deprecated Используй context.newPage() напрямую.
 */
export async function newPageWithHandlers(
  context: Awaited<ReturnType<import("@playwright/test").Browser["newContext"]>>,
): Promise<import("@playwright/test").Page> {
  return context.newPage();
}
