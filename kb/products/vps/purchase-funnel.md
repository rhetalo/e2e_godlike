---
id: VPS/purchase-funnel
title: Воронка покупки VPS - лендинг, cart-vps, checkout WHMCS
type: feature
product: VPS
status: draft
updated: 2026-10-18
verified_on: 2026-08-06        # перестановка OS-плиток (шапка configure); редизайн лендинга - recon 17-Jul
tickets: []
flags: []
tests:
  - tests/vps/funnel/vps.funnel.happy-path.spec.ts
  - tests/vps/funnel/vps.funnel.billing.spec.ts
  - tests/vps/funnel/vps.funnel.configure.spec.ts
sources:
  - шапки tests/vps/funnel/vps.funnel.*.spec.ts
  - memory: vps-funnel-restructure (live-recon 17-Jul-2026), funnel-serial-and-doc-drift
  - kb/products/vps/README.md (Правила, п.5)
---

# Воронка покупки VPS - лендинг, cart-vps, checkout WHMCS

> **В двух словах.** Так клиент покупает VPS: выбирает тариф на лендинге `/vps-hosting/`, жмёт **Deploy Now**,
> в корзине `/cart-vps/` выбирает период оплаты, локацию и ОС и попадает на оплату в WHMCS. Это «Install» из ТЗ
> Install / Build / Delete. Живёт на витрине и в биллинге, а не в панели VirtFusion; тесты доходят до формы
> оплаты и **кнопку оплаты не жмут**.

## Где в интерфейсе

1. `/vps-hosting/` - тарифы, разбитые тогглами **Performance** (Standard / Highest) × **Service** (Unmanaged / Managed),
   кнопка **Deploy Now** у карточки.
2. `/cart-vps/` шаг **Billing Cycle** - периоды оплаты с ценами и итогом.
3. Шаг **Configure Your Server** (`step=3`) - локация (USA / Europe) и ОС с версией; выбор отражается в order summary.
4. Checkout WHMCS - форма оплаты.

## Правила и граничные случаи

1. **Тогглы прячут неактивные планы** (`display:none`): в DOM ~25 кнопок Deploy, видна только активная группа.
2. **У части тарифов нет периода 1 месяц:** первый план (Nitro 1, productId 1005) стартует с `billingCycle=quarterly`,
   периоды только 3 / 6 / 12 (17-Jul-2026).
3. **Скидка VPS20 предприменена из URL** - видна в самих ценах; отдельные бейджи скидки по периодам убраны.
4. **ОС по умолчанию - Ubuntu** (с 06-Aug-2026, раньше Games); у Ubuntu есть дропдаун версий, у WordPress - нет.
5. Итоговая стоимость растёт с 3 до 12 месяцев.

## Гочи для тестирования

- **Брать только видимые карточки и кнопки** (`:visible` в `VpsPage`), иначе `.first()` ловит скрытый план.
- **Flash-sale модалка** («$1/GB Insane Sale») перехватывает клики даже при пиннинге Amplitude - гасится `CookieBanner.dismissAll()` в `VpsPage.goto`.
- **Serial + общая сессия:** логин и проход Deploy → Billing → Configure один раз в `beforeAll`; порядок тестов configure
  важен (дефолт ОС проверяется до смены).
- **Язык чекаута** зависит от языка биллинга - сверять первым при странных текстах.
- Периоды и наборы тарифов - живое состояние прода, при падениях сверять recon'ом.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Deploy Now → Billing → Configure (ОС + локация) → checkout WHMCS | `vps.funnel.happy-path.spec.ts` | ✅ |
| Billing: 3 периода, цены ненулевые и уникальны, выбор в summary, рост итога | `vps.funnel.billing.spec.ts` | ✅ |
| Configure: локации USA / Europe, смена в summary | `vps.funnel.configure.spec.ts` | ✅ |
| Configure: ОС по умолчанию, версии Ubuntu, Rocky Linux, WordPress без версий | `vps.funnel.configure.spec.ts` | ✅ |
| Оплата и выдача сервера | вне скоупа - кнопку оплаты не жмём | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| 18-Jun-2026 | - | Воронки переведены на serial + shared session |
| 17-Jul-2026 | - | Редизайн лендинга и cart-vps: тогглы, нет 1 месяца у первых тарифов, бейджи скидок убраны |
| 06-Aug-2026 | - | ОС по умолчанию стала Ubuntu |
