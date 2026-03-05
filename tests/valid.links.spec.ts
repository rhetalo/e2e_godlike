import { test, expect } from "@playwright/test";

test.describe("Main page links validation", () => {
  test(
    "all visible links on https://godlike.host/ are valid",
    { tag: "@links" },
    async ({ page }) => {
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

      const urlsToCheck: string[] = [];

      for (const href of hrefs) {
        // Пропускаем технические/нестандартные ссылки
        if (
          href.startsWith("mailto:") ||
          href.startsWith("tel:") ||
          href.startsWith("javascript:") ||
          href.startsWith("#")
        ) {
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
          // Невалидный URL-формат
          throw new Error(`Невалидный href обнаружен: "${href}"`);
        }

        urlsToCheck.push(fullUrl);
      }

      const brokenLinks: { url: string; status: number }[] = [];

      const checkViaRequest = async (url: string) => {
        // Используем API-контекст, привязанный к browser context страницы:
        // он наследует cookie/прокси/часть настроек и обычно меньше ловит антибот.
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

        return response.status();
      };

      const checkViaNavigation = async (url: string) => {
        // Если запросы режутся антиботом (403/400), проверяем ссылку “как пользователь”
        // через реальную навигацию в новом табе.
        const p = await page.context().newPage();
        try {
          const resp = await p.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 45000,
          });
          return resp?.status() ?? 0;
        } finally {
          await p.close();
        }
      };

      for (const url of urlsToCheck) {
        let status = await checkViaRequest(url);

        // Часто встречается: “открывается в браузере, но 403/400 для API-клиента”.
        // В таком случае делаем fallback-навигацию.
        if (status === 400 || status === 403) {
          const navStatus = await checkViaNavigation(url);
          if (navStatus > 0) status = navStatus;
        }

        if (status >= 400) {
          brokenLinks.push({ url, status });
        }
      }

      // Если есть битые ссылки — падаем с понятным сообщением
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
