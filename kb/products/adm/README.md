---
id: ADM
title: ADM - админка панели (panel.godlike.host/admin)
type: product-overview
product: ADM
status: draft
updated: 2026-10-27
verified_on: 2026-10-12        # DEV-513 (смена образа из админки)
tickets: [DEV-477, DEV-513, DEV-532, DEV-486, DEV-579, DEV-418, DEV-583]
flags: [GODLIKE_NODE_RESOURCE_LIMITS_ENABLED, is-listed, world-backup]
tests: []                      # автотестов нет и не будет без ок владельца
sources:
  - kb/tickets/DEV-477.md, DEV-486.md, DEV-513.md, DEV-532.md, DEV-418.md, DEV-579.md, DEV-583.md
  - kb/_meta/id-scheme.md (таблица продуктов)
  - memory: feedback-legacy-admin-ask-first, stage-admin-account-scope
---

# ADM - админка панели (panel.godlike.host/admin)

> **В двух словах.** Админка Pterodactyl с нашими доработками: серверы, ноды, яйца (типы серверов), каталог
> модпаков, фичефлаги. Вход только у админов с выданной ролью, через корпоративную почту. Это рабочий
> инструмент поддержки и разработки на живом проде, поэтому **в ней ничего не делаем без явного ок
> владельца** на конкретное действие.

## Что известно

| Раздел | Что | Страница / источник |
|---|---|---|
| Сервер → Startup | `/admin/servers/view/{id}/startup`: `custom_docker_image` (свой образ Java), смена egg (`#pEggId`, `skip_scripts`) | [ADM/server-startup](server-startup.md) |
| Сервер → Build | Memory сервера в обход биллинга, лимит World Backup 0/N | [ADM/server-startup](server-startup.md#как-работает-под-капотом) |
| Сервер → Transfer | `/admin/servers/view/{id}/manage-transfer`: модалка переноса, локация сервера первой, ноды по реальной нагрузке (Load/CPU/Mem/Disk/Name). Только просмотр | [ADM/server-transfer](server-transfer.md) |
| Каталог модпаков v2 | `/admin/modpacks-v2/view/{id}`: чекбокс «Client catalog» (`is_listed`), колонка Listed / Hidden, `PATCH .../listing`; пулы `/pools/new` | [ADM/modpack-catalog](modpack-catalog.md) |
| Ноды | лимиты disk / RAM: режимы Unlimited / Percentage / Fixed вместо overallocation (env [flag:GODLIKE_NODE_RESOURCE_LIMITS_ENABLED](../../registry/flags.md#godlike_node_resource_limits_enabled)). Отдельной страницы нет: QA не участвовал, фактов мало | [DEV-477](../../tickets/DEV-477.md) |
| Фичефлаги | тумблеры Laravel Pennant, после включения нужен `php artisan pennant:purge <flag>` (DevOps) | [реестр флагов](../../registry/flags.md), [DEV-418](../../tickets/DEV-418.md) |

## Правила

1. **Ничего без явного ок владельца** - ни просмотра чужих серверов «на всякий случай», ни правок.
2. **Админ-аккаунт видит чужие серверы** (на stage ~16930) - трогать только серверы из [реестра](../../registry/test-servers.md) ([acc:admin](../../registry/test-accounts.md#admin)).
3. **Не-админ:** страница админки → 403; без сессии GET 403, PATCH 419 (CSRF) ([DEV-532](../../tickets/DEV-532.md)).
4. **Гоча UI:** чекбокс `is_listed` кликать через `label[for=modpackIsListed]` ([ADM/modpack-catalog](modpack-catalog.md#гочи-для-тестирования)).

## Пробелы

Полной карты админки нет: пользователи, яйца, локации, ноды, отчёты не описаны. Фичефлаги без назначения - в [реестре флагов](../../registry/flags.md).
