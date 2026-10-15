---
id: TASK-throttling-webhook
title: Throttling: алерт троттлинга CPU и модалка «Lag Detected»
type: ticket
product: [UP]
features: [UP/throttling]
status: in-qa
qa_verdict: -
updated: 2026-10-15
verified_on: 2026-06-15
jira: -
sources:
  - memory: throttling-webhook-feature
  - tests/game/panel/throttling.notification.spec.ts
---

# TASK-throttling-webhook - Throttling: алерт троттлинга CPU и модалка «Lag Detected»

> **В двух словах.** Когда MC-серверу не хватает CPU, мониторинг шлёт вебхук, и клиент видит
> в панели окно «Lag Detected» с предложением апгрейда. Срабатывает не чаще раза в 3 дня на
> сервер. Точное условие показа окна не выяснено.

## Как это работает
- `POST https://panel.godlike.host/api/v2/webhook/throttling` **без авторизации**, тело в формате Alertmanager.
- Сервер определяется по `alerts[].labels.name` = UUID сервера. Несуществующий UUID → 422.
- Ответ всегда `{success:true}`, но окно появляется не на каждый вызов.
- Только Minecraft-серверы, анти-спам ~раз в 3 дня на сервер.
- UI: `.upgrade-dialog`, заголовок «Lag…Detected», кнопки Keep current plan / Upgrade for $X (оплата, не жать).

## Покрытие
`throttling.notification.spec.ts` (TC-GP-THR-001), запуск только с `RUN_THROTTLING_TEST`, сервер из `GAME_PANEL_THROTTLE_SERVER_UUID`.

## Связи
- Фичи: [UP/throttling](../products/up/throttling.md)

## Хвосты
- Условие показа модалки исследует владелец. После этого допилить тест.
- ❓ Безопасность: вебхук без auth позволяет кому угодно вызвать модалку на чужом сервере (при известном UUID).
