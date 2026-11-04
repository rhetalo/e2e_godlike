---
id: WPGL/tariffs-for-bots
title: Тарифы для AI-ботов - серверные карточки и JSON-LD ProductGroup
type: feature
product: WPGL
status: verified
updated: 2026-11-04
verified_on: 2026-11-04        # prod, wp!750/751/755/783
tickets: [DEV-604]
flags: [flash-sale]
tests: [tests/general/tariffs.for-bots.spec.ts]
sources:
  - kb/tickets/DEV-604.md
  - MR wp!750, !751, !755, !783 (код inc/tariffs-ssr.php, inc/tariffs-schema.php, template-parts/storefront/game-tariffs-*.php)
  - memory: dev604-tariffs-ssr-productgroup
---

# Тарифы для AI-ботов - серверные карточки и JSON-LD ProductGroup

> **В двух словах.** На страницах игр блок тарифов (`GameTariffsNewGroup`) теперь приходит с сервера текстом, а Vue заменяет его при
> загрузке. Бот без JS видит название тарифа, слоты · RAM, цену и обычную цену. В JSON-LD страницы один `ProductGroup`: игра = группа,
> тариф = вариант со своей ценой и ссылкой `?plan=<id>`. Посетитель с JS видит прежний блок.

## Где в интерфейсе
- Все страницы с шаблоном `storefront*.php` и блоком «Тарифи (new)»: 156 slug на 04-Nov-2026 (120 индексируемых), включая локали.
- Без JS (DevTools → Disable JavaScript) или исходник страницы: `<div class="storefront__tariffs-ssr">` внутри
  `[data-vue-component="GameTariffsNewGroup"]`, карточки `li.storefront__tariffs-ssr__card`.
- С JS серверных карточек в DOM нет (0), Vue-карточки `.storefront__tariff[data-tariff-id]`.

## Как работает (под капотом)
- Цена карточки - `godlike_tariff_card_price()` (PHP-копия формулы Vue, округление `floor(x+0.5)` как `Math.round`); промо и скидка
  из настроек группы, перебиваются cookie `WHMCSPromoCode` / `WHMCSDiscount`.
- Валюта - cookie `currencyId`; сервер уважает её только вместе с `currency_manual=1`, иначе гео по IP.
- JSON-LD собирается вариантами из всех групп страницы и печатается одним `<script>` в `wp_footer`. Имя группы -
  `glr_theme_game_label(slug)` + « Server Hosting», `description` = meta description Yoast, `productGroupID` = slug игры.
- Страница со своим Product в поле Schema JSON (годовые лендинги, minecraft2/3/5-java) ProductGroup не получает.

## Правила и граничные случаи

| Ситуация | Серверная карточка | JSON-LD |
|---|---|---|
| Обычный тариф | цена `$X / Monthly`, `Regular price: $Y · −N%`, First Purchase Discount, кнопка | вариант с `price` = большая цена карточки, `unitCode MON` |
| Custom | только название и диапазон слотов / RAM | нет |
| Персональная (evergreen) акция | строка «Flash Sale: −N%» без даты, цены по акции, в ссылке корзины `sale-promo` / `sale-discount` | цена по акции, без `validFrom` / `priceValidUntil` |
| Глобальная акция | «Flash Sale: −N% · Ends <дата> UTC», формат даты - Polylang-строка `F j, Y H:i` | `validFrom` / `priceValidUntil` из настроек |
| Годовой лендинг, cart-секции | серверной разметки нет | свой Product страницы |
| `?plan=<sku>` | - | вариант `offers.url`; Vue прокручивает и обводит карточку |

## Не баг - так задумано
| Ожидание | Как на самом деле | Почему |
|---|---|---|
| Add to Cart без JS открывает корзину | `href="#"`, переход только через `onclick` | краулеры не должны ходить в корзину (wp!751) |
| Цены в HTML в USD | гео-валюта, бот из США получает USD | как у посетителя |
| На Modded-хабе тарифы текстом | Plan Calculator без JS пустой, в Schema JSON только `AggregateOffer` | другой компонент, DoD «де є такі блоки» |

## Гочи для тестирования
- Смотреть как бот: `curl -A "GPTBot/1.0" -H "Cookie: currencyId=1; currency_manual=1"`; XSS в `?promo=` режет Cloudflare WAF.
- Акция у UA/PL не выдаётся, гео по реальному IP (cookie `user_country_code` перезаписывается) - нужен VPN; Rich Results Test заходит из
  США и видит акцию.
- Профиль с платной панелью несёт cookie `flashSaleOptOut=paid_panel` - акцию смотреть в чистом контексте.
- Rich Results «Просмотреть проверенную страницу» отдаёт HTML после JS: серверных карточек там уже нет.
- Тип акции берётся из `crb_flash_sale_type_<lang>`; на 04-Nov все 8 активных языков `evergreen`.

## Покрытие
`tests/general/tariffs.for-bots.spec.ts`: TC-TARIFFS-BOT-001 (8 страниц глазами бота: карточки + ProductGroup = карточки), TC-TARIFFS-BOT-002 (`?plan=` у посетителя). Не покрыто: акция (по IP), локали, Rich Results. Подробно - [DEV-604](../../tickets/DEV-604.md#регресс).

## История
- 28-Oct-2026 [DEV-604](../../tickets/DEV-604.md) wp!750 - серверные карточки; 29-Oct wp!751 - кнопка корзины через onclick.
- 03-Nov-2026 wp!755 - ProductGroup, `?plan=`; 04-Nov wp!783 - подписи игр, без даты у персональной акции.
