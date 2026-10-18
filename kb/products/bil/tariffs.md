---
id: BIL/tariffs
title: Тарифы и апгрейд со стороны биллинга - tariffs-new API
type: feature
product: BIL
status: draft
updated: 2026-10-18
verified_on: 2026-10-09        # баг tariffs-new найден 09-Oct
tickets: [TASK-tariff-list-400]
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

## Правила и граничные случаи

1. **Баг Critical (09-Oct):** WHMCS отвечает ~19 с, сервис получает `null` → TypeError в `filterProducts` → 400 с внутренним
   путём в ответе. Воспроизводится на всех открытых серверах; `billing/.../current` при этом 200
   ([TASK-tariff-list-400](../../tickets/TASK-tariff-list-400.md)). Jira-ключ и статус фикса ❓.

## Гочи для тестирования

- Бесконечный спиннер на Upgrade - сначала проверить ответ `tariffs-new/.../list`: это известный баг, не флак.
- Апгрейд не выбирать и до оплаты не доходить.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Upgrade: карточки планов и цены (со стороны панели) | `promo.spec.ts` (TC-GP-UPG-001) | ✅ структурно |
| Ответ `tariffs-new/.../list` (контракт, код 200) | не покрыто | ❌ |
| Оплата апгрейда в биллинге | вне скоупа | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| 09-Oct-2026 | [TASK-tariff-list-400](../../tickets/TASK-tariff-list-400.md) | Список тарифов для апгрейда падает с 400 |
