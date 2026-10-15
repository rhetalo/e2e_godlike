---
id: UP/throttling
title: Throttling - окно «Lag Detected» при нехватке CPU
type: feature
product: UP
status: draft
updated: 2026-10-15
verified_on: 2026-06-15
tickets: [TASK-throttling-webhook]
flags: [RUN_THROTTLING_TEST]
tests: [tests/game/panel/throttling.notification.spec.ts]
sources:
  - kb/tickets/TASK-throttling-webhook.md
  - memory: throttling-webhook-feature
---

# Throttling - окно «Lag Detected» при нехватке CPU

> **В двух словах.** Когда Minecraft-серверу не хватает CPU, мониторинг присылает в панель вебхук, и клиент
> видит окно «Lag Detected» с предложением перейти на тариф мощнее. Окно показывается не чаще раза в
> 3 дня на сервер. Точное условие показа не выяснено, поэтому автотест запускается только по флагу.

## Где в интерфейсе

- Окно `.upgrade-dialog` на странице сервера: заголовок «Lag…Detected», кнопки **Keep current plan** и **Upgrade for $X**
  (ведёт в оплату, [UP/upgrade](upgrade.md)).

## Как работает (под капотом)

- `POST https://panel.godlike.host/api/v2/webhook/throttling` **без авторизации**, тело в формате Alertmanager.
- Сервер определяется по `alerts[].labels.name` = UUID сервера. Несуществующий UUID → 422.
- Ответ всегда `{success:true}`, даже если окно не покажется.
- Только Minecraft-серверы. Анти-спам примерно раз в 3 дня на сервер.

Источник: [TASK-throttling-webhook](../../tickets/TASK-throttling-webhook.md).

## Правила и граничные случаи

1. **Условие показа окна не выяснено** - вебхук принят, а окна может не быть.
2. **Безопасность ❓:** вебхук без авторизации позволяет вызвать окно на чужом сервере, если знать UUID.

## Не баг - так задумано

| Кажется багом | На самом деле |
|---|---|
| Вебхук ответил `success:true`, окна нет | сработал анти-спам (раз в 3 дня) или условие показа не выполнено |

## Гочи для тестирования

- Тест включается переменной `RUN_THROTTLING_TEST`, сервер берётся из `GAME_PANEL_THROTTLE_SERVER_UUID`.
- После одного показа на этом сервере 3 дня окна не будет - планировать прогоны с учётом лимита.
- **Upgrade for $X** не жать (оплата).

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Вебхук → окно «Lag Detected» | `throttling.notification.spec.ts` (THR-001), под env-флагом | ⚠️ нестабилен, пока условие не выяснено |

## История

| Дата | Тикет | Что |
|---|---|---|
| 15-Jun-2026 | [TASK-throttling-webhook](../../tickets/TASK-throttling-webhook.md) | Костяк теста и хелпер вебхука, условие показа исследует владелец |
