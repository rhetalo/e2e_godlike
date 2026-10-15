---
id: UP/split-server
title: Split Server - деление сервера на основной и саб-серверы
type: feature
product: UP
status: draft
updated: 2026-10-15
verified_on: 2026-09-10
tickets: [TASK-split-server]
flags: []
tests: []                      # автотестов нет
sources:
  - kb/tickets/TASK-split-server.md
  - test-docs/ultra.panel/split-server-REPORT.md
  - memory: split-server-qa
---

# Split Server - деление сервера на основной и саб-серверы

> **В двух словах.** Клиент может разделить свой оплаченный сервер на основной и до 3 саб-серверов и сам
> перераспределять между ними RAM и диск. Например, держать на одном тарифе лобби и мини-игру. Раньше
> это было только в старой панели, с сентября 2026 есть в ultra.panel. QA 10-Sep-2026: 13/13 PASS.

## Где в интерфейсе

- Вкладка **Split** в сервере (видна Owner и участникам с правом `split_access`).
- Создание саба (с модалкой-гвардом подтверждения), правка RAM / диска, удаление, кнопка **Sync Subuser Permissions**.
- **Дашборд** группирует семью серверов `[MainN]` / `[SubN_M]`, свёрнутая группа показывает бейдж `+N`.

## Как работает (под капотом)

| Действие | API (`panel.godlike.host/api/v2/servers/{uuid}/...`) |
|---|---|
| Список / создание саба | `GET` / `POST split` |
| Ресурсы саба | `PATCH split/{subUuid}/resources {memory, disk}` |
| Удаление саба | `DELETE split/{subUuid}` |
| Синк прав участников | `sync_permissions: true` |

Источник: [TASK-split-server](../../tickets/TASK-split-server.md).

## Лимиты

| Что | Граница |
|---|---|
| Саб-серверов | максимум 3 |
| RAM на саб | минимум 100 МБ |
| Диск на саб | минимум 100 МБ |

## Правила и граничные случаи

1. **Правка ресурсов перезапускает работающий сервер.** Остановленный остаётся offline.
2. **Права участников на сабы не синхронизируются сами** - только кнопкой Sync.
3. **Member без `split_access`** не видит вкладку.
4. Что происходит с сабами при отмене или апгрейде основного тарифа - ❓ не описано.

## Не баг - так задумано

| Кажется багом | На самом деле |
|---|---|
| Участник основного сервера не получил доступ к новому сабу | синк прав вручную ([TASK-split-server/BUG-3](../../tickets/TASK-split-server.md#находки), by design) |
| Сервер перезапустился после смены RAM | так задумано для работающего сервера |

## Гочи для тестирования

- Создание и удаление саба - мутация реальной услуги клиента. Тестовая семья: main [srv:1d7d34aa](../../registry/test-servers.md#1d7d34aa),
  сабы [srv:0c7b82c3](../../registry/test-servers.md#0c7b82c3), [srv:60fdf307](../../registry/test-servers.md#60fdf307)
  ([acc:admin](../../registry/test-accounts.md#admin)).
- Перед правкой ресурсов учитывать рестарт работающего сервера.

## Покрытие

- **Автотестов нет.** Ручной QA 13/13: [split-server-REPORT.md](../../../test-docs/ultra.panel/split-server-REPORT.md).

## История

| Дата | Тикет | Что |
|---|---|---|
| 10-Sep-2026 | [TASK-split-server](../../tickets/TASK-split-server.md) | Перенос Split в ultra.panel; BUG-1 (гвард не закрывался), BUG-2 (имя не сбрасывалось) исправлены |
