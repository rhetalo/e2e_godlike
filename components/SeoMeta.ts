import { type Page, type Locator } from '@playwright/test';
import { SEO } from '../utils/selectors';

/**
 * SeoMeta — head-теги SEO/OpenGraph + первый <h1> на любой storefront-странице.
 * WHY a component: те же структурные проверки на каждой ключевой странице (storefront.breadth),
 * а Header/Footer за <head> не отвечают.
 * ⚠️ На страницах по 2 og-тега (тема + SEO-плагин) - везде `.first()`: проверяем наличие,
 * не уникальность. / Pages carry duplicate og-tags, so every locator takes `.first()`.
 */
export class SeoMeta {
  readonly description: Locator;
  readonly canonical: Locator;
  readonly ogTitle: Locator;
  readonly ogImage: Locator;
  readonly h1: Locator;

  constructor(private page: Page) {
    this.description = page.locator(SEO.description).first();
    this.canonical = page.locator(SEO.canonical).first();
    this.ogTitle = page.locator(SEO.ogTitle).first();
    this.ogImage = page.locator(SEO.ogImage).first();
    this.h1 = page.locator(SEO.h1).first();
  }
}
