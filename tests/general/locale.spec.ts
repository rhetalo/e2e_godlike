/**
 * Storefront — переключатель языка и валюты (godlike.host header).
 *
 * Подтверждено live-recon 10-Jun-2026:
 *  - ЯЗЫК: URL-префикс — <a href="/{code}/"> (8 языков: en + ua/es/de/pl/fr/pt/it).
 *    Клик → навигация на /{code}/, контент переводится, префикс остаётся в URL.
 *  - ВАЛЮТА: нативный el.click() по .currency-item (21 валюта на 15-Oct-2026, было 4) меняет символ/цену
 *    БЕЗ смены URL, персист cookie — НО только в HEADED-браузере. В HEADLESS-прогоне эффект
 *    не отражается ни при каком способе клика → поведенческую смену валюты НЕ автоматизируем
 *    здесь (LOC-003 — структурный: все валюты из StorefrontCurrencies присутствуют). Валюта по
 *    умолчанию — по IP (из UA — UAH), поэтому её не фиксируем. Деталь и метод — см. ниже.
 *
 * Драйвится через компонент Header. Импорт из fixtures/base — flash-sale-модалка (перехватывает
 * клики) гасится автоматически после goto. Read-only по сути: язык/валюта — клиентская preference.
 */
import { test, expect } from "../../fixtures/base";
import { Header } from "../../components/Header";
import { StorefrontCurrencies } from "../../fixtures/test-data";

const LANG_CODES = ["ua", "es", "de", "pl", "fr", "pt", "it"] as const;

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const CURRENCY_CODE_RE = StorefrontCurrencies.map(([code]) => code).join("|");
// Цена «Starting at ₴575.20» — символ любой валюты свитчера (длинные символы первыми: «AR$» раньше «$»).
const PRICE_SYMBOL_RE = new RegExp(
  [...StorefrontCurrencies.map(([, symbol]) => symbol)].sort((a, b) => b.length - a.length).map(escapeRe).join("|"),
);

// Свитчер — десктопный (.desktop-only). Фиксируем desktop-viewport, чтобы он рендерился.
test.use({ viewport: { width: 1440, height: 900 } });

// Навигация главной ждёт domcontentloaded, НЕ "load": переделанная шапка (23-Jul-2026) тянет
// картинки игр, и событие "load" под нагрузкой CI выходило за 60с → транзиентный goto-timeout
// (LOC-002). Шапка приходит в серверном HTML, элементы ждём web-first — полный "load" не нужен.
const DOM_READY = "domcontentloaded" as const;

test.describe("[storefront] Переключатель языка и валюты", () => {
  test("@regression TC-LOC-001 | свитчер показывает текущую локаль и ссылки на все языки", async ({ page }) => {
    const header = new Header(page);
    await page.goto("/", { waitUntil: DOM_READY });

    await test.step("триггер показывает '{lang} | {CUR}'", async () => {
      await expect(header.localeTrigger).toBeVisible();
      expect(await header.localeText()).toMatch(new RegExp(`^[a-z]{2}\\s*\\|\\s*(${CURRENCY_CODE_RE})$`, "i"));
    });

    await test.step("ссылки всех 7 неосновных языков ведут на /{code}/", async () => {
      for (const code of LANG_CODES) {
        await expect(header.languageLink(code)).toHaveAttribute("href", new RegExp(`/${code}/?$`, "i"));
      }
    });
  });

  test("@critical TC-LOC-002 | переключение языка меняет URL-префикс и контент", async ({ page }) => {
    const header = new Header(page);
    await page.goto("/", { waitUntil: DOM_READY });
    const enTitle = await page.title();

    await test.step("клик по 'de' → URL /de/ + язык в триггере 'de'", async () => {
      await header.switchLanguage("de");
      await expect(page).toHaveURL(/\/de\//);
      await expect(header.currentLang).toHaveText(/de/i);
    });

    await test.step("контент переведён (title отличается от EN)", async () => {
      expect(await page.title()).not.toBe(enTitle);
    });

    await test.step("язык персистит в URL после reload", async () => {
      await page.reload();
      await expect(page).toHaveURL(/\/de\//);
      await expect(header.currentLang).toHaveText(/de/i);
    });
  });

  test("@regression TC-LOC-003 | свитчер содержит все валюты витрины с символами", async ({ page }) => {
    // ⚠️ Структурно (read-only). Поведенческую смену валюты НЕ проверяем: live-recon 10-Jun
    // подтвердил, что el.click() по .currency-item меняет символ/цену в HEADED-браузере, но в
    // HEADLESS не отражается ни при каком способе клика (dispatchEvent / native / ±hover) —
    // валютный JS, похоже, завязан на headed-окружение. Поведенческий тест отложен (нужен
    // headed-lane либо иной триггер). Метод Header.switchCurrency сохранён для будущего headed-прогона.
    const header = new Header(page);
    await page.goto("/", { waitUntil: DOM_READY });

    await test.step("базовая цена видна с символом валюты", async () => {
      await expect(header.samplePrice).toBeVisible();
      await expect(header.samplePrice).toHaveText(PRICE_SYMBOL_RE);
    });

    await test.step(`свитчер содержит все ${StorefrontCurrencies.length} валют с их символами`, async () => {
      for (const [code, symbol] of StorefrontCurrencies) {
        await expect(header.currencyOption(code)).toContainText(code);
        await expect(header.currencyOption(code)).toContainText(symbol);
      }
    });
  });
});
