/**
 * fixtures/base.ts
 * ─────────────────
 * Расширенная фикстура Playwright — автоматически закрывает баннеры
 * после каждого page.goto().
 *
 * ИСПОЛЬЗОВАНИЕ:
 *   Вместо:  import { test, expect } from '@playwright/test';
 *   Писать:  import { test, expect } from '../../fixtures/base';
 *
 * КАК РАБОТАЕТ:
 *   Оборачивает page.goto() — после каждой навигации вызывает dismissAll().
 *   Это то же самое что делает BasePage.goto() для Page Object тестов.
 *
 * ПОЧЕМУ НЕ addLocatorHandler:
 *   addLocatorHandler перехватывает клики ПОСРЕДИ теста, в том числе по
 *   навигационным ссылкам. Это вызывает редирект обратно на godlike.host/
 *   вместо перехода на целевую страницу.
 *   Безопасная альтернатива — одноразовый dismissAll() сразу после goto().
 *
 * ПОЧЕМУ ДВОЙНОЙ dismissAll + networkidle:
 *   Баннеры на godlike.host появляются с задержкой 300–800ms через JS
 *   (Vue mounted hook, setTimeout, асинхронный fetch данных акции).
 *   В headless режиме страница загружается быстрее чем в UI → первый
 *   dismissAll() отрабатывает до появления баннера → баннер появляется
 *   позже → перехватывает клик по навигационной ссылке → редирект на /.
 *   Решение: ждём networkidle (все JS-запросы завершены) → первый dismiss,
 *   затем ещё короткая пауза → второй dismiss для баннеров с setTimeout.
 */
import { test as base, expect, type Page, type Browser, type BrowserContext } from '@playwright/test';
import { CookieBanner } from '../components/CookieBanner';

export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    const banner = new CookieBanner(page);

    const origGoto = page.goto.bind(page);
    (page as any).goto = async (...args: Parameters<Page['goto']>) => {
      const resp = await origGoto(...args);
      // Ждём завершения всех сетевых запросов — даём JS-баннерам время появиться
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
      await banner.dismissAll().catch(() => {});
      // Второй проход — для баннеров с setTimeout после networkidle
      await page.waitForTimeout(400);
      await banner.dismissAll().catch(() => {});
      return resp;
    };

    await use(page);
  },
});

export { expect, type Page, type Browser, type BrowserContext };
