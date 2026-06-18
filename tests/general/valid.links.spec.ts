/**
 * valid.links.spec.ts
 * ───────────────────
 * Краулер: проверяет все внутренние ссылки godlike.host на доступность.
 * Собирает все сломанные ссылки и падает один раз в конце с полным списком.
 *
 * Запуск:
 *   npx playwright test tests/general/valid.links.spec.ts --project=storefront
 */
import { test, expect, BrowserContext, Page } from "@playwright/test";
import { pinAmplitudeExperiments } from "../../utils/amplitude";

test.describe("Проверка внутренних ссылок", () => {
  test("@regression все внутренние страницы доступны", async ({ browser }) => {
    test.setTimeout(10 * 60 * 1000); // 10 минут — реальный максимум при 100 страницах

    const BASE_URL = "https://godlike.host/";
    const BASE_ORIGIN = new URL(BASE_URL).origin;

    const MAX_PAGES = 100;
    const MAX_DEPTH = 1;
    const DELAY_BETWEEN_PAGES = 1200;
    const RETRIES = 2;

    const context: BrowserContext = await browser.newContext({ ignoreHTTPSErrors: true });
    // Фиксируем A/B-вариант Amplitude, чтобы акционный flash-sale не мешал краулеру
    await pinAmplitudeExperiments(context);
    const page: Page = await context.newPage();

    const visited = new Set<string>();
    const queue: { url: string; depth: number }[] = [];
    const brokenLinks: { url: string; reason: string; status?: number }[] = [];

    const SOFT_404_MARKERS = [
      "404: AFK Page",
      "not-found__block",
      "Page Not Found",
      "Return To Home Page",
    ];

    const EXCLUDED_PATTERNS = [
      /\.(jpg|jpeg|png|gif|svg|webp|ico)$/i,
      /\.(pdf|zip|rar|7z)$/i,
      /\.(mp4|webm|mov)$/i,
      /\.(css|js)$/i,
      /^mailto:/i,
      /^tel:/i,
      /^javascript:/i,
      /^#/i,
      /\/wp-json\//i,
      /\/feed\//i,
      /\/tag\//i,
      /\/author\//i,
      /\/category\//i,
      /\?replytocom=/i,
    ];

    const normalizeUrl = (url: string): string => {
      const parsed = new URL(url);
      parsed.hash = "";
      parsed.search = "";
      if (parsed.pathname !== "/" && parsed.pathname.endsWith("/")) {
        parsed.pathname = parsed.pathname.slice(0, -1);
      }
      return parsed.toString();
    };

    const shouldSkip = (url: string) => EXCLUDED_PATTERNS.some((p) => p.test(url));
    const isInternal = (url: string) => { try { return new URL(url).origin === BASE_ORIGIN; } catch { return false; } };

    const validatePage = async (url: string): Promise<{ ok: boolean; reason?: string; status?: number }> => {
      for (let attempt = 1; attempt <= RETRIES; attempt++) {
        try {
          const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
          if (!response) throw new Error("No response");

          const status = response.status();
          if (status >= 400) return { ok: false, status, reason: `HTTP ${status}` };

          // eslint-disable-next-line playwright/no-wait-for-timeout -- санкционировано CLAUDE.md: дать JS догрузиться перед чтением content-type
          await page.waitForTimeout(1500); // intentional: allow page JS to finish before reading content-type

          const contentType = response.headers()["content-type"] || "";
          if (!contentType.includes("text/html")) return { ok: false, reason: "Non-HTML content" };

          const html = await page.content();
          if (SOFT_404_MARKERS.some((m) => html.includes(m))) return { ok: false, status: 404, reason: "Soft 404" };

          const bodyText = await page.locator("body").innerText().catch(() => "");
          if (bodyText.trim().length < 80) return { ok: false, reason: "Page almost empty" };

          return { ok: true, status };
        } catch {
          if (attempt === RETRIES) return { ok: false, reason: "Navigation failed" };
          // eslint-disable-next-line playwright/no-wait-for-timeout -- санкционировано CLAUDE.md: back-off перед ретраем навигации
          await page.waitForTimeout(5000); // intentional: retry back-off delay before next attempt
        }
      }
      return { ok: false, reason: "Unknown failure" };
    };

    const extractLinks = async (currentUrl: string): Promise<string[]> => {
      try {
        const hrefs = await page.locator("a[href]").evaluateAll((els) =>
          [...new Set(els.map((el) => el.getAttribute("href")).filter(Boolean))]
        );
        const links: string[] = [];
        for (const raw of hrefs) {
          if (!raw || shouldSkip(raw)) continue;
          try {
            const abs = normalizeUrl(new URL(raw, currentUrl).toString());
            if (isInternal(abs)) links.push(abs);
          } catch { /* invalid href */ }
        }
        return [...new Set(links)];
      } catch { return []; }
    };

    queue.push({ url: BASE_URL, depth: 0 });

    while (queue.length > 0 && visited.size < MAX_PAGES) {
      const current = queue.shift();
      if (!current) continue;

      const normalized = normalizeUrl(current.url);
      if (visited.has(normalized) || current.depth > MAX_DEPTH) continue;
      visited.add(normalized);

      console.log(`[${visited.size}/${MAX_PAGES}] depth=${current.depth} ${normalized}`);

      const result = await validatePage(normalized);
      if (!result.ok) {
        console.log(`❌ ${normalized} — ${result.reason}`);
        brokenLinks.push({ url: normalized, reason: result.reason ?? "Unknown", status: result.status });
        continue;
      }

      const links = await extractLinks(normalized);
      for (const link of links) {
        if (!visited.has(link) && !queue.some((q) => q.url === link)) {
          queue.push({ url: link, depth: current.depth + 1 });
        }
      }

      // eslint-disable-next-line playwright/no-wait-for-timeout -- санкционировано CLAUDE.md: rate-limiting краулера, чтобы не долбить сервер
      await page.waitForTimeout(DELAY_BETWEEN_PAGES); // intentional: crawler rate-limiting to avoid hammering the server
    }

    console.log(`\nCrawl done. Pages: ${visited.size}, Broken: ${brokenLinks.length}`);
    await context.close();

    expect(
      brokenLinks,
      brokenLinks.length
        ? `Broken links:\n${brokenLinks.map((b) => `  ${b.url} → ${b.reason}`).join("\n")}`
        : "All links valid",
    ).toEqual([]);
  });
});
