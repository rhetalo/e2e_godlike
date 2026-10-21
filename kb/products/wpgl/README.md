---
id: WPGL
title: WPGL - витрина godlike.host (WordPress)
type: product-overview
product: WPGL
status: draft
updated: 2026-10-18
verified_on: 2026-10-15        # меню, каталог игр, языки, валюты, корзины, sitemap - live recon; остальное из памяти и доков
tickets: [DEV-400, DEV-402, DEV-455, DEV-458, DEV-459, DEV-532]
flags: [flash-sale]
tests: [tests/general/*.spec.ts, tests/funnels/*.spec.ts, tests/modded/*.spec.ts, tests/vps/funnel/*.spec.ts]
sources:
  - live recon 15-Oct-2026: MCP godlike-wp (link_inventory, funnel_get, sitemap_inventory) + Claude Browser на /game-servers-en/
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
| Масштаб | sitemap 15-Oct: 3143 URL - page 501, post (блог) 436, ht_kb 745, seed 1129, modpacks 45, server 34, категории и таксономии остальное; ~1800 страниц берут title из шаблона Yoast | sitemap_inventory, godlike-mcp-usage |
| Кеш | WP Rocket чистится кодом, Cloudflare - только руками. Правку HTTP-запросом не проверить: увидите кеш | godlike-mcp-usage |
| Аналитика | GTM + GA4 через sGTM `analytics.godlike.host`, Amplitude, FB, Reddit, RedTrack. Ecommerce-событий воронки (add_to_cart, begin_checkout) нет | memory dev400, smp-oneclick |
| MCP | `godlike-wp` пишет в прод, `godlike-wp-sql` - только чтение ([реестр MCP](../../registry/mcp-tools.md)) | godlike-mcp-usage |
| Stage | `stage.godlike.host` за Google-OAuth (там жил редизайн KB сайта); тесты идут на проде | memory kb-redesign-audit |

**Ключевые маршруты.** Каталог игр `/game-servers-en/`; корзина игры `/cart-game-servers/?productId=`; modded
`/modded-minecraft-server-hosting/` → `/cart-modded-new/`; сиды `/minecraft-seeds/`, корзина `/cart-seed`; мобильная корзина
`/mobile-cart`; VPS `/vps-hosting/` → `/cart-vps/`; конструктор `/custom-minecraft-modpacks-constructor/` → `/cart-modpack-constructor/`;
`/custom-modpack-setup/`, `/launcher/`, `/minecraft-smp/`, `/cart-free`.

## Карта разделов

| Раздел | Что это | Тикеты | Автотесты | Знания и страница |
|---|---|---|---|---|
| Шапка, футер, навигация | см. [Шапка и меню](#шапка-и-меню-live-15-oct) | - | `storefront.breadth`, `valid.links`, `smoke.pages` | ✅ [WPGL/header-navigation](header-navigation.md) |
| Языки и валюты | 8 языков URL-префиксом `/{code}/`; **21 валюта** в cookie, по умолчанию по IP (live 15-Oct) | - | `locale` (LOC-001..003, все 21 валюта) | ✅ [WPGL/locale-currency](locale-currency.md) |
| CookieYes | Баннер `.cky-consent-container`, гасится `CookieBanner.dismissAll` | - | косвенно | ⚠️ поведение не описано |
| Страницы игр и каталог | сетка каталога ~46 карточек с фильтрами (ведут в корзину) + SEO-список «List of games» на 20 ссылок; 46 лендингов (см. [Игры](#игры-live-15-oct-исправлено-16-oct)); тарифы в Vue-cart с 20-Aug | [DEV-402](../../tickets/DEV-402.md) | `games.valid.promo`, `games.invalid.promo`, `game-slider` | ✅ [WPGL/games-catalog](games-catalog.md) |
| Кастомайзер тарифа игры | Customize server: слайдеры Slots, RAM, Days, синхронизация Slots ↔ RAM | - | `game-slider` | ✅ [WPGL/game-customizer](game-customizer.md) |
| Витрина серверов игроков | `/servers/` - 34 сервера игроков, фильтры по тегам, версиям, лоадерам, режимам (тип записи `server`) | - | нет | ⏸ отложено владельцем 15-Oct [WPGL/landings](landings.md) |
| Каталог схематик | `/minecraft-schematics/`: подборки, фильтры версия / формат / свои группы, модалка, скачивание; пока только stage | [DEV-566](../../tickets/DEV-566.md) | нет | ⚠️ [WPGL/schematics](schematics.md) |
| Инструменты Minecraft | Seed Map `/minecraft-seed-map/`, Circle Generator, Skin Editor `/minecraft-skin-editor/` | - | нет | ❌ |
| KB сайта (`ht_kb`) | `/knowledgebase-en/`, редизайн проверен на stage 31-Aug | - | нет | ⚠️ [WPGL/landings](landings.md) |
| Блог | статьи в корне `/...-blog/`, не под `/blog/*` | [DEV-455](../../tickets/DEV-455.md) | нет | ❌ |
| Калькулятор modded | `<plan-calculator-widget>` в Shadow DOM (с 05-Aug), данные из panel API `/api/v2/minecraft/modpacks` | [DEV-532](../../tickets/DEV-532.md) | `slider.modded`, `modpack.config.modded` | ✅ [WPGL/modded-calculator](modded-calculator.md) |
| Калькулятор сида и Seed finder | одиночный сид в Shadow DOM (с 06-Aug); `/minecraft-seeds/` = Seed finder без корзины (с 02-Oct) | - | `slider.seed`, `seed-list.finder` | ✅ [WPGL/seeds](seeds.md) |
| Воронка игры | step 2 (биллинг) → Configure (локация, тип) → WHMCS | [DEV-402](../../tickets/DEV-402.md) | `funnel`, `registration-flow`, `login.validation` | ✅ [WPGL/game-funnel](game-funnel.md) |
| Воронка modded | `/cart-modded-new/` с `modpackId=<src>:<proj>:<file>`, 43 страницы модпаков | [DEV-400](../../tickets/DEV-400.md) | `cart.modded-new`, `funnel.modded` | ✅ [WPGL/modded-funnel](modded-funnel.md) |
| Воронка сида | `/cart-seed`, классическая Vue-cart | - | `funnel.seed` (1 тест) | ✅ [WPGL/seeds](seeds.md) |
| Мобильная корзина | `/mobile-cart`, 390×844, до выбора игры цена $0.00 | - | `funnel.mobile` | ✅ [WPGL/mobile-cart](mobile-cart.md) |
| VPS-воронка | `/vps-hosting/` (тогглы Performance × Service) → `/cart-vps/` → WHMCS | - | `vps.funnel.*` | ✅ ([VPS](../vps/README.md)) |
| Конструктор модпаков и trial | Dry-Run → демо-сервер на 3 часа → `/cart-modpack-constructor/` → trial | - | `funnel.modpack-constructor`, `modpack.constructor` | ⚠️ [WPGL/modpack-constructor](modpack-constructor.md) |
| Custom Modpack Setup | `/custom-modpack-setup/`, Lite / Pro, 4 входа | [DEV-458](../../tickets/DEV-458.md), [DEV-459](../../tickets/DEV-459.md) | нет | ✅ [WPGL/custom-modpack-setup](custom-modpack-setup.md) |
| Лендинги | Launcher `/launcher/` (черновик), SMP One-Click `/minecraft-smp/` (6 сборок), Modpack Program ❓ | - | нет | ⚠️ [WPGL/landings](landings.md) |
| PlayFreeHost | отдельный WP-сайт playfreehost.com - свой обзор [PFH](../pfh/README.md) | [DEV-563](../../tickets/DEV-563.md) | нет | ✅ |
| Промо | MONTHLY75/50, MODPACK50, VANILLA20 / COMMUNITY40, flash-sale, попап Free Server Gift | [DEV-400](../../tickets/DEV-400.md), [DEV-455](../../tickets/DEV-455.md) | `games.*.promo`, воронки | ✅ [WPGL/promo](promo.md) |

## Шапка и меню (live 15-Oct)

Шапка (EN), пункты верхнего уровня и что внутри. Источник: MCP `link_inventory` + страница `/game-servers-en/`.

| Пункт | Содержимое |
|---|---|
| Host now | кнопка в корзину |
| Minecraft Server Hosting | Minecraft Java Servers `/minecraft-java-servers-hosting/`, Modded Minecraft Servers |
| Game servers | Minecraft Bedrock, Vintage Story, Palworld, Terraria, ARK - с ценой «Starting at ...»; «More Games / View all games» → `/game-servers-en/` |
| PRO Hosting | VPS Hosting `/vps-hosting/`, Dedicated Hosting `/dedicated-server-hosting/`, Gaming VPS `/gaming-vps/` |
| More | Partnership, Minecraft Seeds, Minecraft Seed Map, Minecraft Circle Generator, Knowledge Base, Vacancies, Blog, Godlike Launcher |
| Admin Panels | Billing Panel (`/clientarea/`), Game Panel (ultra.panel), VPS Panel (vf-panel), Affiliate panel (`panel-affiliate.godlike.host`) |
| Язык и валюта | «en \| UAH»: 8 языков, 21 валюта |

- **Футер (EN):** Modded, главная, Seeds, Seed Map, конструктор модпаков, Circle Generator, Skin Editor, страницы игр (Vintage Story, Palworld, ARK, Terraria, Rust), About panel, вход в биллинг и панель, Ping, Discord, тикет в поддержку, Our team, About, Reviews, Contact us.
- **Меню хранится в двух местах:** конструктор меню темы (опции `_crb_header_menu_*_<locale>`) и меню WordPress (main_nav, right_nav, footer_nav_1..4) как запасной вариант для языка, где конструктор пуст. Ссылки, зашитые в файлы темы, правятся только деплоем.
- **Опции меню заведены для 22 локалей** (bg, ca, cs, da, nb, sv, ja ...), но на сайте `hreflang` только 8: en, uk, es, de, pl, fr, pt, it. Остальные - заготовки ❓.

**Валюты (live 15-Oct, 21):** USD, GBP, PLN, EUR, INR, MXN, AUD, CAD, PHP, BRL, ARS, COP, CLP, PEN, IDR, VND, MYR, PKR, TRY, SAR, UAH.
По умолчанию выбирается по IP (из Украины - UAH).

## Игры (live 15-Oct, исправлено 16-Oct)

⚠️ **Исправление 16-Oct-2026.** 15-Oct блок «List of games» (20 ссылок) ошибочно назван сеткой каталога. На `/game-servers-en/`
**два разных блока** (нашёл родной Playwright Planner, перепроверено в браузере 16-Oct):

| Блок | Что это | Куда ведёт клик | Покрытие |
|---|---|---|---|
| **Сетка каталога** `.games__wrapper` / `.games__block` | ~46 карточек (по Planner; в проверке 16-Oct видно 44 названия), фильтры **View All / PC / Mobile / Console**, поиск, пагинация; карточки рисует JS | прямо в корзину `/cart-game-servers/?productId=N&billingCycle=monthly` (JS-обработчик, `<a>` только у 3 карточек: Modded Minecraft, Dedicated, Gaming VPS) | ❌ тестов нет |
| **«List of games»** - SEO-текст во вкладке (`li[data-tab=3]`, `.seotext__body a`) | 20 ссылок | на лендинг игры (Minecraft - на главную) | ✅ `tests/general/games.catalog.spec.ts` |

- В сетке есть и игры, которые 15-Oct записаны как «только лендинг»: Hytale, Project Zomboid, DayZ, Soulmask, Squad, V Rising, Core Keeper,
  Enshrouded, Satisfactory и др., плюс **Arma Reforger** и **RedM**. То, что карточка ведёт в корзину, а не на лендинг, согласуется с
  [DEV-402](../../tickets/DEV-402.md) и комментарием в `GameStorefrontPage` («у карточки нет href, остался onclick в воронку»).
- **Лендингов игр в sitemap - 46** (`*-server-hosting`, без VPS, Dedicated и 7 языковых копий YouTube-лендинга), все отвечают 200 (15-Oct).
  Какие из них не попали в сетку (кандидаты: GTA 5 Alt:V, GTA 5 RageMP, CS: Source, RimWorld Together, SCP: Secret Laboratory) - ❓ сверить поштучно.
- **Открытые вопросы из плана Planner** (`specs/games-catalog-native.md`): у поиска без совпадений нет текста пустого состояния; на странице 3-5
  ошибок консоли на загрузку (не разбирались); фильтр Console пустой - 0 карточек, Mobile - 5 (Generator, 16-Oct).
- **Наблюдение (SEO):** у 4 страниц в `<title>` задвоено «Server Servers» - Abiotic Factor, Path of Titans, Project Zomboid, V Rising.

## Корзины (funnel-страницы)

На сайте 23 страницы-корзины (MCP `funnel_get`, 15-Oct). Блок тарифов ведёт в корзину по шаблону страницы; явная привязка группы тарифов есть только у 2 групп из ~370 (YouTube-эксперимент GrowthBook → `cart-youtube`).

| Корзина | Шаблон | Что это |
|---|---|---|
| `cart-game-servers` | cart-game-servers.php | игры, новый Vue-cart ([DEV-402](../../tickets/DEV-402.md)) |
| `cart-modded-new`, `cart-modpack` | cart-modpack.php | модпаки ([DEV-400](../../tickets/DEV-400.md)) |
| `cart-modpack-constructor` | cart-modpack-constructor.php | конструктор и trial |
| `cart-seed`, `cart`, `cart-eu`, `cart-modded`, `cart-admitad`, `hytale-cart` | cart.php | классическая Vue-cart |
| `cart-eu-new` | cart-eu-new.php | ❓ |
| `mobile-cart` | cart-mobile.php | мобильная |
| `cart-vps`, `vps-cart-preinstall` | cart_vps2.php | VPS |
| `cart-game` | cart_vps3.php | ❓ |
| `cart-dedicated` | cart_dedicated_v2.php | выделенные серверы |
| `cart-free` | cart_free.php | бесплатный сервер ([BIL](../bil/README.md#free-продукты)) |
| `cart-main`, `cart-year`, `cart-youtube` | свои шаблоны | главная, годовая оплата, YouTube-эксперимент |
| `minecraft-server-hosting-cart`, `ark-survival-*-server-hosting-offer` | storefront-cart*.php | одношаговые офферы |

Какие корзины живые, а какие остались от экспериментов - ❓, разбор отложен владельцем (15-Oct).

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

1. Modpack Program, блог, отзывы, партнёрка, ping, контакты, каталог серверов игроков `/servers/`, Gaming VPS, Dedicated - только названия.
2. CookieYes: режимы согласия не описаны.
3. Полный список страниц игр и структура меню не задокументированы.
4. Нет спеков на KB сайта, Launcher, SMP, PlayFreeHost, Custom Modpack Setup, Free Gift.
5. Открытые находки: SMP - событие `smp_build_cta_clicked` не доходит в Amplitude (24-Sep); дубли `og:title` / `og:image` (15-Jun);
   PlayFreeHost без GA / GTM и с мёртвым футером (10-Aug); таргетинг Free Gift только EN ([DEV-455/F-07](../../tickets/DEV-455.md#находки)).

## Что устарело в источниках

0. **Валюты:** память и тест LOC-003 знали 4 (USD / EUR / GBP / PLN), на сайте 15-Oct их 21. Тест исправлен 15-Oct: список в `fixtures/test-data.ts` → `StorefrontCurrencies`.

1. QA_TEST_COVERAGE §1.5 «funnel.seed ×3 входа» - сейчас 1 тест, CTA на `/minecraft-seeds/` удалён 02-Oct.
2. QA_TEST_COVERAGE §1.4 «калькулятор предлагает тариф» - калькулятор на `/minecraft-seeds/` удалён 02-Oct.
3. В доках ещё встречается монолит `vps.funnel.spec.ts` - разбит на `vps.funnel.{happy-path,configure,billing}`.
