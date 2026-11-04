/**
 * Storefront — тарифы на страницах игр видны AI-ботам (DEV-604, wp!750/!751/!755/!783).
 *
 * Боты (GPTBot, ClaudeBot, PerplexityBot) JS не выполняют. Сервер отдаёт карточки тарифов текстом внутри
 * Vue-контейнера, а JSON-LD страницы - один ProductGroup, где каждый тариф вариант со ссылкой `?plan=<id>`.
 * Блок 1 смотрит страницу как бот: контекст без JS и с User-Agent GPTBot. Блок 2 - посетитель с JS:
 * ссылка `?plan=` из JSON-LD прокручивает к тарифу и выделяет его.
 *
 * Read-only: только открытие страниц, корзину не открываем. Цены и валюта зависят от IP и акции
 * (у UA/PL акции нет), поэтому сверяем карточки с JSON-LD между собой, а не с константами.
 * KB: kb/products/wpgl/tariffs-for-bots.md.
 */
import { test, expect, type BrowserContext } from "../../fixtures/base";
import { GameStorefrontPage } from "../../pages/GameStorefrontPage";
import { BASE_URL, TariffsForBots } from "../../fixtures/test-data";
import { TariffProductGroup, type TariffProductGroupT, schemaIssues } from "../../utils/schemas";

const money = (text: string | null): string | null => text?.match(/\d+\.\d{2}/)?.[0] ?? null;

/** Единственный ProductGroup страницы + число корневых Product рядом (их быть не должно). */
async function readProductGroup(store: GameStorefrontPage) {
  const nodes = await store.jsonLdNodes();
  return {
    groups: nodes.filter((n) => n["@type"] === "ProductGroup"),
    products: nodes.filter((n) => n["@type"] === "Product"),
  };
}

test.describe("[storefront] тарифы для AI-ботов: страница без JS", () => {
  // Свой контекст, а не фикстурный page: обёртка goto в fixtures/base гасит JS-баннеры и без JS висит до таймаута.
  // Баннеров у бота нет - их рисует JS.
  let botContext: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    botContext = await browser.newContext({
      baseURL: BASE_URL,
      javaScriptEnabled: false,
      userAgent: TariffsForBots.botUserAgent,
    });
  });

  test.afterAll(async () => {
    await botContext.close();
  });

  for (const { path, game } of TariffsForBots.pages) {
    test(
      `TC-TARIFFS-BOT-001 | ${game}: карточки тарифов в HTML и один ProductGroup с теми же ценами`,
      { tag: "@regression", annotation: { type: "issue", description: "DEV-604" } },
      async () => {
        const store = new GameStorefrontPage(await botContext.newPage());
        await store.openLandingAsBot(path);
        const cards = await store.ssrTariffCards();
        const paid = cards.filter((c) => c.price !== null);

        await test.step("карточки есть, у платных цена и кнопка корзины не ссылкой", async () => {
          expect(paid.length, "платных карточек").toBeGreaterThanOrEqual(1);
          for (const c of paid) {
            expect.soft(money(c.price), `${c.title}: цена`).not.toBeNull();
            expect.soft(c.cartHref, `${c.title}: href кнопки`).toBe("#");
            expect.soft(c.cartUrl ?? "", `${c.title}: data-cart-url`).toMatch(/^\/cart[^?]*\?productId=\d+/);
          }
        });

        await test.step("у Custom (без цены) нет кнопки корзины", async () => {
          for (const c of cards.filter((card) => card.price === null)) {
            expect.soft(c.cartUrl, `${c.title}: кнопка`).toBeNull();
          }
        });

        let group: TariffProductGroupT | undefined;

        await test.step("в JSON-LD ровно один ProductGroup по контракту, второго Product нет", async () => {
          const { groups, products } = await readProductGroup(store);
          expect(groups, "ProductGroup на странице").toHaveLength(1);
          expect(products, "корневых Product рядом").toHaveLength(0);
          expect(schemaIssues(TariffProductGroup, groups[0])).toEqual([]);
          group = groups[0] as TariffProductGroupT;
          expect(group.name).toBe(game);
        });

        await test.step("варианты = платные карточки: тариф, цена, имя «<игра> — <тариф> Plan»", async () => {
          const variants = group!.hasVariant;
          expect(variants.map((v) => [v.size, v.offers.price])).toEqual(paid.map((c) => [c.title, money(c.price)]));
          for (const v of variants) {
            expect.soft(v.name, `sku ${v.sku}`).toBe(`${game} — ${v.size} Plan`); // в разметке длинное тире
          }
          expect(new Set(variants.map((v) => v.sku)).size, "sku уникальны").toBe(variants.length);
        });
      },
    );
  }
});

test.describe("[storefront] тарифы для AI-ботов: ссылка ?plan= у посетителя", () => {
  test(
    "TC-TARIFFS-BOT-002 | ?plan=<id> из JSON-LD прокручивает к тарифу и выделяет его, неизвестный id ничего не выделяет",
    { tag: "@regression", annotation: { type: "issue", description: "DEV-604" } },
    async ({ page }) => {
      const store = new GameStorefrontPage(page);
      const { path } = TariffsForBots.pages[1]; // Bedrock: две группы, есть тариф ниже первого экрана
      await store.openLanding(path);
      const { groups } = await readProductGroup(store);
      const skus = (groups[0] as TariffProductGroupT).hasVariant.map((v) => v.sku);

      // Берём тариф, который без ?plan= не выделен (не «Most Popular»), иначе проверка ничего не докажет.
      const target = await store.lastUnhighlightedTariff(skus);
      test.skip(!target, "на странице все тарифы уже выделены как популярные - не с чем сравнить");

      await test.step(`?plan=${target}: карточка выделена и в окне`, async () => {
        await store.openLanding(`${path}?plan=${target}`);
        await expect.poll(() => store.tariffHighlightState(target!)).toEqual({ highlighted: true, inViewport: true });
      });

      await test.step("?plan=999999: этот тариф не выделен, страница работает", async () => {
        await store.openLanding(`${path}?plan=999999`);
        await expect.poll(async () => (await store.tariffHighlightState(target!)).highlighted).toBe(false);
      });
    },
  );
});
