---
id: BIL
title: BIL - биллинг WHMCS (godlike.host/clientarea)
type: product-overview
product: BIL
status: draft
updated: 2026-10-15
verified_on: null              # собрано из памяти и карточек; БД биллинга через MCP пока недоступна
tickets: [DEV-401, DEV-455, DEV-458, DEV-459, TASK-tariff-list-400]
flags: []
tests: [tests/funnels/*.spec.ts, tests/general/registration-flow.spec.ts, tests/general/login.validation.spec.ts]
sources:
  - kb/_meta/inventory-2026-10-15.md §2
  - agents.docs/QA_TEST_COVERAGE_AND_SPECS.md §1.7, §2 (17-Jun-2026)
  - kb/tickets/DEV-401.md, DEV-455.md, DEV-458.md, TASK-tariff-list-400.md
  - memory: whmcs-checkout-language, storefront-funnel-redesign-paused, cancel-retention-dev401, cancel-retention-run-notes,
    dev455-free-server-gift, custom-modpack-setup-qa, modpack-constructor-trial-funnel, playfreehost-landing-qa, promo-action-monthly75
---

# BIL - биллинг WHMCS (godlike.host/clientarea)

> **В двух словах.** Биллинг - это WHMCS под адресом `godlike.host/clientarea/`: корзина и чекаут, оплата,
> личный кабинет с услугами и инвойсами, отмена и возврат подписки, бесплатные тарифы, письма. Витрина
> ([WPGL](../wpgl/README.md)) ведёт сюда покупку, а игровая ([UP](../up/README.md)) и VPS-панель ([VPS](../vps/README.md))
> берут отсюда тарифы и ссылаются на кабинет. Как продукт биллинг описан хуже всего: многое ниже - обрывки из задач.

## Как устроено

| Что | Факт | Источник |
|---|---|---|
| Движок | WHMCS; админка WHMCS с входом через Google SSO | memory dev455 |
| Чекаут | `/clientarea/cart.php?a=checkout`, H1 «Review & Checkout». Все payment-URL под `/clientarea/` | memory whmcs-checkout-language |
| Кабинет | `clientarea.php?action=productdetails&id=<id>`, `register.php`, `social_auth.php` | memory dev455, playfreehost |
| Кастомные эндпоинты | `api-cart.php`, `api-cart-free.php`; `product_features.php?action=trial \| modpack_setup_order \| free_gift_status \| free_gift_event`; `free_start.php?product=282&config=529` | карточки, memory |
| Аддоны | `modules/addons/godlike_ptero_server` (связь с панелью), аддон eSputnik | memory dev455 |
| Код | репо `billing` ([id-scheme](../../_meta/id-scheme.md#репозитории-кода-gitlab-gitgodlikeovh)), доступа у владельца пока нет | id-scheme |
| БД | через MCP недоступна, `godlike-billing-sql` ждёт подключения ([реестр MCP](../../registry/mcp-tools.md)) | memory project-docs |

**Связь с панелью.** Суффикс имени сервера `_NNNNNN` = ID услуги WHMCS; Upgrade в UP тянет тарифы
`GET /api/v2/tariffs-new/{service_id}/list` ([UP/upgrade](../up/upgrade.md)); «Request Cancellation» из кабинета открывает
модуль отмены в UP ([UP/cancel-module](../up/cancel-module.md)).

## Карта разделов

| Раздел | Что это | Тикеты | Автотесты | Знания |
|---|---|---|---|---|
| Корзина и чекаут | Vue-cart с 20-Aug-2026, блок авторизации `.auth-page` (email, Google, Discord, Twitch, Apple) | [DEV-402](../../tickets/DEV-402.md) | `funnel`, `login.validation`, `registration-flow` | ✅ |
| Язык чекаута | отдельно от витрины: по гео или настройке аккаунта | - | косвенно | ✅ |
| Оплата | Stripe (iframe), PayPal, Crypto (CoinPayments), кредитный баланс | - | `funnel.cart.paypal`, `funnel.with.credit.check` | ⚠️ |
| Кабинет: Product Details | страница услуги, Request Cancellation, «Cancel the cancellation» | [DEV-401](../../tickets/DEV-401.md) | нет | ⚠️ |
| Отмена и возврат подписки | Request Cancellation → модуль в UP; Resume subscription | [DEV-401](../../tickets/DEV-401.md) | нет | ⚠️ |
| Статусы услуги | Active, Paused, Suspended, terminated | [DEV-401](../../tickets/DEV-401.md), [DEV-563](../../tickets/DEV-563.md) | нет | ❌ |
| Free-продукты | 282 (EU), 1127 (USA), парные free для удержания | [DEV-455](../../tickets/DEV-455.md), [DEV-563](../../tickets/DEV-563.md) | нет | ⚠️ |
| Письма eSputnik | цепочка Free Gift Day 0..28 по событию `FreeServerGift` | [DEV-455](../../tickets/DEV-455.md) | нет | ⚠️ |
| Add-on Custom Modpack Setup | Lite = 1217, Pro = 1218, one-time | [DEV-458](../../tickets/DEV-458.md) | нет | ✅ |
| Trial конструктора модпаков | 3 ч → suspend → terminate через 72 ч | - | `funnel.modpack-constructor` (до сабмита) | ⚠️ |
| Тарифы и апгрейд | API `tariffs-new` для панели (сломан 09-Oct) | [TASK-tariff-list-400](../../tickets/TASK-tariff-list-400.md) | нет | ❌ |

## Язык чекаута

- Язык чекаута не зависит от `pll_language` витрины, его выбирает WHMCS по гео или по настройке аккаунта (08-Jul-2026).
- **Работает:** GET `?language=english` (сохраняется в сессии), настройка языка в аккаунте.
- **Игнорируется:** cookie `WHMCSUserLang`, заголовок Accept-Language.
- При украинском H1 = «Переглянути та замовити», валюта EUR.

## Оплата

- На чекауте не меньше 2 шлюзов. Crypto и PayPal - взаимоисключающие radio. Apply кредита скрывает шлюзы, skip показывает. Источник: QA_TEST_COVERAGE §1.7.
- Валюта (1 = USD, 6 = EUR) привязана к аккаунту и зависит от IP; поэтому итог на чекауте может отличаться от витрины ([DEV-458/F-TOTAL](../../tickets/DEV-458.md#находки)).
- На чекауте Custom Modpack Setup одна строка Total без разбивки на позиции - ограничение `ordersummary.tpl` ([DEV-458/F-SUMMARY](../../tickets/DEV-458.md#находки)).

## Статусы и переходы

| Сущность | Из | Событие | В | Источник |
|---|---|---|---|---|
| Услуга | Active | Request Cancellation | Active до конца периода + pending-флаг «Cancellation Requested», открывается support-тикет | [DEV-401](../../tickets/DEV-401.md) |
| Услуга | pending-отмена | «Cancel the cancellation» / Resume subscription (`POST .../reversal`) | Active без флага (`reverted_at` асинхронно) | [DEV-401](../../tickets/DEV-401.md) |
| Услуга | Active | пауза из модуля отмены (freeze) | Paused | [UP/cancel-module](../up/cancel-module.md) |
| Услуга | Active | «Continue With Free Plan» | парный free-продукт | [DEV-401](../../tickets/DEV-401.md) |
| Trial конструктора | активен | 3 ч без оплаты | Suspended → terminate через 72 ч | memory modpack-constructor-trial-funnel |

Активный или suspended trial блокирует новый: 409 «An active trial already exists for this client.»

## Free-продукты

| Продукт | Что | Источник |
|---|---|---|
| 282 | Free Minecraft EU; попап Free Gift и PlayFreeHost (`free_start.php?product=282&config=529`) | [DEV-455](../../tickets/DEV-455.md), memory playfreehost |
| 1127 | Free Minecraft USA | [DEV-563](../../tickets/DEV-563.md) |
| 285, 286, 299, 316 | парные free для удержания: Unturned, Terraria, Core Keeper, Enshrouded | [DEV-401](../../tickets/DEV-401.md) |

- Создание: `/cart-free?productId=282` → step 2 → `POST api-cart-free.php` сразу создаёт сервер; дальше `free_server_exists`.
- В панели признак free - только `servers.free`, связи с продуктом WHMCS там нет ([UP/free-servers](../up/free-servers.md)).

## Правила и граничные случаи

1. **`user_id` в `free_gift_status` = `tblusers.id`,** а `userid` в админке WHMCS - client id. Это разные числа.
2. **Request Cancellation жать через ~10 с после загрузки** страницы, иначе стартует старая отмена в биллинге.
3. **Скидка 30% в модуле отмены** требует неоплаченного инвойса (amount due > 0).
4. **На `register.php` нет поля маркетинг-согласия,** а аккаунты из попапа Free Gift получили «Opted Out from Marketing Emails» (13-Oct, ❓ не закрыто).
5. **PHP Fatal (memory 512 МБ)** в `clientarea.php` у одного нового аккаунта, хук `ClientAreaFooterOutputHook.php:38` (24-Sep, не воспроизводится 08-Oct).

## Не баг - так задумано

| Кажется багом | На самом деле |
|---|---|
| Язык чекаута не совпадает с языком сайта | язык выбирает WHMCS отдельно |
| После отмены статус Active | WHMCS держит услугу до конца оплаченного периода |
| Free-шаг удержания не показан | у тарифа нет парного free-продукта |
| NeoForge нет в заказе Custom Modpack Setup | так в каталоге конфиг-опций |

## Гочи для тестирования

1. **Все воронки падают на «Review & Checkout» разом** - проверить язык биллинга аккаунта (детерминированно, ретрай не спасёт).
   Страховка: проверять «дошли до чекаута» без языка - URL `cart.php?a=checkout` + `.order-summary` / `#checkout`.
2. **Оплату на проде не подтверждаем.** Исключение - покупки с кредитного баланса, санкционированные владельцем (`funnel.with.credit.check`).
3. **Закрытие модалки отмены после экрана reason = реальная отмена.** Откат - «Cancel the cancellation» в кабинете.
4. **Капча WHMCS** в окне Playwright отбивает первую отправку формы.
5. **Валюта и промо зависят от аккаунта** - суммы сверять на чистом аккаунте.
6. **Сабмит trial конструктора не проверяем** - флакает (редирект на productdetails или 409).

## Пробелы

1. Жизненный цикл услуги, инвойсы, продление, кредит, Paused и Suspended вне trial - не описаны.
2. Stripe iframe: поведение и селекторы.
3. Тарифы и апгрейд со стороны WHMCS; судьба бага `tariffs-new` ([TASK-tariff-list-400](../../tickets/TASK-tariff-list-400.md)).
4. Нет спеков на кабинет (productdetails, отмена, resume), письма, add-ons, free-продукты.
5. Хвосты: письмо Custom Modpack Setup после оплаты ([DEV-458/F-EMAIL](../../tickets/DEV-458.md#находки)), имена событий resume-баннера,
   Day 7 цепочки Free Gift (~21-Oct), висит ли отмена [srv:43ae756d](../../registry/test-servers.md#43ae756d) в WHMCS.
