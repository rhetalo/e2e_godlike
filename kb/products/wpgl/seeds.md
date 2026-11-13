---
id: WPGL/seeds
title: Сиды Minecraft - Seed finder, калькулятор сида, cart-seed
type: feature
product: WPGL
status: draft
updated: 2026-11-13
verified_on: 2026-11-13        # DEV-670: каталог finder отдельным JSON
tickets: [DEV-670]
flags: []
tests:
  - tests/modded/seed-list.finder.spec.ts
  - tests/modded/slider.seed.spec.ts
  - tests/funnels/funnel.seed.spec.ts
  - tests/general/smoke.pages.spec.ts
sources:
  - шапки tests/modded/seed-list.finder.spec.ts, slider.seed.spec.ts, tests/funnels/funnel.seed.spec.ts
  - kb/products/wpgl/README.md (гочи 3, 5, 6; Что устарело 1-2)
  - memory: seed-modded-calculators, inc6-calc-widget-migration, prod-regressions-22jul
---

# Сиды Minecraft - Seed finder, калькулятор сида, cart-seed

> **В двух словах.** Раздел сидов: `/minecraft-seeds/` - каталог сидов с фильтрами (Seed finder), а у каждого
> сида своя страница с калькулятором тарифа. С неё кнопка **Host Now** или **BUY-A-SERVER** ведёт в корзину
> `/cart-seed` с уже выбранными сидом и модпаком. Это **три разных калькулятора** в истории проекта - их легко спутать.

## Где в интерфейсе

| Где | Что | Куда ведёт |
|---|---|---|
| `/minecraft-seeds/` | Seed finder: карточки сидов, фильтр по mc-версии, редакция Java / Bedrock, теги, Show more / less, Copy seed, Open seed | на страницу сида (корзины нет с 02-Oct) |
| Страница сида, напр. `/minecraft-seeds/sky-haven-island-atm-10-seed/` | калькулятор: слайдер тарифа, Host Now, BUY-A-SERVER (`#cartDefaultBtn`), Open in Seed Map | `/cart-seed` |
| `/cart-seed` | классическая Vue-cart | step 2 → чекаут WHMCS |

## Как работает (под капотом)

- Калькулятор сида с 06-Aug-2026 - Inc 6-виджет в открытом Shadow DOM: нативный `input[type=range]`, дискретный 0..N,
  мета в `data-config` (JSON, в т.ч. `promocode` и `discount`).
- Позиция слайдера определяет `productId` в URL `/cart-seed`; BUY-A-SERVER - фиксированный тариф (Quadra).
- Seed finder (с DEV-670, 13-Nov-2026): в HTML только первый экран (`initial`, 3 карточки) и `catalogUrl`; полный каталог - `GET /wp-json/godlike/v1/seed-finder?v=…` (`public, max-age=43200`), данные в transient на 12 ч со сбросом при изменении сидов. Корень `data-sc-catalog="loading|ready|error"`. Счётчик по mc-версии = сиды этой версии в каталоге (модпак-сиды не считаются; модпак-версия матчится по `modpackId`).

## Правила и граничные случаи

1. Калькулятор на `/minecraft-seeds/` **удалён 02-Oct-2026** - на его месте Seed finder без корзины.
2. Пустая выдача фильтра = empty-state, и наоборот.
3. В sitemap 1129 страниц сидов (15-Oct).

## Гочи для тестирования

- **Ленивая инициализация:** калькулятор оживает только после реального движения мыши (`page.mouse.move()` ×2).
- **Host Now сида в headless** уводит на `/cart-seed` только в 1-2 случаях из 5 (с 06-Aug) - наблюдаем, не карантиним.
- **BUY = `#cartDefaultBtn`,** не `.first()` по классу: прод добавил «Open in Seed Map» с тем же классом (22-Jul).
- Слайдер без `role=slider`.
- **Seed finder:** до `ready` работает только первый экран; самый первый клик без движения мыши WP Rocket может повторить ([DEV-670](../../tickets/DEV-670.md) F1).
- Названия в карточках finder с `&#038;` - баг [DEV-724](https://antihost.atlassian.net/browse/DEV-724), не ассертить на точный текст названия.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Сид-страница грузится, калькулятор монтируется | `smoke.pages.spec.ts` | ✅ |
| Seed finder: карточки, счётчик по версии, Java / Bedrock, теги, Show more, Copy, Open | `seed-list.finder.spec.ts` | ✅ |
| Контракт каталога: HTML без полного каталога, JSON 200 + кэш, `initial.total` (DEV-670) | `seed-list.finder.spec.ts` | ✅ |
| Слайдер сида: диапазон, шаг, скрытый `#fieldPlayersCount` | `slider.seed.spec.ts` | ✅ |
| Host Now и BUY-A-SERVER → `/cart-seed` с seed + modpack | `slider.seed.spec.ts` | ✅ |
| `data-config` несёт promocode и discount | `slider.seed.spec.ts` | ✅ |
| Host Now → `/cart-seed` → step 2 → чекаут WHMCS | `funnel.seed.spec.ts` | ✅ |
| Seed Map, Circle Generator, Skin Editor | не покрыто | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| 18-Jun-2026 | - | Seed-тесты разведены на 2 корзины + happy-path |
| 22-Jul-2026 | - | Дубль класса кнопки, BUY = `#cartDefaultBtn` |
| 06-Aug-2026 | - | Калькулятор сида на Inc 6-виджете, Host Now флакает в headless |
| 02-Oct-2026 | - | Калькулятор на `/minecraft-seeds/` заменён Seed finder |
| 13-Nov-2026 | [DEV-670](../../tickets/DEV-670.md) | Кэш данных finder + каталог отдельным JSON: TTFB 8 с → 0,6 с |
