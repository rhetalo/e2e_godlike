---
id: WPGL/game-funnel
title: Воронка игрового сервера - корзина, вход, Configure, чекаут WHMCS
type: feature
product: WPGL
status: draft
updated: 2026-10-18
verified_on: 2026-08-20        # новая Vue-воронка (DEV-402), тесты переписаны тимлидом
tickets: [DEV-402]
flags: []
tests:
  - tests/funnels/funnel.spec.ts
  - tests/funnels/funnel.cart.paypal.spec.ts
  - tests/funnels/funnel.with.credit.check.spec.ts
  - tests/general/login.validation.spec.ts
  - tests/general/registration-flow.spec.ts
sources:
  - шапки tests/funnels/funnel.spec.ts, funnel.cart.paypal.spec.ts, funnel.with.credit.check.spec.ts,
    tests/general/login.validation.spec.ts, registration-flow.spec.ts
  - kb/tickets/DEV-402.md; kb/products/bil/README.md
  - memory: whmcs-checkout-language, funnel-configure-bounce, funnel-serial-and-doc-drift, test-quality-plan
---

# Воронка игрового сервера - корзина, вход, Configure, чекаут WHMCS

> **В двух словах.** Основной путь покупки: с витрины игра и тариф попадают в Vue-корзину, клиент входит или
> регистрируется прямо в корзине (auth-block), выбирает период (step 2), локацию и тип (Configure, step 3) и
> оказывается на чекауте WHMCS («Review & Checkout») с выбором оплаты. Тесты останавливаются на чекауте;
> единственное исключение - санкционированный заказ с кредитного баланса.

## Где в интерфейсе

1. Витрина → **Add to Cart** / карточка игры → `/cart-game-servers/?productId=` (новая Vue-воронка, [DEV-402](../../tickets/DEV-402.md)).
2. **Auth-block** в корзине: вход или регистрация (`.auth-block` / `.auth-page`).
3. **Step 2** - период оплаты; **Configure your server** (step 3) - локация и тип сервера.
4. **WHMCS** `cart.php?a=checkout` - «Review & Checkout», способы оплаты: Stripe, PayPal, Crypto (CoinPayments), кредитный баланс.

## Правила и граничные случаи

1. **Кредитный баланс:** apply скрывает платёжные шлюзы, skip - показывает.
2. **Валидация auth-block:** пустая отправка или неверные данные не переводят корзину на step 2.
   Это проверка формы корзины, не страницы `/clientarea/login` (её на корзине нет - 404).
3. **Старая ссылка воронки** редиректит на главную.
4. **Язык чекаута** задаётся биллингом, не витриной ([BIL](../bil/README.md#язык-чекаута)).

## Гочи для тестирования

- **Все воронки разом падают на «Review & Checkout»** - первым делом язык биллинга аккаунта.
- **Мигающий auth-block** при валидной сессии - ждать URL `step=2` (12 с), логиниться, только если блок держится.
- **Configure «созревает» не сразу** - идти до оплаты через `CartPage.advanceToPayment()` (ждёт `/clientarea/`, бюджет 90 с), не считать клики.
- **Оплату не жать.** Исключение - `funnel.with.credit.check`: реально оформляет заказ с кредитного баланса,
  санкционирован владельцем; сырые локаторы там заморожены линт-храповиком (D-021).
- **`registration-flow` создаёт реального пользователя** на проде (креды ротируются, 30 записей).
- PayPal popup в headless с датацентрового IP недетерминирован - тест только локально (`RUN_LOCAL_ONLY=1`).

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Базовая воронка до чекаута WHMCS | `funnel.spec.ts` | ✅ |
| Старая ссылка воронки → главная | `funnel.spec.ts` | ✅ |
| Оплата: Stripe и PayPal видны, Crypto переключается | `funnel.cart.paypal.spec.ts` | ✅ |
| Кредитный баланс: apply / skip | `funnel.cart.paypal.spec.ts` | ✅ |
| PayPal popup → paypal.com | `funnel.cart.paypal.spec.ts` (только локально) | ✅ руками |
| Заказ с кредитного баланса до конца | `funnel.with.credit.check.spec.ts` | ✅ |
| Валидация auth-block: пусто / неверно | `login.validation.spec.ts` | ✅ |
| Регистрация при оформлении тарифа | `registration-flow.spec.ts` | ✅ |
| Реальная оплата картой / PayPal | вне скоупа | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| 08-Jul-2026 | - | Все воронки упали из-за языка биллинга - не баг тестов |
| 20-Jul-2026 | - | Найден отскок Configure step 3 → 2, `advanceToPayment` ждёт `/clientarea/` |
| 20-Aug-2026 | [DEV-402](../../tickets/DEV-402.md) | Новая Vue-воронка, ~90 тестов переписаны |
