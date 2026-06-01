/**
 * fixtures/base.ts
 * ─────────────────
 * Расширенная фикстура Playwright — автоматически регистрирует обработчики
 * баннеров для каждой страницы.
 *
 * ИСПОЛЬЗОВАНИЕ:
 *   Вместо:  import { test, expect } from '@playwright/test';
 *   Писать:  import { test, expect } from '../../fixtures/base';
 *
 * После этого любой `page` в тесте автоматически получает setupBannerHandlers()
 * — не нужно вручную вызывать dismissAll() или setupBannerHandlers().
 *
 * ЗАЧЕМ:
 *   BasePage.goto() уже вызывает dismissAll() для Page Object тестов.
 *   Эта фикстура покрывает тесты с прямым page.goto() тем же механизмом,
 *   чтобы поведение было единообразным во всём проекте.
 */
import { test as base, expect, type Page, type Browser, type BrowserContext } from '@playwright/test';
import { setupBannerHandlers } from '../utils/bannerHandlers';

export const test = base.extend<{ page: ReturnType<typeof base['info']> }>({
  page: async ({ page }, use) => {
    await setupBannerHandlers(page);
    await use(page);
  },
});

export { expect, type Page, type Browser, type BrowserContext };
