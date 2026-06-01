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
 */
import { test as base, expect, type Page, type Browser, type BrowserContext } from '@playwright/test';
import { CookieBanner } from '../components/CookieBanner';

export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    const banner = new CookieBanner(page);

    // Оборачиваем page.goto() — после каждой навигации автоматически
    // закрываем все баннеры. Аналог BasePage.goto() → dismissIfPresent().
    const origGoto = page.goto.bind(page);
    (page as any).goto = async (...args: Parameters<Page['goto']>) => {
      const resp = await origGoto(...args);
      await banner.dismissAll().catch(() => {});
      return resp;
    };

    await use(page);
  },
});

export { expect, type Page, type Browser, type BrowserContext };
