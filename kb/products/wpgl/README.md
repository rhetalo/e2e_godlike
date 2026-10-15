---
id: WPGL
title: WPGL - витрина godlike.host (WordPress)
type: product-overview
product: WPGL
status: draft
updated: 2026-10-15
verified_on: null              # собрано из памяти, доков и карточек; у разделов свои даты recon
tickets: [DEV-400, DEV-402, DEV-455, DEV-458, DEV-459, DEV-532]
flags: [flash-sale]
tests: [tests/general/*.spec.ts, tests/funnels/*.spec.ts, tests/modded/*.spec.ts, tests/vps/funnel/*.spec.ts]
sources:
  - agents.docs/godlike-mcp-usage.md (03-Sep-2026)
  - agents.docs/QA_TEST_COVERAGE_AND_SPECS.md (срез 17-Jun-2026)
  - kb/_meta/inventory-2026-10-15.md §2
  - kb/tickets/DEV-400.md, DEV-402.md, DEV-455.md, DEV-458.md, DEV-459.md
  - memory: storefront-locale-coverage, prod-regressions-22jul, storefront-funnel-redesign-paused, inc6-calc-widget-migration,
    seed-modded-calculators, promo-action-monthly75, funnel-configure-bounce, funnel-serial-and-doc-drift, vps-funnel-restructure,
    dev400-modpack-funnel, dev455-free-server-gift, custom-modpack-setup-qa, modpack-constructor-trial-funnel, smp-oneclick-qa,
    launcher-landing-qa, kb-redesign-audit, playfreehost-landing-qa, whmcs-checkout-language
---

# WPGL - витрина godlike.host (WordPress)

> **В двух словах.** Это сайт godlike.host, где клиент выбирает игру и тариф и идёт в корзину. Он на
> WordPress, в 8 языках и 4 валютах. С витрины начинаются все воронки покупки: игровой сервер, модпак,
> сид, VPS, конструктор модпаков. Корзина и оплата уже в биллинге ([BIL](../bil/README.md)), а сервер
> потом живёт в игровой панели ([UP](../up/README.md)). Тесты гоняются на живом проде и до оплаты не доходят.

## Как устроено

| Что | Факт | Источник |
|---|---|---|
| Стек | WordPress, Polylang (8 языков), Yoast, WP Rocket, Cloudflare | inventory §2, godlike-mcp-usage |
| Типы записей | `post`, `page`, `ht_kb` (KB сайта), `modpacks`, `seed` | godlike-mcp-usage |
| Масштаб | ~2613 страниц, ~1800 берут title из шаблона Yoast | godlike-mcp-usage |
| Кеш | WP Rocket чистится кодом, Cloudflare - только руками. Правку HTTP-запросом не проверить: увидите кеш | godlike-mcp-usage |
| Аналитика | GTM + GA4 через sGTM `analytics.godlike.host`, Amplitude, FB, Reddit, RedTrack. Ecommerce-событий воронки (add_to_cart, begin_checkout) нет | memory dev400, smp-oneclick |
| MCP | `godlike-wp` пишет в прод, `godlike-wp-sql` - только чтение ([реестр MCP](../../registry/mcp-tools.md)) | godlike-mcp-usage |
| Stage | `stage.godlike.host` за Google-OAuth (там жил редизайн KB сайта); тесты идут на проде | memory kb-redesign-audit |

**Ключевые маршруты.** Каталог игр `/game-servers-en/`; корзина игры `/cart-game-servers/?productId=`; modded
`/modded-minecraft-server-hosting/` → `/cart-modded-new/`; сиды `/minecraft-seeds/`, корзина `/cart-seed`; мобильная корзина
`/mobile-cart`; VPS `/vps-hosting/` → `/cart-vps/`; конструктор `/custom-minecraft-modpacks-constructor/` → `/cart-modpack-constructor/`;
`/custom-modpack-setup/`, `/launcher/`, `/minecraft-smp/`, `/cart-free`.

## Карта разделов

| Раздел | Что это | Тикеты | Автотесты | Знания |
|---|---|---|---|---|
| Шапка, футер, навигация | Mega-menu игр с ценами (`.header-menu__subitem-game__captions-price`, с 23-Jul), legal и соц-ссылки, мобильное меню | - | `storefront.breadth`, `valid.links`, `smoke.pages` | ✅ |
| Языки и валюты | 8 языков URL-префиксом `/{code}/`, валюты USD / EUR / GBP / PLN в cookie | - | `locale` (LOC-001..003) | ✅ |
| CookieYes | Баннер `.cky-consent-container`, гасится `CookieBanner.dismissAll` | - | косвенно | ⚠️ поведение не описано |
| Страницы игр и каталог | ~34-38 игр ❓, тарифы в Vue-cart с 20-Aug | [DEV-402](../../tickets/DEV-402.md) | `games.valid.promo`, `games.invalid.promo`, `game-slider` | ⚠️ |
| KB сайта (`ht_kb`) | `/knowledgebase-en/`, редизайн проверен на stage 31-Aug | - | нет | ⚠️ |
| Блог | статьи в корне `/...-blog/`, не под `/blog/*` | [DEV-455](../../tickets/DEV-455.md) | нет | ❌ |
| Калькулятор modded | `<plan-calculator-widget>` в Shadow DOM (с 05-Aug), данные из panel API `/api/v2/minecraft/modpacks` | [DEV-532](../../tickets/DEV-532.md) | `slider.modded`, `modpack.config.modded` | ✅ |
| Калькулятор сида и Seed finder | одиночный сид в Shadow DOM (с 06-Aug); `/minecraft-seeds/` = Seed finder без корзины (с 02-Oct) | - | `slider.seed`, `seed-list.finder` | ✅ |
| Воронка игры | step 2 (биллинг) → Configure (локация, тип) → WHMCS | [DEV-402](../../tickets/DEV-402.md) | `funnel`, `registration-flow`, `login.validation` | ✅ |
| Воронка modded | `/cart-modded-new/` с `modpackId=<src>:<proj>:<file>`, 43 страницы модпаков | [DEV-400](../../tickets/DEV-400.md) | `cart.modded-new`, `funnel.modded` | ✅ |
| Воронка сида | `/cart-seed`, классическая Vue-cart | - | `funnel.seed` (1 тест) | ✅ |
| Мобильная корзина | `/mobile-cart`, 390×844, до выбора игры цена $0.00 | - | `funnel.mobile` | ✅ |
| VPS-воронка | `/vps-hosting/` (тогглы Performance × Service) → `/cart-vps/` → WHMCS | - | `vps.funnel.*` | ✅ ([VPS](../vps/README.md)) |
| Конструктор модпаков и trial | Dry-Run → демо-сервер на 3 часа → `/cart-modpack-constructor/` → trial | - | `funnel.modpack-constructor`, `modpack.constructor` | ⚠️ |
| Custom Modpack Setup | `/custom-modpack-setup/`, Lite / Pro, 4 входа | [DEV-458](../../tickets/DEV-458.md), [DEV-459](../../tickets/DEV-459.md) | нет | ✅ |
| Лендинги | Launcher `/launcher/` (черновик), SMP One-Click `/minecraft-smp/` (6 сборок), Modpack Program ❓ | - | нет | ⚠️ |
| PlayFreeHost | отдельный WP-сайт playfreehost.com, CTA на free-продукт 282 | [DEV-563](../../tickets/DEV-563.md) | нет | ⚠️ ([UP/free-servers](../up/free-servers.md)) |
| Промо | MONTHLY75/50, MODPACK50, VANILLA20 / COMMUNITY40, flash-sale, попап Free Server Gift | [DEV-400](../../tickets/DEV-400.md), [DEV-455](../../tickets/DEV-455.md) | `games.*.promo`, воронки | ✅ |

## Промо - как работает

| Промо | Механика | Источник |
|---|---|---|
| **MONTHLY75** (MONTHLY50 для AU) | флеш-акция на период 1 месяц: URL `sale-promo=MONTHLY75&sale-discount=75`; cookies `flashSaleEnabled/flashSalePromo/flashSaleEndTime`, отключение `flashSaleOptOut`. На 3 / 6 / 12 мес акции нет | memory promo-action-monthly75, dev400 |
| **Дефолтные коды** | VANILLA20 / COMMUNITY40 - разные по играм, одноразовые на продукт | memory promo-action-monthly75 |
| **MODPACK50** | таймер модпаков: localStorage `planCalculatorPromoExpiresAt` (~3 ч, обновляется на каждом визите) | [DEV-400](../../tickets/DEV-400.md) |
| **Flash-sale** | модалка `.flash-sale-modal__wrapper` («$1/GB Insane Sale»), A/B в Amplitude; акция `may_madness_2026` закончилась 08-Oct | memory vps-funnel-restructure, dev455 |
| **Free Server Gift** | попап на include-страницах → регистрация → `/cart-free?productId=282` → фришка в 2 клика + письма eSputnik | [DEV-455](../../tickets/DEV-455.md) |

## Правила и граничные случаи

1. **Язык чекаута не зависит от языка витрины** - его выбирает биллинг ([BIL](../bil/README.md#язык-чекаута)).
2. **Один слаг существует в 8 экземплярах** (по языку); промах по языку тихо уводит на чужую локаль. Источник: godlike-mcp-usage.
3. **У части VPS-тарифов нет периода 1 месяц** (Nitro 1 - только 3 / 6 / 12), скидка VPS20 уже в ценах.
4. **modpackId пишется по-разному:** Host Now сида - через двоеточия, BUY и листинг - через дефисы. В воронке modded - строго 3 сегмента через двоеточие, двоеточие не кодируется в `%3A`.
5. **Аноним в `/cart-modded-new/`** видит стену логина; цена, Total Due и Renews появляются только после выбора локации.
6. **USA-локация** выставляется по `ipapi.co`, который отдаёт 429.

## Не баг - так задумано

| Кажется багом | На самом деле | Источник |
|---|---|---|
| ~90 автотестов упали 20-Aug | намеренный редизайн стора и чекаута, тесты переписаны тимлидом | [DEV-402](../../tickets/DEV-402.md) |
| Нет 1 месяца у первого VPS-тарифа | так настроены тарифы | memory vps-funnel-restructure |
| CTA письма Free Gift ведёт на лендинг, а не в корзину | eSputnik не знает регион (282 EU / 1127 USA) | [DEV-455](../../tickets/DEV-455.md) |
| На странице модпака меньше трекеров, чем на калькуляторе | аналитику в DEV-400 не трогали | [DEV-400](../../tickets/DEV-400.md) |
| KB сайта без блока «Top/Pinned» | решение владельца | memory kb-redesign-audit |
| После SMP One-Click сервер offline | автостарта нет | memory smp-oneclick-qa |

## Гочи для тестирования

1. **Все воронки разом падают на «Review & Checkout»** - первым делом проверить язык биллинга аккаунта ([BIL](../bil/README.md#гочи-для-тестирования)).
2. **Смена валюты в headless не видна** ни при каком клике - LOC-003 структурный, нужен headed-прогон.
3. **Калькулятор сида и `/minecraft-seeds/` инициализируются лениво** - только после реального движения мыши (`page.mouse.move()` ×2).
4. **Shadow DOM:** `querySelectorAll` в `page.evaluate` его не пробивает, локаторы Playwright пробивают. Слайдер не искать по `role=slider`.
5. **Host Now сида в headless** уводит на `/cart-seed` в 1-2 случаях из 5 (с 06-Aug) - наблюдаем, не карантиним.
6. **`.first()` по классу хрупок** - на странице сида кнопка BUY = `#cartDefaultBtn`.
7. **Мигающий auth-block** в Vue-cart при валидной сессии - ждать URL `step=2` (12 с), логиниться, только если блок держится.
8. **Configure у modded отскакивает** step 3 → step 2 (~400 мс) - `advanceToPayment` ждёт `/clientarea/` с бюджетом 90 с.
9. **Промо при смене периода** сначала показывает success, потом может переключиться на «already been used» - ждать стабилизации, проверять на 3 мес.
10. **Акция нестабильна по окружениям:** пин Amplitude гасит её локально, но не на CI / UA-IP; сессия старше 3 ч - акции нет.
11. **Flash-sale модалка** вылезает даже под пином и перехватывает клики - гасится `CookieBanner.dismissAll()`.
12. **URL не сравнивать строго:** прод дописывает `?rtkcid=...` и параметры Amplitude.
13. **VPS-карточки брать только `:visible`** - скрытые группы тарифов есть в DOM.
14. **WP Rocket** откладывает JS до первого взаимодействия и может отдавать старый JS из minify-кеша ([DEV-455/B-1](../../tickets/DEV-455.md#находки)).
15. **Order Now и оплату не жать** - живой заказ.
16. **Воронки serial с общей сессией** (с 18-Jun): `funnel.mobile`, `vps.funnel.billing/configure`, `cart.modded-new`.
17. **Запись через MCP godlike-wp:** пустое SEO-поле удаляет оверрайд; пачка - через `plan_id`, до 50 объектов, план живёт 15 мин, до 60 вызовов в минуту.

## Пробелы

1. Modpack Program, блог, отзывы, партнёрка, ping, контакты - только названия.
2. CookieYes: режимы согласия не описаны.
3. Полный список страниц игр и структура меню не задокументированы.
4. Нет спеков на KB сайта, Launcher, SMP, PlayFreeHost, Custom Modpack Setup, Free Gift.
5. Открытые находки: SMP - событие `smp_build_cta_clicked` не доходит в Amplitude (24-Sep); дубли `og:title` / `og:image` (15-Jun);
   PlayFreeHost без GA / GTM и с мёртвым футером (10-Aug); таргетинг Free Gift только EN ([DEV-455/F-07](../../tickets/DEV-455.md#находки)).

## Что устарело в источниках

1. QA_TEST_COVERAGE §1.5 «funnel.seed ×3 входа» - сейчас 1 тест, CTA на `/minecraft-seeds/` удалён 02-Oct.
2. QA_TEST_COVERAGE §1.4 «калькулятор предлагает тариф» - калькулятор на `/minecraft-seeds/` удалён 02-Oct.
3. В доках ещё встречается монолит `vps.funnel.spec.ts` - разбит на `vps.funnel.{happy-path,configure,billing}`.
