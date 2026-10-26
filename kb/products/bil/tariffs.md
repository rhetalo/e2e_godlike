---
id: BIL/tariffs
title: Тарифы и апгрейд со стороны биллинга - tariffs-new API
type: feature
product: BIL
status: draft
updated: 2026-10-26
verified_on: 2026-10-26        # правило подарка Premium (DEV-595) проверено оплатами на проде
tickets: [TASK-tariff-list-400, DEV-595]
flags: []
tests: []                      # своих спеков нет; структура Upgrade - TC-GP-UPG-001 в UP
sources:
  - kb/tickets/TASK-tariff-list-400.md; kb/products/up/upgrade.md
  - kb/products/bil/README.md (Связь с панелью, Пробелы 3)
---

# Тарифы и апгрейд со стороны биллинга - tariffs-new API

> **В двух словах.** Тарифы серверов живут в WHMCS. Игровая панель берёт из биллинга список тарифов для апгрейда
> (Boost My Server) через API `tariffs-new`, а оплата апгрейда идёт в биллинге. С 09-Oct-2026 этот список падает
> с ошибкой, и купить апгрейд нельзя ([UP/upgrade](../up/upgrade.md)).

## Как работает (под капотом)

- Панель: `GET /api/v2/tariffs-new/{service_id}/list` → бэкенд `TariffListService` берёт продукты из WHMCS.
- Текущий план: `GET /api/v2/billing/{service_id}/current`.
- `service_id` = ID услуги WHMCS = суффикс имени сервера `_NNNNNN`.
- Как устроены тарифы и апгрейд внутри WHMCS (продукты, конфиг-опции, upgrade-пути) - не описано ❓.

### Подарок Premium за длинный цикл (Budget → Premium-пара)

- Пары Budget → Premium лежат в `godlike_budget_premium_pair` (одна строка на Budget-тариф), правятся в админке WHMCS:
  `admin/addonmodules.php?module=godlike_product_features` (Vue-интерфейс аддона).
- Список циклов один на оба места - `BillingCycleEnum::premiumGiftCycles()`: **quarterly, semiannually, annually**.
  Monthly, biennially, triennially подарка не дают ([DEV-595](../../tickets/DEV-595.md), billing!744).
- **Заказ** (`OrderCreationHook`, после чекаута): pid меняется на Premium сразу, подарок пишется в
  `godlike_product_premium_auto_buys` со сроком (1 месяц) и потом откатывается.
- **Заказ VIP-клиента** (`OrderCreationVipHook`): Premium на **любом** цикле, запись в `godlike_product_premium_vip_buys`.
- **Апгрейд через панель** (`UpgradeProductAction`, по оплате счёта): если выбран Budget с циклом из списка, в WHMCS уходит
  pid Premium-пары. Подарок бессрочный, отката нет. VIP-группу не проверяет.
- Triennially у игровых тарифов - маркер 3-дневного тарифа, поэтому 2-3 года в список не добавлять.

## Правила и граничные случаи

1. **Баг Critical (09-Oct):** WHMCS отвечает ~19 с, сервис получает `null` → TypeError в `filterProducts` → 400 с внутренним
   путём в ответе. Воспроизводится на всех открытых серверах; `billing/.../current` при этом 200
   ([TASK-tariff-list-400](../../tickets/TASK-tariff-list-400.md)). Jira-ключ и статус фикса ❓.

## Гочи для тестирования

- Бесконечный спиннер на Upgrade - сначала проверить ответ `tariffs-new/.../list`: это известный баг, не флак.
- Апгрейд не выбирать и до оплаты не доходить (кроме проверок с явным ок владельца на сумму).
- Подарок при **заказе** проверять только на не-VIP клиенте: у VIP Premium приходит на любом цикле
  ([acc:admin](../../registry/test-accounts.md#admin)).
- Апгрейд с annually на более короткий цикл панель не даёт (в селекте только 12 Months) - monthly проверять на monthly-сервере.
- Результат смотреть в billing DB: `tblhosting.packageid` + запись в `premium_auto_buys` / `vip_buys`.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Upgrade: карточки планов и цены (со стороны панели) | `promo.spec.ts` (TC-GP-UPG-001) | ✅ структурно |
| Ответ `tariffs-new/.../list` (контракт, код 200) | не покрыто | ❌ |
| Оплата апгрейда в биллинге | вне скоупа | ❌ |
| Список циклов подарка Premium | unit-тесты в billing!744 (`BillingCycleEnumTest`, `UpgradeProductActionCycleTest`) | ✅ вне репо |

## История

| Дата | Тикет | Что |
|---|---|---|
| 09-Oct-2026 | [TASK-tariff-list-400](../../tickets/TASK-tariff-list-400.md) | Список тарифов для апгрейда падает с 400 |
| 26-Oct-2026 | [DEV-595](../../tickets/DEV-595.md) | Один список циклов подарка Premium для заказа и апгрейда; PASS на проде |
