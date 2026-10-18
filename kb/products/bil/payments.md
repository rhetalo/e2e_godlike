---
id: BIL/payments
title: Оплата - Stripe, PayPal, Crypto, кредитный баланс, валюта
type: feature
product: BIL
status: draft
updated: 2026-10-18
verified_on: 2026-06-17        # QA_TEST_COVERAGE §1.7; валюта и итог - DEV-458 28-Sep
tickets: [DEV-458]
flags: []
tests: [tests/funnels/funnel.cart.paypal.spec.ts, tests/funnels/funnel.with.credit.check.spec.ts]
sources:
  - kb/products/bil/README.md (Оплата, гоча 2, 5)
  - agents.docs/QA_TEST_COVERAGE_AND_SPECS.md §1.7 (17-Jun-2026)
  - шапки tests/funnels/funnel.cart.paypal.spec.ts, funnel.with.credit.check.spec.ts
  - kb/tickets/DEV-458.md (F-TOTAL, F-SUMMARY); memory: promo-action-monthly75, test-quality-plan
---

# Оплата - Stripe, PayPal, Crypto, кредитный баланс, валюта

> **В двух словах.** На [чекауте](checkout.md) клиент платит картой (Stripe), через PayPal, криптой (CoinPayments)
> или кредитным балансом аккаунта. Если применить кредит, шлюзы скрываются - платить больше нечем и не нужно.
> Валюта привязана к аккаунту, поэтому один и тот же заказ на разных аккаунтах стоит по-разному.

## Где в интерфейсе

- Чекаут → список шлюзов: **Stripe** (iframe), **PayPal**, **Crypto (CoinPayments)** - взаимоисключающие radio, не меньше 2 шлюзов.
- Блок **кредитного баланса**: apply / skip.

## Как работает (под капотом)

- Валюта аккаунта: `currency=1` USD, `6` EUR; зависит от IP при регистрации, на маршрут воронки не влияет.
- На тест-аккаунте покупки и апгрейды оплачиваются кредитным балансом.

## Правила и граничные случаи

1. **Apply кредита скрывает шлюзы, skip - показывает.**
2. **Итог на чекауте может не совпадать с витриной** (€35.98 на витрине vs $44.98 на чекауте) - специфика аккаунта:
   валюта, промо, овердью ([DEV-458/F-TOTAL](../../tickets/DEV-458.md#находки)). На чистом аккаунте суммы сходятся.
3. На чекауте add-on Custom Modpack Setup одна строка Total без разбивки - ограничение `ordersummary.tpl`
   ([DEV-458/F-SUMMARY](../../tickets/DEV-458.md#находки)).

## Гочи для тестирования

- **Оплату на проде не подтверждаем.** Единственное исключение - `funnel.with.credit.check`: реальный заказ с кредитного
  баланса, санкционирован владельцем; его сырые локаторы заморожены линт-храповиком (D-021).
- **PayPal popup** в headless с датацентрового IP недетерминирован - тест только локально (`RUN_LOCAL_ONLY=1`).
- Суммы сверять на чистом аккаунте - валюта и промо зависят от аккаунта.
- Stripe iframe: поведение и селекторы не описаны ❓.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Stripe и PayPal на чекауте | `funnel.cart.paypal.spec.ts` | ✅ |
| Crypto (CoinPayments) доступен, методы переключаются | `funnel.cart.paypal.spec.ts` | ✅ |
| Кредитный баланс: apply скрывает шлюзы, skip показывает | `funnel.cart.paypal.spec.ts` | ✅ |
| PayPal popup → paypal.com | `funnel.cart.paypal.spec.ts` (только локально) | ✅ руками |
| Заказ с кредитного баланса до конца | `funnel.with.credit.check.spec.ts` | ✅ |
| Реальная оплата картой, PayPal, криптой | вне скоупа | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| 17-Jun-2026 | - | Покрытие шлюзов и кредита зафиксировано (QA_TEST_COVERAGE §1.7) |
| 28-Sep-2026 | [DEV-458](../../tickets/DEV-458.md) | Разница итога витрины и чекаута - специфика аккаунта, не баг |
