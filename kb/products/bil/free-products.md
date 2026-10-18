---
id: BIL/free-products
title: Free-продукты и письма - бесплатные серверы, cart-free, цепочка eSputnik
type: feature
product: BIL
status: draft
updated: 2026-10-18
verified_on: 2026-10-15        # QA DEV-455 закрыт 15-Oct; free-продукты 282/1127 - DEV-563
tickets: [DEV-455, DEV-563, DEV-401]
flags: []
tests: []                      # спеков на free-продукты и письма нет
sources:
  - kb/products/bil/README.md (Free-продукты, Правило 1)
  - kb/tickets/DEV-455.md, DEV-563.md, DEV-401.md
  - memory: dev455-free-server-gift, dev563-free-egg-lock, playfreehost-landing-qa
---

# Free-продукты и письма - бесплатные серверы, cart-free, цепочка eSputnik

> **В двух словах.** В биллинге есть бесплатные тарифы: Free Minecraft (EU и USA) и парные free для удержания
> при отмене. Бесплатный сервер создаётся в два клика через `/cart-free` - из попапа Free Server Gift или с
> PlayFreeHost. Кто не создал сервер, получает цепочку писем eSputnik (Day 0..28).

## Где в интерфейсе

- `/cart-free?productId=282` → step 2 → сервер создаётся сразу; повторно - `free_server_exists`.
- PlayFreeHost ведёт на `free_start.php?product=282&config=529` ([PFH](../pfh/README.md)).
- Попап Free Server Gift на витрине ([WPGL/promo](../wpgl/promo.md)).

## Как работает (под капотом)

| Продукт | Что |
|---|---|
| 282 | Free Minecraft EU; попап Free Gift и PlayFreeHost |
| 1127 | Free Minecraft USA |
| 285, 286, 299, 316 | парные free для удержания: Unturned, Terraria, Core Keeper, Enshrouded ([BIL/services-cancellation](services-cancellation.md)) |

- Создание: `POST api-cart-free.php`. Статус и события попапа: `product_features.php?action=free_gift_status` / `free_gift_event`.
- **Письма:** аддон eSputnik, цепочка по событию `FreeServerGift` - Day 0 / 7 / 14 / 21 / 28 ([DEV-455](../../tickets/DEV-455.md)).
- В панели признак free - только `servers.free`, связи с продуктом WHMCS там нет ([UP/free-servers](../up/free-servers.md)).

## Правила и граничные случаи

1. `user_id` в `free_gift_status` = `tblusers.id`, а не client id из админки ([BIL/accounts](accounts.md)).
2. Free-слот аккаунта общий с удержанием при отмене (PROD-126) ❓.

## Не баг - так задумано

| Кажется багом | На самом деле | Источник |
|---|---|---|
| CTA письма Free Gift ведёт на лендинг, а не в корзину | eSputnik не знает регион (282 EU / 1127 USA) | [DEV-455](../../tickets/DEV-455.md) |

## Гочи для тестирования

- Бесплатный сервер создаётся сразу и занимает слот аккаунта - на общем аккаунте не плодить.
- Письма проверять на аккаунте с верифицированной почтой; Day 7 цепочки ожидался ~21-Oct ❓.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Free Gift: попапы, `/cart-free`, создание сервера, письма | только ручной QA [DEV-455](../../tickets/DEV-455.md) | ❌ авто нет |
| Free egg lock на 282 / 1127 | только ручной QA [DEV-563](../../tickets/DEV-563.md) | ❌ авто нет |
| Переход на парный free при отмене | только ручной QA [DEV-401](../../tickets/DEV-401.md) | ❌ авто нет |

## История

| Дата | Тикет | Что |
|---|---|---|
| 14-Aug-2026 | [DEV-401](../../tickets/DEV-401.md) | Парные free для удержания при отмене |
| 24-Sep..15-Oct-2026 | [DEV-455](../../tickets/DEV-455.md) | Free Server Gift и цепочка писем, QA закрыт |
| 15-Oct-2026 | [DEV-563](../../tickets/DEV-563.md) | Блокировка egg на free-продуктах |
