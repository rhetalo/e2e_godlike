import { test, expect } from "@playwright/test";

test.describe("Main page links validation", () => {
  test(
    "all visible links on https://godlike.host/ are valid",
    { tag: "@links" },
    async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      const baseUrl = "https://godlike.host/";

      await page.goto(baseUrl);
      const userAgent = await page.evaluate(() => navigator.userAgent);

      // Собираем все ссылки на главной странице
      const hrefs = await page.locator("a[href]").evaluateAll((elements) =>
        Array.from(
          new Set(
            elements
              .map((el) => el.getAttribute("href") || "")
              .map((href) => href.trim())
              .filter(Boolean),
          ),
        ),
      );

      console.log(`🔍 Найдено href: ${hrefs.length}`);

      const urlsToCheck: string[] = [];

      for (const href of hrefs) {
        console.log(`Обработка href: ${href}`);

        // Пропускаем технические/нестандартные ссылки
        if (
          href.startsWith("mailto:") ||
          href.startsWith("tel:") ||
          href.startsWith("javascript:") ||
          href.startsWith("#")
        ) {
          console.log(`Пропущен: ${href}`);
          continue;
        }

        let fullUrl: string;

        try {
          if (href.startsWith("http://") || href.startsWith("https://")) {
            fullUrl = href;
          } else if (href.startsWith("//")) {
            // Протокол-зависимый URL (//example.com)
            fullUrl = `https:${href}`;
          } else {
            // Относительный путь -> конвертируем в абсолютный
            fullUrl = new URL(href, baseUrl).toString();
          }
        } catch {
          console.log(`❌ Невалидный href: ${href}`);
          throw new Error(`Невалидный href обнаружен: "${href}"`);
        }

        console.log(`Преобразован в: ${fullUrl}`);
        urlsToCheck.push(fullUrl);
      }

      console.log(`📦 Всего URL для проверки: ${urlsToCheck.length}`);

      const brokenLinks: { url: string; status: number }[] = [];

      const checkViaRequest = async (url: string) => {
        console.log(`🌐 [REQUEST] Проверка: ${url}`);

        const response = await page.request.get(url, {
          maxRedirects: 5,
          headers: {
            "user-agent": userAgent,
            accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "accept-language": "en-US,en;q=0.9,ru;q=0.8",
            referer: baseUrl,
          },
        });

        const status = response.status();
        console.log(`✅ [REQUEST] ${url} -> ${status}`);

        return status;
      };

      const checkViaNavigation = async (url: string) => {
        console.log(`🧭 [NAVIGATION] fallback для: ${url}`);

        const p = await page.context().newPage();
        try {
          const resp = await p.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 45000,
          });

          const status = resp?.status() ?? 0;
          console.log(`✅ [NAVIGATION] ${url} -> ${status}`);

          return status;
        } finally {
          await p.close();
        }
      };

      for (const url of urlsToCheck) {
        console.log(`\nНачало проверки: ${url}`);

        let status = await checkViaRequest(url);

        // fallback если антибот
        if (status === 400 || status === 403) {
          console.log(`⚠️${url} вернул ${status}, пробуем NAVIGATION`);
          const navStatus = await checkViaNavigation(url);
          if (navStatus > 0) status = navStatus;
        }

        console.log(`Итог: ${url} -> ${status}`);

        if (status >= 400) {
          console.log(`❌ Битая ссылка: ${url} (${status})`);
          brokenLinks.push({ url, status });
        }
      }

      if (brokenLinks.length) {
        console.log("\n❌ Найдены битые ссылки:");
        brokenLinks.forEach((l) =>
          console.log(`${l.url} -> ${l.status}`),
        );
      } else {
        console.log("\nВсе ссылки валидны");
      }

      expect(
        brokenLinks,
        brokenLinks.length
          ? `Найдены битые ссылки:\n${brokenLinks
              .map((l) => `${l.url} -> ${l.status}`)
              .join("\n")}`
          : "Все проверенные ссылки валидны",
      ).toEqual([]);
    },
  );
});