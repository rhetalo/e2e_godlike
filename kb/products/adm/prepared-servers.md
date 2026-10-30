---
id: ADM/prepared-servers
title: Пул подготовленных серверов (Pool Policies)
type: feature
product: ADM
status: verified
updated: 2026-10-30
verified_on: 2026-10-30
tickets: [DEV-462]
flags: []
tests: []
sources:
  - test-docs/ultra.panel/DEV-462/DEV-462-results.md
  - panel MR !1567, !1583, !1608, !1703, !1714 (описания)
---

# Пул подготовленных серверов (Pool Policies)

> **В двух словах.** Админка держит запас заранее собранных серверов с модпаком. Покупатель того же модпака, тарифа
> и локации получает готовый сервер за секунду вместо установки. Политика задаёт модпак, версию, локацию, egg, тариф
> и сколько серверов держать. Описано по состоянию прода на 30-Oct-2026.

## Где в интерфейсе
- `panel.godlike.host/admin/prepared-servers` - глобальные переключатели и список строк пула (вкладки All / Being created / Ready / Claimed / Failed).
- `.../prepared-servers/pools` - политики: Edit, Fill now, Reinstall modpack, Rebuild, Delete. Новая - `.../pools/new`.
- `.../prepared-servers/view/{id}` - карточка строки: статус, модпак, ресурсы, сервер, кто выдал, причина падения, Retry from scratch.

## Как работает (под капотом)
- Таблицы: `prepared_server_pools` (политики), `prepared_servers` (строки пула), настройки `settings::godlike:prepared_servers:pool_enabled` (Build and top up) и `...:auto_claim_enabled` (Hand pooled servers to matching purchases).
- Часовой тик `godlike:prepared-servers:reconcile` в :00 UTC: освобождает серверы failed-строк, лечит дрейф, пополняет пул до target. Создание политики сборку не запускает, только тик или Fill now.
- Готовые серверы до выдачи числятся на общем тест-юзере 388101 (WHMCS 494912). При выдаче владелец меняется на покупателя.
- Выдача сверяет тариф (memory / swap / disk / cpu), egg, локацию и provider / modpack / version строки с заказом.
- Тарифы: Ultra 6 ГБ = WHMCS pid 345 (6144 / 1536 / 30720 / 300), Quadra 4 ГБ = pid 343. Локация витрины EU East = панельная 11 (ua-paid.Dnipro).

## Статусы и переходы
| Из | Действие | В |
|---|---|---|
| - | тик / Fill now | `creating` → `verifying` / `installing_modpack` → `ready` |
| `ready` | покупка совпала | `claimed` (сервер у покупателя, строка в истории) |
| `ready` | Reinstall modpack | `installing_modpack` → `ready` (не продаётся во время установки) |
| `ready` | Rebuild / Delete политики | строка удалена, сервер `servers.deleted_at` |
| любая сборка | ошибка | `failed` + `failure_stage` / `failure_reason`; сервер освобождается на тике через 15-75 мин, запись живёт 7 дней |

## Правила и граничные случаи
- Выключенная политика ничего не строит, но её готовые серверы продаются. Fill now на ней отвечает «switched off, so nothing was started».
- Смена модпака без Reinstall: строка остаётся со старым модпаком и продаётся только под старый модпак.
- Политика уникальна по модпаку + локации + тарифу (версия не входит): дубль не создаётся.
- Delete политики уничтожает её готовые серверы, выданные не трогает, failed-строки оставляет до ретенции.
- Ошибки установки egg не считаются в crash breaker (!1703): политика с неверным egg строит по 1 мёртвому серверу в час.

## Гочи для тестирования
- Время в БД и админке UTC.
- Покупка с аккаунта 494912 не доказывает выдачу: пул и так на нём. Нужен отдельный аккаунт.
- Скидка 30% в корзине только на первый заказ аккаунта.
- Перед мутирующими проверками учитывать тик в :00: он сам переустановит дрейф и пересоберёт tier-drift.

## Покрытие
Автотестов нет (мутации на проде + оплата). Ручной прогон: [DEV-462](../../tickets/DEV-462.md).

## История
- DEV-429 (авг-сен 2026) - пул и автоматизация, MR !1540 и далее.
- [DEV-462](../../tickets/DEV-462.md) (30-Oct-2026) - выдача из выключенной политики, Rebuild, Reinstall, reclaim failed; prod PASS.
