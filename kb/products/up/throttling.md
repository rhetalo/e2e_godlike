---
id: UP/throttling
title: Throttling - окно «Lag Detected» при нехватке CPU
type: feature
product: UP
status: draft
updated: 2026-11-13
verified_on: 2026-11-13
tickets: [TASK-throttling-webhook, DEV-707]
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

- Вебхук пишет `throttlings`, оффер `throttling_upgrades` создаёт очередь (`CreateThrottlingUpgradeJob`) за 1-5 с. Условия: Minecraft (`nest_id = 1`), не Free, нет диалогового оффера за 3 дня, есть следующая ступень плана в той же линейке (Budget → Budget, Premium → Premium). ✅ 13-Nov ([DEV-707](../../tickets/DEV-707.md))
- Окно: `GET /api/v2/throttling/{uuid}` → `data` (оффер) + `products: [текущий, рекомендованный]` + `price` + `new_billing_cycle` (цикл услуги). `data: null` - окна нет (оффер устарел, котировки нет).
- Approve: `POST /api/v2/throttling/{offer_id}` `{"is_approved": true}` → счёт, оплата (кредит), попытка `upgrade_intents` `source = throttling` в цикле услуги. Отказ (план уже сменён) → 400 «This upgrade is not available for this service», оффер снова `null`.
- Цена в окне = прорейт рекомендованного плана в цикле услуги = сумма счёта = котировка страницы апгрейда. Оплату можно откатить Discard ([UP/upgrade](upgrade.md#откат-апгрейда---discard-changes-24-ч)).

Источник: [TASK-throttling-webhook](../../tickets/TASK-throttling-webhook.md), [DEV-707](../../tickets/DEV-707.md).

## Правила и граничные случаи

1. Вебхук принят, а окна нет - кулдаун 3 дня, Free/не-Minecraft, верхний план линейки или оффер ещё не создан очередью (подождать секунды).
2. **Безопасность ❓:** вебхук без авторизации позволяет вызвать окно на чужом сервере, если знать UUID.

## Не баг - так задумано

| Кажется багом | На самом деле |
|---|---|
| Вебхук ответил `success:true`, окна нет | сработал анти-спам (раз в 3 дня) или условие показа не выполнено |

## Гочи для тестирования

- Тест включается переменной `RUN_THROTTLING_TEST`, сервер берётся из `GAME_PANEL_THROTTLE_SERVER_UUID`.
- После одного показа на этом сервере 3 дня окна не будет - планировать прогоны с учётом лимита.
- **Upgrade for $X** - оплата. Для QA только на своём сервере, откат Discard через 30 мин.
- Немесячный цикл без тест-аккаунта: перевести свой месячный сервер на quarterly/semiannually через страницу апгрейда, потом вебхук.
- Карточка окна показывает месячную цену плана «/mon», кнопка - доплату за период. Так задумано.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Вебхук → окно «Lag Detected» | `throttling.notification.spec.ts` (THR-001), под env-флагом | ⚠️ нестабилен, пока условие не выяснено |

## История

| Дата | Тикет | Что |
|---|---|---|
| 15-Jun-2026 | [TASK-throttling-webhook](../../tickets/TASK-throttling-webhook.md) | Костяк теста и хелпер вебхука, условие показа исследует владелец |
| 13-Nov-2026 | [DEV-707](../../tickets/DEV-707.md) | Одна котировка окна и оплаты в цикле услуги (panel!1815), месячным окно вернулось; имя плана и один тост (new-panel!652). PASS |
