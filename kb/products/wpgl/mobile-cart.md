---
id: WPGL/mobile-cart
title: Мобильная корзина /mobile-cart
type: feature
product: WPGL
status: draft
updated: 2026-10-18
verified_on: 2026-06-18        # serial + shared session, фикс viewport в контексте
tickets: []
flags: []
tests: [tests/funnels/funnel.mobile.spec.ts]
sources:
  - шапка tests/funnels/funnel.mobile.spec.ts; pages/MobileCartPage.ts
  - agents.docs/AGENT_HANDOFF.md (сессия «Serial-рефактор воронок», 18-Jun-2026)
  - memory: promo-action-monthly75 (мобилка и поле промокода)
---

# Мобильная корзина /mobile-cart

> **В двух словах.** Отдельная корзина для телефонов (`/mobile-cart`, шаблон `cart-mobile.php`): реактивный
> Vue-калькулятор, где клиент находит игру поиском, выбирает тариф и период и видит итог. До выбора игры
> цена $0.00, тариф заблокирован. Тесты не жмут **Order Now**.

## Где в интерфейсе

- `/mobile-cart` на ширине 390×844: поиск игры, выбор тарифа (RAM), период оплаты, поле промокода, итоговая цена, **Order Now**.

## Правила и граничные случаи

1. До выбора игры цена $0.00 и тариф заблокирован.
2. Смена периода и смена тарифа (RAM) меняют итог.
3. Невалидный промокод: скидки нет, цена не меняется.
4. На периоде 1 месяц акция MONTHLY75 занимает поле промокода блоком «Promocode applied» ([WPGL/promo](promo.md)).

## Гочи для тестирования

- **Viewport задавать в `browser.newContext()`** - `test.use({ viewport })` не наследуется контекстом из `beforeAll` (латентный баг, починен 18-Jun).
- Serial по одной залогиненной странице: проверки «свежей страницы» валидны только в первом сценарии.
- Order Now не жать - живой заказ.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Загрузка, выбор игры и тарифа поиском | `funnel.mobile.spec.ts` | ✅ |
| Смена периода меняет цену | `funnel.mobile.spec.ts` | ✅ |
| Смена тарифа (RAM) меняет цену | `funnel.mobile.spec.ts` | ✅ |
| Невалидный промокод - цена не меняется | `funnel.mobile.spec.ts` | ✅ |
| Order Now → дальше по воронке | не покрыто (живой заказ) | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| 16..17-Jun-2026 | - | `MobileCartPage` PO, 4 `waitForTimeout` → web-first |
| 18-Jun-2026 | - | Serial + shared session, viewport в контексте |
