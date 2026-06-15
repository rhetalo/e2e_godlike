/**
 * storefront.breadth.spec.ts
 * ──────────────────────────
 * Широкое read-only покрытие витрины godlike.host (без воронки/логина):
 *   - SEO/meta на ключевых страницах (title / description / canonical / OpenGraph / h1);
 *   - footer: legal-ссылки (Privacy/Terms) + соц-сети;
 *   - мобильный вьюпорт: desktop-nav скрыт, мобильная навигация присутствует.
 *
 * Структурные проверки (не точный маркетинговый текст — он меняется). Confirmed recon 15-Jun-2026.
 *
 * Запуск:
 *   npx playwright test tests/general/storefront.breadth.spec.ts --project=chromium
 */
import { test, expect } from "../../fixtures/base";
import { StorefrontPages } from "../../fixtures/test-data";
import { SEO } from "../../utils/selectors";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";

test.use({ viewport: { width: 1800, height: 900 }, deviceScaleFactor: 1 });

test.describe("@regression storefront — SEO/meta", () => {
  for (const p of StorefrontPages) {
    test(`SEO-теги: ${p.label}`, async ({ page }) => {
      await page.goto(p.path, { waitUntil: "domcontentloaded" });

      await test.step("title непустой", async () => {
        const title = (await page.title()).trim();
        console.log(`[INFO] ${p.path} <title>: ${title}`);
        expect(title.length).toBeGreaterThan(10);
      });

      await test.step("meta description присутствует и осмысленна", async () => {
        const desc = await page.locator(SEO.description).first().getAttribute("content");
        expect((desc ?? "").trim().length).toBeGreaterThan(30);
      });

      await test.step("canonical указывает на godlike.host", async () => {
        const canonical = await page.locator(SEO.canonical).first().getAttribute("href");
        expect(canonical ?? "").toMatch(/^https:\/\/godlike\.host\//);
      });

      // ⚠️ На страницах по 2 og-тега (тема + SEO-плагин) — берём .first(): проверяем наличие, не уникальность.
      await test.step("OpenGraph: og:title + og:image", async () => {
        const ogTitle = await page.locator(SEO.ogTitle).first().getAttribute("content");
        expect((ogTitle ?? "").trim().length).toBeGreaterThan(0);
        const ogImage = await page.locator(SEO.ogImage).first().getAttribute("content");
        expect(ogImage ?? "").toMatch(/^https?:\/\//);
      });

      await test.step("есть хотя бы один <h1>", async () => {
        await expect(page.locator(SEO.h1).first()).toBeVisible();
      });
    });
  }
});

test.describe("@regression storefront — footer", () => {
  test("legal-ссылки (Privacy/Terms) и соц-сети присутствуют", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const footer = new Footer(page);
    await expect(footer.root).toBeVisible();

    await test.step("legal: Privacy Policy + Terms с href", async () => {
      await expect(footer.link("Privacy").first()).toBeVisible();
      await expect(footer.link("Terms").first()).toBeVisible();
      await expect(footer.link("Privacy").first()).toHaveAttribute("href", /.+/);
    });

    await test.step("соц-сети: ≥3 внешних ссылки", async () => {
      const n = await footer.socialLinks().count();
      console.log(`[INFO] footer social links: ${n}`);
      expect(n).toBeGreaterThanOrEqual(3);
    });
  });
});

test.describe("@regression storefront — мобильный вьюпорт", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("desktop-nav скрыт, мобильная навигация присутствует", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const header = new Header(page);

    await test.step("мобильная навигация в DOM", async () => {
      await expect(header.mobileNav).toBeAttached();
    });

    await test.step("десктопная навигация скрыта на узком вьюпорте", async () => {
      await expect(header.nav).toBeHidden();
    });
  });
});
