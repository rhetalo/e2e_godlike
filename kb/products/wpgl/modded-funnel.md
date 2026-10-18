---
id: WPGL/modded-funnel
title: Воронка modded - cart-modded-new и страницы модпаков
type: feature
product: WPGL
status: draft
updated: 2026-10-18
verified_on: 2026-08-20        # QA DEV-400: 18/18 AC PASS
tickets: [DEV-400]
flags: []
tests: [tests/modded/cart.modded-new.spec.ts, tests/modded/funnel.modded.spec.ts]
sources:
  - шапки tests/modded/cart.modded-new.spec.ts, funnel.modded.spec.ts
  - kb/tickets/DEV-400.md; kb/products/wpgl/README.md (Правила 4-5, гоча 8)
  - memory: seed-modded-calculators, funnel-configure-bounce, dev400-modpack-funnel
---

# Воронка modded - cart-modded-new и страницы модпаков

> **В двух словах.** Покупка сервера с модпаком. С калькулятора (**Host Now**) и с 43 страниц модпаков клиент
> попадает в новую корзину `/cart-modded-new/` с уже выбранными модпаком и тарифом, меняет там тариф, период и
> локацию тремя выпадающими списками и жмёт **Order Now**. Старый путь через кнопку Install в сетке идёт в
> классическую Vue-корзину и дальше на чекаут WHMCS.

## Где в интерфейсе

- `/cart-modded-new/` - три custom-select: план (Slots), биллинг (Month), локация; итог, **Order Now** (`.form__button--primary`).
- Install в сетке modded → `/cart` (классическая Vue) → auth → step 2 → WHMCS.

## Как работает (под капотом)

- `modpackId=<источник>:<проект>:<файл>` - строго 3 сегмента через двоеточие, двоеточие не кодируется в `%3A`.
- Все 43 страницы модпаков ведут в `cart-modded-new` с тарифом 4GB ([DEV-400](../../tickets/DEV-400.md)).

## Правила и граничные случаи

1. **Аноним** в `/cart-modded-new/` видит стену логина; цена, Total Due и Renews появляются только после выбора локации.
2. **modpackId пишется по-разному:** Host Now сида - через двоеточия, BUY и листинг - через дефисы ([DEV-400/F1](../../tickets/DEV-400.md#находки)).
3. **USA-локация** выставляется по `ipapi.co`, который отдаёт 429.

## Не баг - так задумано

| Кажется багом | На самом деле | Источник |
|---|---|---|
| На странице модпака меньше трекеров, чем на калькуляторе | аналитику в DEV-400 не трогали | [DEV-400](../../tickets/DEV-400.md) |

## Гочи для тестирования

- `/cart-modded-new/` - **не** `CartPage`, у неё свой PO `CartModdedNewPage`.
- Serial по одному конфигуратору; тест смены плана (default → Godlike) идёт раньше остальных.
- **Configure у modded отскакивает** step 3 → step 2 (~400 мс) - `advanceToPayment` ждёт `/clientarea/` с бюджетом 90 с.
- Order Now не жать - живой заказ.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Дропдауны и Order Now видны | `cart.modded-new.spec.ts` | ✅ |
| Смена плана / биллинга пересчитывает цену, смена локации | `cart.modded-new.spec.ts` | ✅ |
| Install → корзина → step 2 → чекаут WHMCS | `funnel.modded.spec.ts` | ✅ |
| Host Now калькулятора → `/cart-modded-new` с выбранным тарифом | `funnel.modded.spec.ts` | ✅ |
| 43 страницы модпаков → верный modpackId | только ручной QA [DEV-400](../../tickets/DEV-400.md) | ❌ авто нет |

## История

| Дата | Тикет | Что |
|---|---|---|
| 13-Jun-2026 | - | Покрыта `/cart-modded-new` (`CartModdedNewPage`) |
| 20-Jul-2026 | - | Найден отскок Configure, фикс `advanceToPayment` |
| 20-Aug-2026 | [DEV-400](../../tickets/DEV-400.md) | Страницы модпаков ведут в `cart-modded-new`, QA PASS |
