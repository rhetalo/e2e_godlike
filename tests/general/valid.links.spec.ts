import { test, expect, BrowserContext, Page } from "@playwright/test";

test.describe("Internal links validation", () => {
  test("all internal pages should be reachable", async ({
    browser,
  }) => {
    // =====================================================
    // STABLE CONFIG
    // =====================================================

    test.setTimeout(60 * 60 * 1000);

    const BASE_URL = "https://godlike.host/";
    const BASE_ORIGIN = new URL(BASE_URL).origin;

    // Максимум страниц
    const MAX_PAGES = 100;

    // Максимальная глубина
    const MAX_DEPTH = 1;

    // Задержка между переходами
    const DELAY_BETWEEN_PAGES = 1200;

    // Retry
    const RETRIES = 2;

    // =====================================================
    // CONTEXT
    // =====================================================

    const context: BrowserContext =
      await browser.newContext({
        ignoreHTTPSErrors: true,
      });

    // ОДНА page на весь тест
    const page: Page = await context.newPage();

    // =====================================================
    // STORAGE
    // =====================================================

    const visited = new Set<string>();

    const queue: {
      url: string;
      depth: number;
    }[] = [];

    const brokenLinks: {
      url: string;
      reason: string;
      status?: number;
    }[] = [];

    // =====================================================
    // CONFIG
    // =====================================================

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

    // =====================================================
    // HELPERS
    // =====================================================

    const delay = async (ms: number) => {
      await page.waitForTimeout(ms);
    };

    const normalizeUrl = (url: string): string => {
      const parsed = new URL(url);

      parsed.hash = "";
      parsed.search = "";

      if (
        parsed.pathname !== "/" &&
        parsed.pathname.endsWith("/")
      ) {
        parsed.pathname = parsed.pathname.slice(0, -1);
      }

      return parsed.toString();
    };

    const shouldSkipUrl = (
      url: string,
    ): boolean => {
      return EXCLUDED_PATTERNS.some((pattern) =>
        pattern.test(url),
      );
    };

    const isInternal = (url: string): boolean => {
      try {
        return new URL(url).origin === BASE_ORIGIN;
      } catch {
        return false;
      }
    };

    // =====================================================
    // PAGE VALIDATOR
    // =====================================================

    const validatePage = async (
      url: string,
    ): Promise<{
      ok: boolean;
      reason?: string;
      status?: number;
    }> => {
      for (
        let attempt = 1;
        attempt <= RETRIES;
        attempt++
      ) {
        try {
          console.log(
            `🌐 [${attempt}/${RETRIES}] ${url}`,
          );

          const response = await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 120000,
          });

          if (!response) {
            throw new Error("No response");
          }

          const status = response.status();

          // Hard 404/500
          if (status >= 400) {
            return {
              ok: false,
              status,
              reason: `HTTP ${status}`,
            };
          }

          // Даем странице стабилизироваться
          await delay(1500);

          // Проверяем content-type
          const headers = response.headers();
          const contentType =
            headers["content-type"] || "";

          if (
            !contentType.includes("text/html")
          ) {
            return {
              ok: false,
              reason:
                "Non-HTML content returned",
            };
          }

          // HTML
          const html = await page.content();

          // Soft404
          const isSoft404 =
            SOFT_404_MARKERS.some((marker) =>
              html.includes(marker),
            );

          if (isSoft404) {
            return {
              ok: false,
              status: 404,
              reason: "Soft 404 detected",
            };
          }

          // Пустая страница
          const bodyText = await page
            .locator("body")
            .innerText()
            .catch(() => "");

          if (bodyText.trim().length < 80) {
            return {
              ok: false,
              reason: "Page almost empty",
            };
          }

          return {
            ok: true,
            status,
          };
        } catch (error) {
          console.log(
            `⚠ Attempt ${attempt} failed`,
          );

          if (attempt === RETRIES) {
            return {
              ok: false,
              reason: "Navigation failed",
            };
          }

          // Очень важный cooldown
          await delay(5000);
        }
      }

      return {
        ok: false,
        reason: "Unknown failure",
      };
    };

    // =====================================================
    // LINK EXTRACTION
    // =====================================================

    const extractLinks = async (
      currentUrl: string,
    ): Promise<string[]> => {
      try {
        const hrefs = await page
          .locator("a[href]")
          .evaluateAll((elements) =>
            Array.from(
              new Set(
                elements
                  .map((el) =>
                    el.getAttribute("href"),
                  )
                  .filter(Boolean),
              ),
            ),
          );

        const links: string[] = [];

        for (const rawHref of hrefs) {
          if (!rawHref) {
            continue;
          }

          const href = rawHref.trim();

          if (shouldSkipUrl(href)) {
            continue;
          }

          try {
            const absolute = normalizeUrl(
              new URL(href, currentUrl).toString(),
            );

            if (!isInternal(absolute)) {
              continue;
            }

            links.push(absolute);
          } catch {
            console.log(
              `⚠ Invalid href skipped: ${href}`,
            );
          }
        }

        return [...new Set(links)];
      } catch {
        return [];
      }
    };

    // =====================================================
    // START
    // =====================================================

    queue.push({
      url: BASE_URL,
      depth: 0,
    });

    // =====================================================
    // CRAWLER
    // =====================================================

    while (
      queue.length > 0 &&
      visited.size < MAX_PAGES
    ) {
      const current = queue.shift();

      if (!current) {
        continue;
      }

      const normalized = normalizeUrl(
        current.url,
      );

      // already visited
      if (visited.has(normalized)) {
        continue;
      }

      // depth limit
      if (current.depth > MAX_DEPTH) {
        continue;
      }

      visited.add(normalized);

      console.log("\n================================");
      console.log(
        `🕷 Crawling (${visited.size}/${MAX_PAGES})`,
      );
      console.log(
        `📚 Depth: ${current.depth}`,
      );
      console.log(`➡ ${normalized}`);
      console.log("================================");

      // =====================================================
      // VALIDATE
      // =====================================================

      const validation = await validatePage(
        normalized,
      );

      if (!validation.ok) {
        console.log(
          `❌ BROKEN: ${normalized}`,
        );

        console.log(
          `❌ Reason: ${validation.reason}`,
        );

        brokenLinks.push({
          url: normalized,
          reason:
            validation.reason || "Unknown",
          status: validation.status,
        });

        continue;
      }

      console.log(
        `✅ VALID (${validation.status})`,
      );

      // =====================================================
      // EXTRACT LINKS
      // =====================================================

      const links = await extractLinks(
        normalized,
      );

      console.log(
        `🔗 Found links: ${links.length}`,
      );

      for (const link of links) {
        if (visited.has(link)) {
          continue;
        }

        const alreadyQueued = queue.some(
          (q) => q.url === link,
        );

        if (alreadyQueued) {
          continue;
        }

        queue.push({
          url: link,
          depth: current.depth + 1,
        });
      }

      // =====================================================
      // GLOBAL COOLDOWN
      // =====================================================

      await delay(DELAY_BETWEEN_PAGES);
    }

    // =====================================================
    // REPORT
    // =====================================================

    console.log("\n================================");
    console.log("CRAWL FINISHED");
    console.log("================================");

    console.log(
      `📦 Total pages checked: ${visited.size}`,
    );

    console.log(
      `❌ Broken pages: ${brokenLinks.length}`,
    );

    if (brokenLinks.length > 0) {
      console.log("\nBROKEN LINKS:\n");

      for (const broken of brokenLinks) {
        console.log(
          `${broken.url}`,
        );

        console.log(
          `Reason: ${broken.reason}`,
        );

        console.log(
          `Status: ${broken.status ?? "N/A"}`,
        );

        console.log("----------------------");
      }
    }

    await context.close();

    expect(
      brokenLinks,
      brokenLinks.length
        ? `Broken links found:\n${brokenLinks
            .map(
              (b) =>
                `${b.url} -> ${b.reason}`,
            )
            .join("\n")}`
        : "All links valid",
    ).toEqual([]);
  });
});