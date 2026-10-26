---
id: BIL/checkout
title: Чекаут WHMCS - Review & Checkout и язык чекаута
type: feature
product: BIL
status: draft
updated: 2026-10-26
verified_on: 2026-07-08        # язык чекаута доказан recon + node-пробником
tickets: [DEV-546, DEV-576]
flags: []
tests:
  - tests/funnels/funnel.spec.ts
  - tests/funnels/funnel.seed.spec.ts
  - tests/modded/funnel.modded.spec.ts
  - tests/vps/funnel/vps.funnel.happy-path.spec.ts
sources:
  - kb/products/bil/README.md (Как устроено, Язык чекаута, гоча 1)
  - memory: whmcs-checkout-language, funnel-configure-bounce
---

# Чекаут WHMCS - Review & Checkout и язык чекаута

> **В двух словах.** Все воронки витрины (игра, modded, сид, VPS) заканчиваются одной страницей биллинга -
> чекаутом WHMCS «Review & Checkout», где клиент видит итог и выбирает оплату ([BIL/payments](payments.md)).
> Язык этой страницы выбирает биллинг, а не сайт: из-за этого однажды упали все воронки разом.

## Где в интерфейсе

- `godlike.host/clientarea/cart.php?a=checkout`, H1 **«Review & Checkout»** (на украинском - «Переглянути та замовити»).
- Итог (`.order-summary` / `#checkout`), способы оплаты, кнопка подтверждения.
- Все payment-URL живут под `/clientarea/`.

## Как работает (под капотом)

- **Язык чекаута не зависит от `pll_language` витрины** - WHMCS выбирает его по гео или по настройке языка аккаунта.
- **Работает:** GET `?language=english` (сохраняется в сессии), настройка языка в аккаунте.
- **Игнорируется:** cookie `WHMCSUserLang`, заголовок Accept-Language, локаль браузерного контекста.
- При украинском языке валюта показывается EUR.

## Правила и граничные случаи

1. Путь до чекаута идёт через шаг Configure (локация, тип) - у части воронок он «созревает» не сразу ([WPGL/game-funnel](../wpgl/game-funnel.md)).
2. Итог на чекауте может отличаться от витрины: валюта и промо привязаны к аккаунту ([BIL/payments](payments.md)).

## Не баг - так задумано

| Кажется багом | На самом деле | Источник |
|---|---|---|
| Язык чекаута не совпадает с языком сайта | язык выбирает WHMCS отдельно | memory whmcs-checkout-language |

## Гочи для тестирования

- **Все воронки разом падают на «Review & Checkout»** - почти наверняка язык биллинга аккаунта. Детерминированно, ретрай не спасёт.
  08-Jul-2026 корень был в том, что язык биллинга вручную сменили на украинский; фиксов в тестах не делали.
- Страховка от языка, если понадобится: проверять «дошли до чекаута» по URL `cart.php?a=checkout` + `.order-summary` / `#checkout`, а не по тексту H1.
- Подтверждение оплаты не жать (кроме санкционированного кредитного кейса).

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Игровая воронка доходит до чекаута | `funnel.spec.ts` | ✅ |
| Сид-воронка доходит до чекаута | `funnel.seed.spec.ts` | ✅ |
| Modded-воронка доходит до чекаута, шлюзы видны | `funnel.modded.spec.ts` | ✅ |
| VPS-воронка доходит до чекаута | `vps.funnel.happy-path.spec.ts` | ✅ |
| Чекаут на другом языке аккаунта | не покрыто (ассерты по английскому H1) | ❌ |
| Блок Boost your server (QA-превью под флагом) | только ручной QA [DEV-546](../../tickets/DEV-546.md), покрыть после интеграции Boost | ❌ авто нет |

## История

| Дата | Тикет | Что |
|---|---|---|
| 08-Jul-2026 | - | Все воронки упали из-за языка биллинга, механика языка доказана recon |
| 20-Jul-2026 | - | `advanceToPayment` ждёт `/clientarea/` вместо счёта кликов |
| 16..19-Oct-2026 | [DEV-546](../../tickets/DEV-546.md) | Блок «Boost your server» на чекауте v2, только UI и QA-превью под флагом (опции в заказ не идут). PASS после billing!736 |
| 26-Oct-2026 | [DEV-576](../../tickets/DEV-576.md) | Checkout v2: «Your plan» без разовой настройки модпака в месячной цене (billing!739). PASS на проде |
