---
id: WPGL/promo
title: Промо витрины - MONTHLY75, дефолтные коды, MODPACK50, flash-sale, Free Server Gift
type: feature
product: WPGL
status: draft
updated: 2026-10-18
verified_on: 2026-10-15        # Free Server Gift - QA закрыт 15-Oct; MONTHLY75 - recon 09-Jul
tickets: [DEV-400, DEV-455]
flags: [flash-sale]
tests: [tests/modded/games.valid.promo.spec.ts, tests/modded/games.invalid.promo.spec.ts, tests/funnels/funnel.mobile.spec.ts]
sources:
  - kb/products/wpgl/README.md (Промо - как работает, гочи 9-11)
  - kb/tickets/DEV-400.md, DEV-455.md
  - шапки tests/modded/games.valid.promo.spec.ts, games.invalid.promo.spec.ts; pages/GameStorefrontPage.ts
  - memory: promo-action-monthly75, dev455-free-server-gift
---

# Промо витрины - MONTHLY75, дефолтные коды, MODPACK50, flash-sale, Free Server Gift

> **В двух словах.** На витрине работают несколько механизмов скидок одновременно: флеш-акция MONTHLY75 на
> оплату за 1 месяц, одноразовые дефолтные коды (VANILLA20 / COMMUNITY40) на остальные периоды, таймер модпаков
> MODPACK50, модалка flash-sale и попап Free Server Gift с бесплатным сервером. Они пересекаются, поэтому
> состояние скидки зависит от периода, аккаунта, окружения и свежести сессии.

## Как работает (под капотом)

| Промо | Механика |
|---|---|
| **MONTHLY75** (MONTHLY50 для AU) | только на период **1 месяц**: URL корзины несёт `sale-promo=MONTHLY75&sale-discount=75`; cookies `flashSaleEnabled/flashSalePromo/flashSaleEndTime`, отключение `flashSaleOptOut` |
| **Дефолтные коды** | VANILLA20 / COMMUNITY40 - разные по играм, **одноразовые на продукт (тариф)**; действуют на 3 / 6 / 12 мес |
| **MODPACK50** | таймер модпаков в localStorage `planCalculatorPromoExpiresAt` (~3 ч, обновляется на визите) - [DEV-400](../../tickets/DEV-400.md) |
| **Flash-sale** | модалка `.flash-sale-modal__wrapper` («$1/GB Insane Sale»), A/B в Amplitude; акция `may_madness_2026` закончилась 08-Oct |
| **Free Server Gift** | попап на страницах → регистрация → второй попап → `/cart-free?productId=282` → бесплатный сервер в 2 клика + цепочка писем eSputnik - [DEV-455](../../tickets/DEV-455.md) |

Вердикт по промо в новой воронке - из ответа `api-cart.php?sync=<pid>&syncPromo=<code>`: `promoError` = null / not_found /
already_used, `promo.value` = процент скидки (комментарий в `GameStorefrontPage`).

## Правила и граничные случаи

1. На 1 месяц всегда MONTHLY75; на 3 / 6 / 12 акции нет - применяется дефолтный одноразовый код.
2. Свежий аккаунт: дефолтный код валиден на каждом тарифе. Аккаунт с израсходованными кодами: валиден только там,
   где разрешено правилом `expectPromoValid` в `fixtures/games.json`.
3. Мобильная корзина на 1 месяц прячет поле промокода за блоком «Promocode applied»; свой код молча отвергается.
4. Gift-попап уступает flash-sale модалке ([DEV-455/F-03](../../tickets/DEV-455.md#находки)).

## Не баг - так задумано

| Кажется багом | На самом деле | Источник |
|---|---|---|
| CTA письма Free Gift ведёт на лендинг, а не в корзину | eSputnik не знает регион (282 EU / 1127 USA) | [DEV-455](../../tickets/DEV-455.md) |
| Промо «already been used» на 3 месяцах | код одноразовый на продукт, аккаунт его уже потратил | memory promo-action-monthly75 |

## Гочи для тестирования

- **Акция нестабильна по окружениям:** пин Amplitude гасит её локально, но не на CI / UA-IP; сессия старше 3 ч - акции нет.
  Поэтому промо-тесты проверяют **3 месяца**, где поведение детерминировано.
- **Транзиент при смене периода:** сначала success, потом может стать «already been used» - ждать стабилизации.
- **Flash-sale модалка** вылезает даже под пином и перехватывает клики - гасится `CookieBanner.dismissAll()`.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Свежий аккаунт: промо активен на каждом тарифе каждой игры | `games.valid.promo.spec.ts` | ✅ |
| Израсходованный аккаунт: промо по правилу `expectPromoValid` | `games.invalid.promo.spec.ts` | ✅ |
| Мобильная корзина: невалидный промокод не меняет цену | `funnel.mobile.spec.ts` | ✅ |
| MONTHLY75 на 1 месяц | не покрыто (недетерминировано по окружениям) | ❌ |
| Free Server Gift: попапы, `/cart-free`, письма | только ручной QA [DEV-455](../../tickets/DEV-455.md) | ❌ авто нет |

## История

| Дата | Тикет | Что |
|---|---|---|
| 09-Jul-2026 | - | MONTHLY75 стал применяться всем на 1 месяц; промо-тесты переведены на 3 месяца |
| 20-Aug-2026 | [DEV-400](../../tickets/DEV-400.md) | MODPACK50 и модпак-воронка |
| 24-Sep..15-Oct-2026 | [DEV-455](../../tickets/DEV-455.md) | Free Server Gift, QA закрыт PASS-with-issues |
